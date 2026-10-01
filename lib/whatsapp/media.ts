// Descarga y procesamiento de media entrante de WhatsApp (Cloud API).
//
// Solo se persiste una version comprimida (webp <=1280px) en el bucket privado
// chat-media — el original nunca se guarda. La imagen pasa por vision UNA sola
// vez al recibirla: la descripcion queda como texto del mensaje y es lo que el
// bot usa en turnos siguientes (no se re-envia la imagen al LLM).

import 'server-only'

import sharp from 'sharp'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'whatsapp/media' })

// Overrideable para tests locales (mock de Graph API)
const GRAPH_API_BASE = process.env.META_GRAPH_API_BASE ?? 'https://graph.facebook.com/v21.0'
const MAX_DIMENSION = 1280
const WEBP_QUALITY = 75
// Si Graph API se cuelga no podemos bloquear el procesamiento del webhook.
const LOOKUP_TIMEOUT_MS = 10_000
const DOWNLOAD_TIMEOUT_MS = 20_000

// La descarga desde lookaside.fbsbx.com puede devolver error/HTML si la
// request no trae User-Agent (gotcha conocido de la Cloud API desde Node).
const MEDIA_HEADERS = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
  'User-Agent': 'Tourfy/1.0 (+https://www.tourfy.app)',
})

export async function downloadMedia(mediaId: string, accessToken: string): Promise<Buffer | null> {
  try {
    const metaRes = await fetch(`${GRAPH_API_BASE}/${mediaId}`, {
      headers: MEDIA_HEADERS(accessToken),
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    })
    if (!metaRes.ok) {
      // Antes se devolvia null sin log: imposible saber por que fallaba.
      log.error('media lookup failed', {
        media_id: mediaId,
        status: metaRes.status,
        body: (await metaRes.text().catch(() => '')).slice(0, 300),
      })
      return null
    }

    const { url } = (await metaRes.json()) as { url?: string }
    if (!url) {
      log.error('media lookup without url', { media_id: mediaId })
      return null
    }

    // La URL de descarga de Meta expira en ~5 minutos — descargar de inmediato.
    const fileRes = await fetch(url, {
      headers: MEDIA_HEADERS(accessToken),
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    })
    if (!fileRes.ok) {
      log.error('media download failed', {
        media_id: mediaId,
        status: fileRes.status,
        content_type: fileRes.headers.get('content-type'),
      })
      return null
    }

    return Buffer.from(await fileRes.arrayBuffer())
  } catch (error) {
    log.error('downloadMedia failed', { error, media_id: mediaId })
    return null
  }
}

export async function compressImage(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate() // aplica orientacion EXIF antes de descartar metadata
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()
}

export async function describeImage(webp: Buffer): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null

  try {
    const { OpenAI } = await import('openai')
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe en una frase corta (máx 30 palabras, en español) esta imagen que un cliente envió a una agencia de turismo por WhatsApp. Si contiene texto legible relevante (fechas, montos, nombres), inclúyelo.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/webp;base64,${webp.toString('base64')}`,
                detail: 'low',
              },
            },
          ],
        },
      ],
    })
    return res.choices[0]?.message?.content?.trim() || null
  } catch {
    return null
  }
}

// Sube la version comprimida al bucket chat-media y devuelve el path
// ({org_id}/{uuid}.webp) que se guarda en messages.media_url.
export async function storeChatImage(
  supabase: SupabaseClient,
  orgId: string,
  webp: Buffer
): Promise<string | null> {
  const path = `${orgId}/${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage
    .from('chat-media')
    .upload(path, webp, { contentType: 'image/webp' })

  if (error) {
    log.error('chat-media upload failed', { error, org_id: orgId })
    return null
  }
  return path
}
