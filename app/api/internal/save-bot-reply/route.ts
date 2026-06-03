import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.N8N_INTERNAL_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { conversation_id, content } = await request.json() as {
    conversation_id: string
    content: string
  }

  if (!conversation_id || !content) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = getServiceClient()
  const now = new Date().toISOString()

  await supabase.from('messages').insert({
    conversation_id,
    role: 'assistant',
    content,
    from_bot: true,
  })

  await supabase
    .from('conversations')
    .update({ last_message_at: now })
    .eq('id', conversation_id)

  return NextResponse.json({ ok: true })
}
