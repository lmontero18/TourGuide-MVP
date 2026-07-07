import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { registerPhoneNumber } from '@/lib/whatsapp/client'

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

    // 3. Register the phone number on Cloud API (sets the two-step PIN). Idempotente.
    const pin = process.env.META_DEFAULT_WABA_PIN
    if (pin) {
      try {
        await registerPhoneNumber(phone_number_id, access_token, pin)
      } catch (err) {
        // El numero puede tener two-step con otro PIN, o estar ya activo en otra app.
        // No bloqueamos la conexion; el numero se conecta igual y se puede registrar a mano.
        console.error('WhatsApp register skipped:', err)
      }
    }

    // 4. Fetch phone number display info (to store the E.164 number)
    const phoneRes = await fetch(
      `${GRAPH_API_BASE}/${phone_number_id}?fields=display_phone_number,verified_name,quality_rating`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    )

    const phoneData = (await phoneRes.json()) as { display_phone_number?: string }
    const phoneNumber = phoneData.display_phone_number ?? parsed.data.phone_number ?? ''

    // 4b. El numero puede haber quedado conectado a otra org (cuenta de prueba
    // borrada, re-onboarding). RLS no deja ver filas ajenas, asi que el chequeo
    // va con service client — solo despues de verificar que el caller es admin.
    // Si esa org quedo sin usuarios, liberamos el numero; si tiene usuarios
    // activos, es un conflicto real y respondemos claro.
    const serviceClient = await createServiceClient()
    const { data: existing } = await serviceClient
      .from('whatsapp_accounts')
      .select('id, org_id')
      .eq('phone_number_id', phone_number_id)
      .neq('org_id', userData.org_id)
      .maybeSingle()

    if (existing) {
      const { count } = await serviceClient
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', existing.org_id)

      if (count === 0) {
        await serviceClient.from('whatsapp_accounts').delete().eq('id', existing.id)
      } else {
        return NextResponse.json(
          { error: 'Este número de WhatsApp ya está conectado a otra cuenta. Desconectalo primero o contactá soporte.' },
          { status: 409 }
        )
      }
    }

    // 5. Save routing identifiers. NO guardamos el access_token: el runtime usa el
    // System User token central (ver lib/whatsapp/token.ts).
    const { data: waAccount, error } = await supabase
      .from('whatsapp_accounts')
      .upsert(
        {
          org_id: userData.org_id,
          waba_id,
          phone_number_id,
          phone_number: phoneNumber,
          access_token: null,
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
