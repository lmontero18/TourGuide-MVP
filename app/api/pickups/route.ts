import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { getOrgFeatureFlags } from '@/lib/supabase/queries/organizations'
import { getPickups, savePickups } from '@/lib/supabase/queries/pickups'
import { hasFeature } from '@/lib/features'
import { createLogger } from '@/lib/logger'
import type { PickupData } from '@/types'

const log = createLogger({ route: 'pickups' })

// Recogidas (flag `pickups`). GET: todo el equipo. PUT: solo admin, reemplaza todo.
export async function GET() {
  const t = await getTranslations('apiErrors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: t('unauthorized') }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  if (!profile?.org_id) return NextResponse.json({ error: t('forbidden') }, { status: 403 })
  if (!hasFeature(await getOrgFeatureFlags(profile.org_id), 'pickups')) {
    return NextResponse.json({ error: t('forbidden') }, { status: 403 })
  }

  try {
    return NextResponse.json(await getPickups())
  } catch (error) {
    log.error('failed to load pickups', { error, org_id: profile.org_id })
    return NextResponse.json({ error: t('pickupsLoadFailed') }, { status: 500 })
  }
}

const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/

const bodySchema = z.object({
  zones: z.array(z.object({
    id: z.uuid(),
    name: z.string().trim().min(1).max(120),
    sort: z.number().int().min(0).max(10000),
  })).max(300),
  places: z.array(z.object({
    id: z.uuid(),
    zone_id: z.uuid(),
    name: z.string().trim().min(1).max(120),
    aliases: z.array(z.string().trim().min(1).max(120)).max(20),
  })).max(2000),
  tours: z.array(z.object({
    tour_id: z.string().min(1).max(64),
    departures: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
    operator: z.string().trim().max(120).nullable(),
    sort: z.number().int().min(0).max(10000),
  })).max(200),
  times: z.array(z.object({
    tour_id: z.string().min(1).max(64),
    departure: z.number().int().min(0).max(7),
    zone_id: z.uuid(),
    place_id: z.uuid().nullable(),
    // 'none' = no recoge ahi (distinto de no tener fila: sin cargar).
    pickup_time: z.union([z.literal('none'), z.string().regex(TIME, 'invalidTime')]),
  })).max(20000),
})

// Descarta lo que no cierra: horas de un tour, salida, zona u hotel que no
// vienen en el mismo guardado, y horas repetidas (gana la ultima).
function consistent(data: PickupData): PickupData {
  const zoneIds = new Set(data.zones.map((z) => z.id))
  const places = data.places.filter((p) => zoneIds.has(p.zone_id))
  const placeZone = new Map(places.map((p) => [p.id, p.zone_id]))
  const departures = new Map(data.tours.map((tour) => [tour.tour_id, tour.departures.length]))
  const times = new Map<string, PickupData['times'][number]>()
  for (const x of data.times) {
    const count = departures.get(x.tour_id)
    if (count === undefined || x.departure >= count || !zoneIds.has(x.zone_id)) continue
    if (x.place_id && placeZone.get(x.place_id) !== x.zone_id) continue
    times.set(`${x.tour_id}|${x.departure}|${x.zone_id}|${x.place_id ?? ''}`, x)
  }
  return { zones: data.zones, places, tours: data.tours, times: [...times.values()] }
}

export async function PUT(request: NextRequest) {
  const t = await getTranslations('apiErrors')
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  if (!hasFeature(await getOrgFeatureFlags(auth.orgId), 'pickups')) {
    return NextResponse.json({ error: t('forbidden') }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    const key = parsed.error.issues[0]?.message
    return NextResponse.json({ error: key && t.has(key) ? t(key) : t('invalidInput') }, { status: 400 })
  }

  try {
    await savePickups(consistent(parsed.data))
    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('failed to save pickups', { error, org_id: auth.orgId })
    Sentry.captureException(error, { tags: { route: 'pickups', org_id: auth.orgId } })
    return NextResponse.json({ error: t('pickupsSaveFailed') }, { status: 500 })
  }
}
