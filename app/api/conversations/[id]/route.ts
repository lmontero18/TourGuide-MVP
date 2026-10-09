import { NextRequest, NextResponse, after } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'
import { appUrl, sendOnce } from '@/lib/email/notify'
import { box, esc, layout, p } from '@/lib/email/layout'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('conversations')
    .select('id, org_id, contact_id, status, bot_active, assigned_agent_id, last_message_at, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error) {
    const t = await getTranslations('apiErrors')
    return NextResponse.json({ error: t('conversationNotFound') }, { status: 404 })
  }

  return NextResponse.json(data)
}

const controlSchema = z.object({
  bot_active: z.boolean(),
  // Tomar una conversacion que ya atiende otro agente requiere confirmarlo
  // explicitamente en la UI ("X la esta atendiendo, ¿tomarla?").
  force: z.boolean().optional(),
})

// Ciclo de vida (CODE-162): resolver / reabrir a mano. La reapertura
// automatica cuando el cliente vuelve a escribir vive en el webhook.
const statusSchema = z.object({ status: z.enum(['resolved', 'open']) })

// Asignar a otro miembro del equipo (CODE-187). null = sin asignar: vuelve a
// "esperando agente" para que la tome cualquiera.
const assignSchema = z.object({ assign_to: z.string().uuid().nullable() })

const patchSchema = z.union([controlSchema, statusSchema, assignSchema])

const log = createLogger({ route: 'conversations/[id]' })

// Nombre visible de un miembro: full_name o la parte local del email.
function displayName(u: { full_name: string | null; email: string } | null): string | null {
  if (!u) return null
  return u.full_name?.trim() || u.email.split('@')[0]
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const t = await getTranslations('apiErrors')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: t('unauthorized') }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: t('forbidden') }, { status: 403 })
  }

  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: t('invalidInput') }, { status: 400 })
  }

  if ('assign_to' in parsed.data) {
    return assignConversation({
      supabase,
      t,
      conversationId: id,
      orgId: profile.org_id,
      actor: { id: user.id, role: profile.role },
      target: parsed.data.assign_to,
    })
  }

  if ('status' in parsed.data) {
    // Resolver deja el bot activo y sin agente: si el cliente vuelve a
    // escribir, el webhook la reabre y el bot contesta con todo el contexto.
    const update =
      parsed.data.status === 'resolved'
        ? { status: 'resolved' as const, bot_active: true, assigned_agent_id: null }
        : { status: 'open' as const }
    const { data, error } = await supabase
      .from('conversations')
      .update(update)
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .select('id, status, bot_active, assigned_agent_id')
      .maybeSingle()
    if (error || !data) {
      console.error('Failed to update conversation status:', error)
      return NextResponse.json({ error: t('conversationUpdateFailed') }, { status: error ? 500 : 404 })
    }
    return NextResponse.json({ success: true, conversation: data })
  }

  const { bot_active, force } = parsed.data

  const { data: current } = await supabase
    .from('conversations')
    .select('id, org_id, assigned_agent_id, assigned_agent:users!conversations_assigned_agent_id_fkey(full_name, email)')
    .eq('id', id)
    .single<{
      id: string
      org_id: string
      assigned_agent_id: string | null
      assigned_agent: { full_name: string | null; email: string } | null
    }>()

  if (!current || current.org_id !== profile.org_id) {
    return NextResponse.json({ error: t('conversationNotFound') }, { status: 404 })
  }

  const heldByOther = !!current.assigned_agent_id && current.assigned_agent_id !== user.id

  // Devolver al bot: solo quien la atiende o un admin. Si no, un agente podia
  // devolverle al bot la conversacion que otro estaba atendiendo.
  if (bot_active && heldByOther && profile.role !== 'admin') {
    return NextResponse.json(
      { error: t('notAssigneeReturn'), code: 'not_assignee' },
      { status: 403 }
    )
  }

  // Devolver al bot o tomar control dejan la conversacion abierta: sale de
  // "esperando agente" (pending) si venia de un handoff.
  const update = bot_active
    ? { bot_active: true, assigned_agent_id: null, status: 'open' as const }
    : { bot_active: false, assigned_agent_id: user.id, status: 'open' as const }

  let query = supabase
    .from('conversations')
    .update(update)
    .eq('id', id)
    .eq('org_id', profile.org_id)

  // Tomar control es atomico: sin `force`, solo se asigna si nadie la tiene (o
  // ya es mia). Si otro agente la tomo entre que cargue la pantalla y el
  // click, el update no matchea y se responde 409 con su nombre.
  if (!bot_active && !force) {
    query = query.or(`assigned_agent_id.is.null,assigned_agent_id.eq.${user.id}`)
  }

  const { data, error } = await query
    .select('id, status, bot_active, assigned_agent_id')
    .maybeSingle()

  if (error) {
    console.error('Failed to update conversation:', error)
    return NextResponse.json({ error: t('conversationUpdateFailed') }, { status: 500 })
  }

  if (!data) {
    const { data: holder } = await supabase
      .from('conversations')
      .select('assigned_agent:users!conversations_assigned_agent_id_fkey(full_name, email)')
      .eq('id', id)
      .single<{ assigned_agent: { full_name: string | null; email: string } | null }>()
    return NextResponse.json(
      { error: t('takenByOther'), code: 'taken', holder: displayName(holder?.assigned_agent ?? null) },
      { status: 409 }
    )
  }

  return NextResponse.json({ success: true, conversation: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const t = await getTranslations('apiErrors')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: t('unauthorized') }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: t('forbidden') }, { status: 403 })
  }

  if (profile.role !== 'admin') {
    return NextResponse.json({ error: t('deleteAdminOnly') }, { status: 403 })
  }

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, org_id')
    .eq('id', id)
    .single()

  if (!conv || conv.org_id !== profile.org_id) {
    return NextResponse.json({ error: t('conversationNotFound') }, { status: 404 })
  }

  // Borrado logico: oculta la conversacion del inbox pero conserva los
  // mensajes. Borrarlos hacia bajar las metricas y el contador del tier
  // gratis de Meta, aunque esos mensajes ya se habian enviado y cobrado.
  const { data: hidden, error } = await supabase
    .from('conversations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('Failed to delete conversation:', error)
    return NextResponse.json({ error: t('conversationDeleteFailed') }, { status: 500 })
  }

  if (!hidden) {
    return NextResponse.json({ error: t('conversationDeleteFailed') }, { status: 403 })
  }

  return NextResponse.json({ success: true })
}

