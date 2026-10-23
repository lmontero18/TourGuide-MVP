import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { requireMember } from '@/lib/auth/requireMember'
import { getOrgFeatureFlags } from '@/lib/supabase/queries/organizations'
import { hasFeature } from '@/lib/features'
import { updateBookingSchema } from '@/lib/bookings/schema'
import { createLogger } from '@/lib/logger'

const log = createLogger({ route: 'bookings/[id]' })

// Miembro de la org con el feature. RLS limita cada query a su org.
async function guard() {
  const t = await getTranslations('apiErrors')
  const auth = await requireMember()
  if (!auth.ok) return { t, error: auth.response } as const
  if (!hasFeature(await getOrgFeatureFlags(auth.orgId), 'bookings')) {
    return { t, error: NextResponse.json({ error: t('forbidden') }, { status: 403 }) } as const
  }
  return { t, auth } as const
}

// Corrige una reserva (fecha, hora de recogida, notas...). RLS: solo de la org.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await guard()
  if ('error' in g) return g.error
  const { t, auth } = g

  const parsed = updateBookingSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: t('invalidInput') }, { status: 400 })

  const { data, error } = await auth.supabase.from('bookings').update(parsed.data).eq('id', id).select('id').maybeSingle()
  if (error) {
    log.error('booking update failed', { error, org_id: auth.orgId, booking_id: id })
    return NextResponse.json({ error: t('bookingSaveFailed') }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: t('bookingNotFound') }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await guard()
  if ('error' in g) return g.error
  const { t, auth } = g

  const { error } = await auth.supabase.from('bookings').delete().eq('id', id)
  if (error) {
    log.error('booking delete failed', { error, org_id: auth.orgId, booking_id: id })
    return NextResponse.json({ error: t('bookingSaveFailed') }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
