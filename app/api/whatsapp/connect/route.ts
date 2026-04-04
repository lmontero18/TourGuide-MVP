import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0'

export async function POST(request: NextRequest) {
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

  const body = await request.json()
  const { access_token: shortLivedToken } = body as { access_token: string }

  if (!shortLivedToken) {
    return NextResponse.json({ error: 'Missing access_token' }, { status: 400 })
  }

  try {
    // Exchange short-lived token for long-lived token
    const tokenRes = await fetch(
      `${GRAPH_API_BASE}/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${process.env.META_APP_ID}&` +
      `client_secret=${process.env.META_APP_SECRET}&` +
      `fb_exchange_token=${shortLivedToken}`
    )

    if (!tokenRes.ok) {
      const err = await tokenRes.json()
      return NextResponse.json({ error: 'Token exchange failed', details: err }, { status: 400 })
    }

    const { access_token: longLivedToken } = await tokenRes.json()

    // Get WABA ID and phone number info
    const wabaRes = await fetch(
      `${GRAPH_API_BASE}/debug_token?input_token=${longLivedToken}`,
      { headers: { Authorization: `Bearer ${longLivedToken}` } }
    )

    // Get shared WABA IDs
    const sharedWabaRes = await fetch(
      `${GRAPH_API_BASE}/me/businesses?fields=owned_whatsapp_business_accounts,client_whatsapp_business_accounts`,
      { headers: { Authorization: `Bearer ${longLivedToken}` } }
    )

    // For now, get the first available phone number from the WABA
    // In production, the frontend should let the user select which number
    const wabaData = await sharedWabaRes.json()

    // Get phone numbers from first available WABA
    let wabaId: string | null = null
    const businesses = wabaData.data as Array<Record<string, unknown>> | undefined

    if (businesses?.[0]) {
      const ownedWabas = businesses[0].owned_whatsapp_business_accounts as { data?: Array<{ id: string }> }
      const clientWabas = businesses[0].client_whatsapp_business_accounts as { data?: Array<{ id: string }> }
      wabaId = ownedWabas?.data?.[0]?.id ?? clientWabas?.data?.[0]?.id ?? null
    }

    if (!wabaId) {
      return NextResponse.json({ error: 'No WhatsApp Business Account found' }, { status: 400 })
    }

    // Get phone numbers for this WABA
    const phonesRes = await fetch(
      `${GRAPH_API_BASE}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${longLivedToken}` } }
    )

    const phonesData = await phonesRes.json()
    const phoneNumber = phonesData.data?.[0]

    if (!phoneNumber) {
      return NextResponse.json({ error: 'No phone numbers found in WABA' }, { status: 400 })
    }

    // Save to whatsapp_accounts
    const { data: waAccount, error } = await supabase
      .from('whatsapp_accounts')
      .upsert(
        {
          org_id: userData.org_id,
          waba_id: wabaId,
          phone_number_id: phoneNumber.id,
          phone_number: phoneNumber.display_phone_number,
          access_token: longLivedToken,
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
