import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'
import type { LeadDetails, LeadField } from '@/types'

const log = createLogger({ route: 'leads/[id]' })

const text = (max: number) => z.string().trim().max(max).nullable()

// Campos de la ficha que el equipo puede corregir. Cada uno que se toca queda
// bloqueado: la IA no vuelve a pisarlo.
const fieldsSchema = z
  .object({
    tour_interest: text(200),
    travel_date: text(120),
    group_size: text(120),
    quote: text(120),
    pickup: text(200),
    needs: text(300),
    language: text(40),
    summary: text(600),
    next_step: text(300),
  })
  .partial()

const patchSchema = z
  .object({
    status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).optional(),
    amount: z.number().nonnegative().max(10_000_000).nullable().optional(),
    currency: z.string().regex(/^[A-Z]{3}$/).nullable().optional(),
    fields: fieldsSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0)

const DETAIL_KEYS = ['travel_date', 'group_size', 'quote', 'pickup', 'needs', 'language'] as const

// Mueve el lead de etapa y corrige su ficha (cualquier miembro de la org;
// RLS limita a los leads de la propia org).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = await getTranslations('apiErrors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: t('unauthorized') }, { status: 401 })

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: t('invalidInput') }, { status: 400 })
  const input = parsed.data

  const { data: lead } = await supabase
    .from('leads')
    .select('id, org_id, metadata, locked_fields, status')
    .eq('id', id)
    .maybeSingle()
  if (!lead) return NextResponse.json({ error: t('leadNotFound') }, { status: 404 })

  const update: Record<string, unknown> = {}

  if (input.status) {
    update.status = input.status
    const closed = input.status === 'converted' || input.status === 'lost'
    const wasClosed = lead.status === 'converted' || lead.status === 'lost'
    if (closed && !wasClosed) update.closed_at = new Date().toISOString()
    if (!closed) update.closed_at = null
  }
  if (input.amount !== undefined) update.amount = input.amount
  if (input.currency !== undefined) update.currency = input.currency

  if (input.fields) {
    const locked = new Set<LeadField>((lead.locked_fields ?? []) as LeadField[])
    const metadata: LeadDetails = { ...((lead.metadata ?? {}) as LeadDetails) }
    for (const [key, value] of Object.entries(input.fields) as [LeadField, string | null][]) {
      const clean = value?.trim() || null
      locked.add(key)
      if ((DETAIL_KEYS as readonly string[]).includes(key)) metadata[key as keyof LeadDetails] = clean
      else update[key] = clean
    }
    update.metadata = metadata
    update.locked_fields = [...locked]
  }

  const { data, error } = await supabase
    .from('leads')
    .update(update)
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error || !data) {
    log.error('lead update failed', { error, org_id: lead.org_id, lead_id: id })
    return NextResponse.json({ error: t('leadUpdateFailed') }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
