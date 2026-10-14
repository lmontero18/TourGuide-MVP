import { NextRequest, NextResponse, after } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getOrgFeatureFlags } from '@/lib/supabase/queries/organizations'
import { hasFeature } from '@/lib/features'
import { sendMediaMessage } from '@/lib/whatsapp/client'
import { outboundMediaContent, outboundMediaSpec } from '@/lib/whatsapp/outboundMedia'
import { getAgentOrg, prepareAgentSend, sendErrorResponse } from '@/lib/conversations/agentSend'
import { refreshLead } from '@/lib/leads/sync'
import { createLogger } from '@/lib/logger'

const log = createLogger({ route: 'conversations/[id]/media' })

// Meta descarga el archivo desde esta URL al recibir el envio.
const LINK_TTL_SECONDS = 10 * 60

const bodySchema = z.object({
  path: z.string().max(512),
  mime: z.string().max(100),
  filename: z.string().trim().min(1).max(200),
  caption: z.string().trim().max(1024).default(''),
})

// Paso 2 de mandar un archivo (CODE-194): el archivo ya esta en chat-media
// (subido con la URL del paso 1). Mismos chequeos que un texto, se manda por
// WhatsApp con un link firmado y queda guardado como mensaje del agente.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const t = await getTranslations('apiErrors')

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: t('invalidInput') }, { status: 400 })
  const { path, mime, filename, caption } = parsed.data

  const spec = outboundMediaSpec(mime)
  if (!spec || !path.endsWith(`.${spec.ext}`)) {
    return NextResponse.json({ error: t('fileTypeNotAllowed'), code: 'file_type' }, { status: 400 })
  }

  // Flag y path antes de prepareAgentSend: ese paso toma la conversacion.
  const agent = await getAgentOrg(await createClient())
  if (!agent) return NextResponse.json({ error: t('unauthorized') }, { status: 401 })
  if (!hasFeature(await getOrgFeatureFlags(agent.orgId), 'attachments')) {
    return NextResponse.json({ error: t('forbidden') }, { status: 403 })
  }

  // Solo archivos subidos para ESTA conversacion de SU org (paso 1).
  if (!/^[\w-]+\/[\w-]+\/out-[\w-]+\.\w+$/.test(path) || !path.startsWith(`${agent.orgId}/${id}/out-`)) {
    return NextResponse.json({ error: t('invalidInput') }, { status: 400 })
  }

  const prep = await prepareAgentSend(id, t)
  if (!prep.ok) return prep.response
  const { supabase, userId, orgId, conversationId, to, phoneNumberId, token } = prep.ctx

  const service = await createServiceClient()
  const { data: link, error: linkError } = await service.storage
    .from('chat-media')
    .createSignedUrl(path, LINK_TTL_SECONDS)
  if (linkError || !link) {
    // No existe: la subida del paso 1 no termino.
    log.warn('outbound media missing', { error: linkError, org_id: orgId })
    return NextResponse.json({ error: t('uploadFailed') }, { status: 400 })
  }

  let wamid: string | null = null
  try {
    const sent = await sendMediaMessage(phoneNumberId, token, to, spec.kind, link.signedUrl, caption || undefined, filename)
    wamid = sent.messages?.[0]?.id ?? null
  } catch (err) {
    return sendErrorResponse(err, orgId, t, log)
  }

  const { data: msg, error: insertError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'agent',
      content: outboundMediaContent(spec.kind, filename, caption),
      from_bot: false,
      media_url: path,
      media_type: spec.kind,
      wa_message_id: wamid,
      delivery_status: wamid ? 'sent' : null,
      sender_id: userId,
    })
    .select('id, conversation_id, role, content, from_bot, channel, media_url, media_type, created_at, delivery_status')
    .single()

  if (insertError || !msg) {
    log.error('outbound media message insert failed', { error: insertError, org_id: orgId })
    return NextResponse.json({ error: t('messageNotSaved') }, { status: 500 })
  }

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  after(async () => refreshLead(await createServiceClient(), conversationId))

  return NextResponse.json({ success: true, message: msg })
}
