import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { getMessagingToken } from '@/lib/whatsapp/token'
import { getOrgWhatsApp } from '@/lib/whatsapp/orgAccount'
import { deleteTemplate, GraphError } from '@/lib/whatsapp/templates'
import { createLogger } from '@/lib/logger'

const log = createLogger({ route: 'templates/[name]' })

// Borra todas las versiones (idiomas) de la plantilla con ese nombre.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const ctx = await requireAdmin()
  if (!ctx.ok) return ctx.response
  const { name } = await params
  if (!/^[a-z0-9_]{1,512}$/.test(name)) return NextResponse.json({ error: 'Invalid name' }, { status: 400 })

  const wa = await getOrgWhatsApp(await createServiceClient(), ctx.orgId)
  if (!wa) return NextResponse.json({ error: 'WhatsApp not connected' }, { status: 400 })

  try {
    await deleteTemplate(wa.waba_id, getMessagingToken(), name)
    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('failed to delete template', { error, org_id: ctx.orgId, name })
    const message = error instanceof GraphError ? error.message : 'Failed to delete template'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
