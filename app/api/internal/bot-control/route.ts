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

  const { conversation_id } = await request.json() as { conversation_id: string }

  if (!conversation_id) {
    return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 })
  }

  const supabase = getServiceClient()

  await supabase
    .from('conversations')
    .update({ bot_active: false, status: 'pending' })
    .eq('id', conversation_id)

  return NextResponse.json({ ok: true })
}
