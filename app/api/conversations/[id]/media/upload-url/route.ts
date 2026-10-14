import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getOrgFeatureFlags } from '@/lib/supabase/queries/organizations'
import { hasFeature } from '@/lib/features'
import { getAgentOrg } from '@/lib/conversations/agentSend'
import { outboundMediaSpec } from '@/lib/whatsapp/outboundMedia'
import { createLogger } from '@/lib/logger'

const log = createLogger({ route: 'conversations/[id]/media/upload-url' })

const bodySchema = z.object({
  mime: z.string().max(100),
  size: z.number().int().positive(),
})

// Paso 1 de mandar un archivo (CODE-194): URL firmada de un solo uso para que
// el navegador suba directo a Storage. Vercel corta los bodies en 4.5 MB, por
// eso el archivo no pasa por este server. El envio a WhatsApp es el paso 2
// (POST ../media), que repite todos los chequeos.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const t = await getTranslations('apiErrors')

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: t('invalidInput') }, { status: 400 })

  const spec = outboundMediaSpec(parsed.data.mime)
  if (!spec) return NextResponse.json({ error: t('fileTypeNotAllowed'), code: 'file_type' }, { status: 400 })
  if (parsed.data.size > spec.maxBytes) {
    return NextResponse.json({ error: t('fileTooLarge'), code: 'file_too_large' }, { status: 413 })
  }

  const supabase = await createClient()
  const agent = await getAgentOrg(supabase)
  if (!agent) return NextResponse.json({ error: t('unauthorized') }, { status: 401 })

  if (!hasFeature(await getOrgFeatureFlags(agent.orgId), 'attachments')) {
    return NextResponse.json({ error: t('forbidden') }, { status: 403 })
  }

  // RLS: solo encuentra conversaciones de su org.
  const { data: conv } = await supabase.from('conversations').select('id').eq('id', id).maybeSingle()
  if (!conv) return NextResponse.json({ error: t('conversationNotFound') }, { status: 404 })

  const path = `${agent.orgId}/${conv.id}/out-${crypto.randomUUID()}.${spec.ext}`
  const service = await createServiceClient()
  const { data, error } = await service.storage.from('chat-media').createSignedUploadUrl(path)
  if (error || !data) {
    log.error('signed upload url failed', { error, org_id: agent.orgId })
    return NextResponse.json({ error: t('uploadFailed') }, { status: 500 })
  }

  return NextResponse.json({ path: data.path, token: data.token })
}
