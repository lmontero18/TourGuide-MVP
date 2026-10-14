import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'
import { createLogger } from '@/lib/logger'

const log = createLogger({ route: 'feedback' })

const schema = z.object({
  kind: z.enum(['bug', 'idea', 'other']),
  message: z.string().trim().min(3).max(4000),
  page: z.string().max(300).optional(),
})

// Tope por usuario para que el formulario no se use como spam.
const MAX_PER_HOUR = 10
// Captura opcional. Vercel corta el body en 4.5 MB: la imagen hasta 4 MB.
const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const MAX_IMAGE_BYTES = 4 * 1024 * 1024

// multipart (con captura) o JSON (sin captura).
async function readBody(request: NextRequest): Promise<{ fields: unknown; image: File | null }> {
  if (request.headers.get('content-type')?.includes('multipart/form-data')) {
    const form = await request.formData().catch(() => null)
    if (!form) return { fields: null, image: null }
    const image = form.get('image')
    return {
      fields: { kind: form.get('kind'), message: form.get('message'), page: form.get('page') ?? undefined },
      image: image instanceof File && image.size > 0 ? image : null,
    }
  }
  return { fields: await request.json().catch(() => null), image: null }
}
const KIND_LABEL = { bug: 'Error', idea: 'Idea / función', other: 'Otro' } as const

// Comentarios desde el panel → tabla feedback + correo al equipo de Tourfy.
export async function POST(request: NextRequest) {
  const t = await getTranslations('apiErrors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: t('unauthorized') }, { status: 401 })

  const { fields, image } = await readBody(request)
  const parsed = schema.safeParse(fields)
  if (!parsed.success) return NextResponse.json({ error: t('invalidInput') }, { status: 400 })
  const imageExt = image ? IMAGE_TYPES[image.type] : null
  if (image && !imageExt) return NextResponse.json({ error: t('feedbackImageType') }, { status: 400 })
  if (image && image.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: t('feedbackImageTooLarge') }, { status: 413 })

  const service = await createServiceClient()
  const { data: profile } = await service
    .from('users')
    .select('org_id, full_name, email, role, organizations(name)')
    .eq('id', user.id)
    .maybeSingle()

  const { count } = await service
    .from('feedback')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', new Date(Date.now() - 3_600_000).toISOString())
  if ((count ?? 0) >= MAX_PER_HOUR) return NextResponse.json({ error: t('feedbackRateLimited') }, { status: 429 })

  const { kind, message, page } = parsed.data
  const { data: row, error } = await service
    .from('feedback')
    .insert({
      org_id: profile?.org_id ?? null,
      user_id: user.id,
      kind,
      message,
      page: page ?? null,
      user_agent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
    })
    .select('id')
    .single()
  if (error || !row) {
    log.error('feedback insert failed', { error, org_id: profile?.org_id })
    return NextResponse.json({ error: t('feedbackFailed') }, { status: 500 })
  }

  // La captura se guarda aunque falle el correo. Si falla la subida, el
  // comentario igual llega (sin imagen).
  let attachment: { filename: string; content: string } | null = null
  if (image && imageExt) {
    const bytes = Buffer.from(await image.arrayBuffer())
    const path = `${row.id}.${imageExt}`
    const { error: uploadError } = await service.storage
      .from('feedback')
      .upload(path, bytes, { contentType: image.type })
    if (uploadError) {
      log.warn('feedback image upload failed', { error: uploadError, org_id: profile?.org_id })
    } else {
      await service.from('feedback').update({ image_path: path }).eq('id', row.id)
    }
    attachment = { filename: `captura.${imageExt}`, content: bytes.toString('base64') }
  }

  const org = (profile?.organizations as { name?: string } | null)?.name ?? 'sin agencia'
  const who = profile?.full_name || profile?.email || user.email || user.id
  const emailed = await sendEmail({
    to: process.env.FEEDBACK_EMAIL || 'naia@naiaautomate.com',
    subject: `[Tourfy · ${KIND_LABEL[kind]}] ${org}: ${message.slice(0, 60)}${message.length > 60 ? '…' : ''}`,
    text: [
      `Tipo: ${KIND_LABEL[kind]}`,
      `Agencia: ${org}`,
      `De: ${who} (${profile?.role ?? 'sin rol'}) <${profile?.email ?? user.email ?? ''}>`,
      `Página: ${page ?? '-'}`,
      ...(attachment ? ['Captura: adjunta'] : []),
      '',
      message,
    ].join('\n'),
    replyTo: profile?.email ?? user.email ?? undefined,
    attachments: attachment ? [attachment] : undefined,
  }).catch(() => false)

  if (emailed) {
    await service.from('feedback').update({ emailed: true }).eq('id', row.id)
  } else {
    // Sin correo (falta RESEND_API_KEY o fallo Resend): queda en la tabla y
    // avisa a Sentry para que no pase desapercibido.
    Sentry.captureMessage(`Feedback (${KIND_LABEL[kind]}) de ${org}`, {
      level: kind === 'bug' ? 'warning' : 'info',
      tags: { area: 'feedback', org_id: profile?.org_id ?? 'none' },
      extra: { message, page, who },
    })
  }
  return NextResponse.json({ ok: true })
}
