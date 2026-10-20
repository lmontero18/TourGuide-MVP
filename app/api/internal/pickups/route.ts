import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { safeEqual } from '@/lib/security'
import { checkRateLimit } from '@/lib/ratelimit'
import { orgHasFeature } from '@/lib/features'
import { lookupPickup, pickupInstruction } from '@/lib/pickups/lookup'
import type { PickupPlace, PickupTime, PickupTour, PickupZone, Tour } from '@/types'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const log = createLogger({ route: 'internal/pickups' })

const bodySchema = z.object({
  conversation_id: z.string().uuid(),
  tour: z.string().trim().max(200).nullish(),
  hotel: z.string().trim().max(200).nullish(),
})

// Tool `get_pickup_times` del bot (N8N): hora de recogida de un tour en el
// hotel del cliente, segun la tabla de Recogidas de la agencia. Sin tour ni
// hotel devuelve en que hoteles se recoge. La org sale de
// la conversacion, no del body: el bot no puede leer recogidas de otra agencia.
// Responde 200 con `status` + `instruction` aunque no encuentre nada, para que
// el modelo sepa que decir; 4xx/5xx solo para errores reales.
export async function POST(request: NextRequest) {
  const secret = process.env.N8N_INTERNAL_SECRET
  if (!secret) {
    log.error('N8N_INTERNAL_SECRET not configured')
    Sentry.captureMessage('N8N_INTERNAL_SECRET missing', {
      level: 'fatal',
      tags: { route: 'internal/pickups' },
    })
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const auth = request.headers.get('authorization')
  if (!auth || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await checkRateLimit('internal', 'pickups'))) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    const result = bodySchema.safeParse(await request.json())
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    parsed = result.data
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const supabase = getServiceClient()

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('org_id')
      .eq('id', parsed.conversation_id)
      .maybeSingle()

    if (convError) throw convError
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    const orgId = conversation.org_id

    // Sin el feature la tool no deberia estar en el prompt; si igual llega,
    // se responde como "sin datos" para que el bot no invente.
    const enabled = await orgHasFeature(supabase, orgId, 'pickups')

    const [org, zones, places, tours, times] = enabled
      ? await Promise.all([
          supabase.from('organizations').select('tours').eq('id', orgId).single(),
          supabase.from('pickup_zones').select('id, name, sort').eq('org_id', orgId).order('sort'),
          supabase.from('pickup_places').select('id, zone_id, name, aliases').eq('org_id', orgId),
          supabase.from('pickup_tours').select('tour_id, departures, operator, sort').eq('org_id', orgId).order('sort'),
          supabase.from('pickup_times').select('tour_id, departure, zone_id, place_id, pickup_time').eq('org_id', orgId),
        ])
      : []

    const error = org?.error ?? zones?.error ?? places?.error ?? tours?.error ?? times?.error
    if (error) throw error

    const result = lookupPickup(
      {
        zones: (zones?.data ?? []) as PickupZone[],
        places: (places?.data ?? []) as PickupPlace[],
        tours: (tours?.data ?? []) as PickupTour[],
        times: (times?.data ?? []) as PickupTime[],
      },
      (Array.isArray(org?.data?.tours) ? org.data.tours : []) as unknown as Tour[],
      parsed.tour ?? null,
      parsed.hotel ?? null
    )

    log.info('pickup lookup', {
      org_id: orgId,
      conversation_id: parsed.conversation_id,
      status: result.status,
    })

    return NextResponse.json({ ...result, instruction: pickupInstruction(result) })
  } catch (error) {
    log.error('pickup lookup failed', { error, conversation_id: parsed.conversation_id })
    Sentry.captureException(error, { tags: { route: 'internal/pickups' } })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
