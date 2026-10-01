import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createLogger } from '@/lib/logger'

const log = createLogger({ route: 'agents/[id]' })

const patchSchema = z.object({ role: z.enum(['admin', 'agent']) })

// Carga el miembro objetivo validando que sea de la misma org y no sea quien
// hace el request. Cambiarse el propio rol o borrarse a si mismo es la forma
// mas facil de dejar una org sin ningun admin.
async function loadTarget(orgId: string, selfId: string, targetId: string) {
  const t = await getTranslations('apiErrors')
  if (targetId === selfId) {
    return { error: NextResponse.json({ error: t('cannotChangeOwnAccess') }, { status: 400 }) }
  }
  const service = await createServiceClient()
  const { data: target } = await service
    .from('users')
    .select('id, org_id, email')
    .eq('id', targetId)
    .maybeSingle()
  if (!target || target.org_id !== orgId) {
    return { error: NextResponse.json({ error: t('agentNotFound') }, { status: 404 }) }
  }
  return { service, target }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin()
  if (!ctx.ok) return ctx.response
  const { id } = await params
  const t = await getTranslations('apiErrors')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: t('invalidInput') }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: t('invalidInput'), issues: parsed.error.issues }, { status: 400 })
  }

  const loaded = await loadTarget(ctx.orgId, ctx.userId, id)
  if ('error' in loaded) return loaded.error

  // Service client: authenticated no tiene UPDATE sobre users.role (grants por
  // columna, ver 20260727120000_rls_lockdown.sql).
  const { error } = await loaded.service
    .from('users')
    .update({ role: parsed.data.role })
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  if (error) {
    log.error('failed to update agent role', { error, org_id: ctx.orgId, agent_id: id })
    return NextResponse.json({ error: t('roleUpdateFailed') }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdmin()
  if (!ctx.ok) return ctx.response
  const { id } = await params

  const loaded = await loadTarget(ctx.orgId, ctx.userId, id)
  if ('error' in loaded) return loaded.error
  const t = await getTranslations('apiErrors')

  // Las conversaciones que tenia tomadas vuelven al bot. Sin esto quedan con
  // bot_active=false y sin agente (el FK pone assigned_agent_id en null): el
  // cliente escribe y nadie le contesta.
  const { error: releaseError } = await loaded.service
    .from('conversations')
    .update({ bot_active: true, assigned_agent_id: null })
    .eq('org_id', ctx.orgId)
    .eq('assigned_agent_id', id)

  if (releaseError) {
    log.error('failed to release agent conversations', { error: releaseError, org_id: ctx.orgId, agent_id: id })
    return NextResponse.json({ error: t('agentRemoveFailed') }, { status: 500 })
  }

  // Borrar el usuario de Auth cascadea a public.users.
  const { error } = await loaded.service.auth.admin.deleteUser(id)
  if (error) {
    log.error('failed to delete agent', { error, org_id: ctx.orgId, agent_id: id })
    return NextResponse.json({ error: t('agentRemoveFailed') }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
