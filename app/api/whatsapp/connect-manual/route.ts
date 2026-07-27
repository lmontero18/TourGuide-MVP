import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { registerPhoneNumber } from '@/lib/whatsapp/client'
import { createLogger } from '@/lib/logger'

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0'

const log = createLogger({ route: 'whatsapp/connect-manual' })

const connectSchema = z.object({
  waba_id: z.string().trim().min(1),
  phone_number_id: z.string().trim().min(1),
  access_token: z.string().trim().min(1),
  phone_number: z.string().trim().optional(),
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

  if (!userData?.org_id || userData.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  const parsed = connectSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { waba_id, phone_number_id, access_token } = parsed.data

  try {
    const phoneRes = await fetch(
      `${GRAPH_API_BASE}/${phone_number_id}?fields=display_phone_number,verified_name,quality_rating`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    )

    if (!phoneRes.ok) {
      // La respuesta cruda de Meta se loguea, no se devuelve: puede traer detalles
      // de nuestra app (id, scopes, trace) que no le corresponden al cliente.
      const details = await phoneRes.json().catch(() => ({}))
      log.warn('phone number validation failed', { org_id: userData.org_id, details })
      return NextResponse.json(
        { error: 'Token validation failed — check Phone Number ID and Access Token' },
        { status: 400 }
      )
    }

    const phoneData = (await phoneRes.json()) as { display_phone_number?: string }
    const phoneNumber = phoneData.display_phone_number ?? parsed.data.phone_number ?? ''

    const subRes = await fetch(`${GRAPH_API_BASE}/${waba_id}/subscribed_apps`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}` },
    })

    if (!subRes.ok) {
      const details = await subRes.json().catch(() => ({}))
      log.warn('WABA subscribe failed', { org_id: userData.org_id, details })
      return NextResponse.json(
        { error: 'Failed to subscribe app to WABA — check WABA ID and Access Token permissions' },
        { status: 400 }
      )
    }

    // Register the phone number (idempotente, best-effort) si hay PIN configurado.
    const pin = process.env.META_DEFAULT_WABA_PIN
    if (pin) {
      try {
        await registerPhoneNumber(phone_number_id, access_token, pin)
      } catch (err) {
        console.error('WhatsApp register skipped (manual):', err)
      }
    }

    // El token provisto se usa solo in-flight (validar el numero, suscribir la app
    // al WABA y registrarlo). NO se persiste: el runtime opera con el System User
    // token central (META_SYSTEM_USER_TOKEN, ver lib/whatsapp/token.ts). Eso exige
    // que el WABA este compartido con nuestro Business Manager — si no lo esta,
    // este flow conecta pero el bot no va a poder responder.
    const { data: waAccount, error } = await supabase
      .from('whatsapp_accounts')
      .upsert(
        {
          org_id: userData.org_id,
          waba_id,
          phone_number_id,
          phone_number: phoneNumber,
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
    console.error('WhatsApp manual connect error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
