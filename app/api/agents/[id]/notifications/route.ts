import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { getOrgFeatureFlags } from '@/lib/supabase/queries/organizations'
import { hasFeature } from '@/lib/features'
import { createLogger } from '@/lib/logger'

const log = createLogger({ route: 'agents/[id]/notifications' })

const patchSchema = z
  .object({
    notify_scope: z.enum(['all', 'mine']).optional(),
    notify_sound: z.boolean().optional(),
  })
  .refine((b) => b.notify_scope !== undefined || b.notify_sound !== undefined)

// Avisos de una persona del equipo (CODE-195). Solo el admin, para cualquiera
// de su org (incluido el mismo). Service client: authenticated no tiene UPDATE
// sobre estas columnas.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin()
  if (!ctx.ok) return ctx.response
  const { id } = await params
  const t = await getTranslations('apiErrors')

  if (!hasFeature(await getOrgFeatureFlags(ctx.orgId), 'notifications')) {
    return NextResponse.json({ error: t('forbidden') }, { status: 403 })
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: t('invalidInput') }, { status: 400 })

  const service = await createServiceClient()
  const { data, error } = await service
    .from('users')
    .update(parsed.data)
    .eq('id', id)
    .eq('org_id', ctx.orgId)
    .select('id')
    .maybeSingle()

  if (error) {
    log.error('failed to update notification prefs', { error, org_id: ctx.orgId, agent_id: id })
    return NextResponse.json({ error: t('notificationPrefsFailed') }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: t('agentNotFound') }, { status: 404 })
  return NextResponse.json({ success: true })
}
