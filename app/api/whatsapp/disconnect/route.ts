import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMessagingToken } from '@/lib/whatsapp/token'

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0'

export async function POST() {
  const supabase = await createClient()

  // Verify authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify admin role
  const { data: userData } = await supabase
    .from('users')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!userData || userData.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  // Read the account first so we can unsubscribe our app from the WABA.
  const { data: wa } = await supabase
    .from('whatsapp_accounts')
    .select('waba_id, access_token')
    .eq('org_id', userData.org_id)
    .maybeSingle()

  // Best-effort: dejar de recibir webhooks de ese WABA. No falla el disconnect si Graph
  // devuelve error (el cliente igual quiere desconectar localmente).
  if (wa?.waba_id) {
    const token = getMessagingToken(wa)
    if (token) {
      try {
        await fetch(`${GRAPH_API_BASE}/${wa.waba_id}/subscribed_apps`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch (err) {
        console.error('WABA unsubscribe failed (continuing):', err)
      }
    }
  }

  // Delete whatsapp account for this org
  const { error } = await supabase
    .from('whatsapp_accounts')
    .delete()
    .eq('org_id', userData.org_id)

  if (error) {
    console.error('WhatsApp disconnect error:', error)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
