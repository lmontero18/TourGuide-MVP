import { NextRequest, NextResponse } from 'next/server'
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
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(data)
}

const patchSchema = z.object({
  bot_active: z.boolean(),
  // Tomar una conversacion que ya atiende otro agente requiere confirmarlo
  // explicitamente en la UI ("X la esta atendiendo, ¿tomarla?").
  force: z.boolean().optional(),
})

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
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
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
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const heldByOther = !!current.assigned_agent_id && current.assigned_agent_id !== user.id

  // Devolver al bot: solo quien la atiende o un admin. Si no, un agente podia
  // devolverle al bot la conversacion que otro estaba atendiendo.
  if (bot_active && heldByOther && profile.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only the assigned agent or an admin can return this conversation', code: 'not_assignee' },
      { status: 403 }
    )
  }

  const update = bot_active
    ? { bot_active: true, assigned_agent_id: null }
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
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 })
  }

  if (!data) {
    const { data: holder } = await supabase
      .from('conversations')
      .select('assigned_agent:users!conversations_assigned_agent_id_fkey(full_name, email)')
      .eq('id', id)
      .single<{ assigned_agent: { full_name: string | null; email: string } | null }>()
    return NextResponse.json(
      { error: 'Another agent is handling this conversation', code: 'taken', holder: displayName(holder?.assigned_agent ?? null) },
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
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can delete conversations' }, { status: 403 })
  }

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, org_id')
    .eq('id', id)
    .single()

  if (!conv || conv.org_id !== profile.org_id) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const { error: msgError } = await supabase.from('messages').delete().eq('conversation_id', id)
  if (msgError) {
    console.error('Failed to delete messages:', msgError)
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
  }

  const { error, count } = await supabase
    .from('conversations')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('org_id', profile.org_id)

  if (error) {
    console.error('Failed to delete conversation:', error)
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
  }

  if (count === 0) {
    return NextResponse.json({ error: 'Conversation not deleted (RLS blocked)' }, { status: 403 })
  }

  return NextResponse.json({ success: true })
}