// Admins asignan cualquier conversacion; un agente solo la que tiene o la que
// nadie tiene. El destino tiene que ser de la misma agencia (nunca se confia
// en lo que manda el cliente). El asignado recibe un correo; el aviso en la
// app le llega por realtime (ConversationsProvider).
async function assignConversation({
  supabase,
  t,
  conversationId,
  orgId,
  actor,
  target,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  t: Awaited<ReturnType<typeof getTranslations>>
  conversationId: string
  orgId: string
  actor: { id: string; role: string }
  target: string | null
}) {
  const { data: current } = await supabase
    .from('conversations')
    .select('id, org_id, assigned_agent_id')
    .eq('id', conversationId)
    .single()
  if (!current || current.org_id !== orgId) {
    return NextResponse.json({ error: t('conversationNotFound') }, { status: 404 })
  }

  const heldByOther = !!current.assigned_agent_id && current.assigned_agent_id !== actor.id
  if (actor.role !== 'admin' && heldByOther) {
    return NextResponse.json({ error: t('assignNotAllowed'), code: 'not_assignee' }, { status: 403 })
  }

  let member: { id: string; email: string; full_name: string | null } | null = null
  if (target) {
    const { data } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', target)
      .eq('org_id', orgId)
      .maybeSingle()
    if (!data) return NextResponse.json({ error: t('assignInvalidMember') }, { status: 400 })
    member = data
  }

  const update = target
    ? { assigned_agent_id: target, bot_active: false, status: 'open' as const }
    : { assigned_agent_id: null, bot_active: false, status: 'pending' as const }
  const { data, error } = await supabase
    .from('conversations')
    .update(update)
    .eq('id', conversationId)
    .eq('org_id', orgId)
    .select('id, status, bot_active, assigned_agent_id')
    .maybeSingle()
  if (error || !data) {
    log.error('assign failed', { error, org_id: orgId, conversation_id: conversationId })
    return NextResponse.json({ error: t('conversationUpdateFailed') }, { status: 500 })
  }

  if (member && member.id !== actor.id) {
    const to = member
    after(() => notifyAssignee({ orgId, conversationId, assigneeEmail: to.email, actorId: actor.id }))
  }

  return NextResponse.json({ success: true, conversation: data })
}

async function notifyAssignee({
  orgId,
  conversationId,
  assigneeEmail,
  actorId,
}: {
  orgId: string
  conversationId: string
  assigneeEmail: string
  actorId: string
}) {
  const service = await createServiceClient()
  const [{ data: conv }, { data: actor }, { data: last }] = await Promise.all([
    service.from('conversations').select('contact:contacts(name, phone)').eq('id', conversationId).single(),
    service.from('users').select('full_name, email').eq('id', actorId).single(),
    service
      .from('messages')
      .select('content')
      .eq('conversation_id', conversationId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  const contact = conv?.contact as unknown as { name: string | null; phone: string } | null
  const name = contact?.name || contact?.phone || 'Un cliente'
  const by = actor?.full_name?.trim() || actor?.email?.split('@')[0] || 'Tu equipo'
  const excerpt = last?.content ? (last.content.length > 240 ? `${last.content.slice(0, 240)}…` : last.content) : null
  const html = layout({
    title: 'Te asignaron una conversación',
    body:
      p(`${esc(by)} te asignó la conversación con ${esc(name)}. El bot quedó pausado: respóndele desde el panel.`) +
      (excerpt
        ? box(`${esc(name)}${contact?.phone && contact?.name ? ` · ${esc(contact.phone)}` : ''}`, [`“${esc(excerpt)}”`])
        : ''),
    cta: { label: 'Abrir la conversación', url: `${appUrl()}/conversations/${conversationId}` },
  })
  await sendOnce(
    service,
    {
      orgId,
      kind: 'assigned',
      dedupeKey: `assign:${conversationId}:${assigneeEmail}:${new Date().toISOString().slice(0, 16)}`,
      to: [assigneeEmail],
      subject: `${by} te asignó a ${name}`,
      html,
    },
    log.child({ org_id: orgId })
  )
}
