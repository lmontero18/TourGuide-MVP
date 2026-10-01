import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

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

const patchSchema = z.union([controlSchema, statusSchema])

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
