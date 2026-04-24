import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0'

const connectSchema = z.object({
  code: z.string().min(1),
  waba_id: z.string().min(1),
  phone_number_id: z.string().min(1),
  phone_number: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!userData || userData.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  const parsed = connectSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { code, waba_id, phone_number_id } = parsed.data

  try {
    // 1. Exchange code for a business integration system user access token
    const tokenUrl =
      `${GRAPH_API_BASE}/oauth/access_token?` +
      `client_id=${process.env.META_APP_ID}&` +
      `client_secret=${process.env.META_APP_SECRET}&` +
      `code=${encodeURIComponent(code)}`

    const tokenRes = await fetch(tokenUrl)
    if (!tokenRes.ok) {
      const details = await tokenRes.json().catch(() => ({}))
      return NextResponse.json({ error: 'Token exchange failed', details }, { status: 400 })
    }

    const { access_token } = (await tokenRes.json()) as { access_token: string }

    // 2. Subscribe our app to the WABA so we receive webhook events for it
    const subRes = await fetch(`${GRAPH_API_BASE}/${waba_id}/subscribed_apps`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}` },
    })

    if (!subRes.ok) {
      const details = await subRes.json().catch(() => ({}))
      return NextResponse.json({ error: 'Failed to subscribe app to WABA', details }, { status: 400 })
    }

    // 3. Fetch phone number display info (to store the E.164 number)
    const phoneRes = await fetch(
      `${GRAPH_API_BASE}/${phone_number_id}?fields=display_phone_number,verified_name,quality_rating`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    )

    const phoneData = (await phoneRes.json()) as { display_phone_number?: string }
    const phoneNumber = phoneData.display_phone_number ?? parsed.data.phone_number ?? ''

    // 4. Save credentials to our DB
    const { data: waAccount, error } = await supabase
      .from('whatsapp_accounts')
      .upsert(
        {
          org_id: userData.org_id,
          waba_id,
          phone_number_id,
          phone_number: phoneNumber,
          access_token,
          status: 'active',
          connected_at: new Date().toISOString(),
        },
        { onConflict: 'org_id' }
      )
      .select('id, phone_number, status, connected_at')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, account: waAccount })
  } catch (error) {
    console.error('WhatsApp connect error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
