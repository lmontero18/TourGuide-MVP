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
})

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
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { bot_active } = parsed.data

  const update = bot_active
    ? { bot_active: true, assigned_agent_id: null }
    : { bot_active: false, assigned_agent_id: user.id, status: 'open' as const }

  const { data, error } = await supabase
    .from('conversations')
    .update(update)
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .select('id, status, bot_active, assigned_agent_id')
    .single()

  if (error || !data) {
    console.error('Failed to update conversation:', error)
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 })
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
