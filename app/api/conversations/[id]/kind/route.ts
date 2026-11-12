import { NextRequest, NextResponse, after } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'
import { orgHasFeature } from '@/lib/features'
import { markBusiness, markCustomer } from '@/lib/contacts/business'
import { refreshLead } from '@/lib/leads/sync'
import { trackUsage } from '@/lib/usage/server'

const log = createLogger({ route: 'conversations/[id]/kind' })

const kindSchema = z.object({ kind: z.enum(['customer', 'business']) })

// "Es negocio" / "Es cliente" desde el chat (flag businessContacts). Lo que
// elige una persona queda bloqueado: la IA no lo vuelve a cambiar.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const t = await getTranslations('apiErrors')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: t('unauthorized') }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('org_id, role').eq('id', user.id).single()
  // El owner (dueño) solo mira Metricas.
  if (!profile?.org_id || profile.role === 'owner') {
    return NextResponse.json({ error: t('forbidden') }, { status: 403 })
  }
  const orgId = profile.org_id

  if (!(await orgHasFeature(supabase, orgId, 'businessContacts'))) {
    return NextResponse.json({ error: t('forbidden') }, { status: 403 })
  }

  const parsed = kindSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: t('invalidInput') }, { status: 400 })
  const { kind } = parsed.data

  // RLS: solo encuentra conversaciones de la org del usuario.
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, contact_id')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle()
  if (!conv) return NextResponse.json({ error: t('conversationNotFound') }, { status: 404 })

  // Service role: borra los leads automaticos y apaga el bot en todas las
  // conversaciones del contacto en un solo paso.
  const service = await createServiceClient()
  try {
    if (kind === 'business') await markBusiness(service, conv.contact_id, { locked: true })
    else await markCustomer(service, conv.contact_id)
  } catch (error) {
    log.error('contact kind change failed', { error, org_id: orgId, conversation_id: id, kind })
    Sentry.captureException(error, { tags: { route: 'conversations/[id]/kind', org_id: orgId } })
    return NextResponse.json({ error: t('conversationUpdateFailed') }, { status: 500 })
  }

  // Vuelve a ser cliente: arma su ficha de nuevo con lo que ya hablo.
  if (kind === 'customer') after(() => refreshLead(service, id, { force: true }))

  trackUsage({
    orgId,
    userId: user.id,
    event: 'contact_kind',
    props: { kind },
    userAgent: request.headers.get('user-agent'),
  })
  return NextResponse.json({ success: true, kind })
}
