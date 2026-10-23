import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { requireMember } from '@/lib/auth/requireMember'
import { getOrgFeatureFlags } from '@/lib/supabase/queries/organizations'
import { hasFeature } from '@/lib/features'
import { createBookingSchema } from '@/lib/bookings/schema'
import { createLogger } from '@/lib/logger'

const log = createLogger({ route: 'bookings' })

// Crea una reserva desde la ficha de un lead (flag `bookings`). Cualquier
// miembro de la org; RLS verifica que el lead sea de la misma org.
export async function POST(request: NextRequest) {
  const t = await getTranslations('apiErrors')
  const auth = await requireMember()
  if (!auth.ok) return auth.response
  if (!hasFeature(await getOrgFeatureFlags(auth.orgId), 'bookings')) {
    return NextResponse.json({ error: t('forbidden') }, { status: 403 })
  }

  const parsed = createBookingSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: t('invalidInput') }, { status: 400 })

  const { data, error } = await auth.supabase
    .from('bookings')
    .insert({ ...parsed.data, org_id: auth.orgId, created_by: auth.userId })
    .select('id')
    .single()
  if (error || !data) {
    log.error('booking insert failed', { error, org_id: auth.orgId, lead_id: parsed.data.lead_id })
    return NextResponse.json({ error: t('bookingSaveFailed') }, { status: 500 })
  }
  return NextResponse.json({ id: data.id })
}
