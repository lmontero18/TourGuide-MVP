import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createLogger } from '@/lib/logger'

const log = createLogger({ route: 'agents/[id]/resend' })

// Reenvia la invitacion a un miembro que todavia no la acepto (el link vence).
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin()
  if (!ctx.ok) return ctx.response
  const { id } = await params
  const t = await getTranslations('apiErrors')

  const service = await createServiceClient()
  const { data: target } = await service
    .from('users')
    .select('id, org_id, email, full_name')
    .eq('id', id)
    .maybeSingle()
  if (!target || target.org_id !== ctx.orgId) {
    return NextResponse.json({ error: t('agentNotFound') }, { status: 404 })
  }

  const { data: authData } = await service.auth.admin.getUserById(id)
  if (authData?.user?.email_confirmed_at) {
    return NextResponse.json({ error: t('invitationAlreadyAccepted') }, { status: 409 })
  }

  const { error } = await service.auth.admin.inviteUserByEmail(target.email, {
    data: { full_name: target.full_name },
  })
  if (error) {
    log.error('failed to resend invitation', { error, org_id: ctx.orgId, agent_id: id })
    return NextResponse.json({ error: t('resendFailed') }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
