import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { getMessagingToken } from '@/lib/whatsapp/token'
import { getOrgWhatsApp } from '@/lib/whatsapp/orgAccount'
import { createTemplate, extractVariables, GraphError, listTemplates } from '@/lib/whatsapp/templates'
import { createLogger } from '@/lib/logger'

const log = createLogger({ route: 'templates' })

// Listar: todo el equipo (los agentes usan las aprobadas en el chat).
export async function GET() {
  const t = await getTranslations('apiErrors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: t('unauthorized') }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  if (!profile?.org_id) return NextResponse.json({ error: t('forbidden') }, { status: 403 })

  const wa = await getOrgWhatsApp(await createServiceClient(), profile.org_id)
  if (!wa) return NextResponse.json({ templates: [], connected: false })

  try {
    const templates = await listTemplates(wa.waba_id, getMessagingToken())
    return NextResponse.json({ templates, connected: true })
  } catch (error) {
    log.error('failed to list templates', { error, org_id: profile.org_id })
    return NextResponse.json({ error: t('templatesLoadFailed') }, { status: 502 })
  }
}

// Limites de Meta para plantillas.
const buttonSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('QUICK_REPLY'), text: z.string().trim().min(1).max(25) }),
  z.object({ type: z.literal('URL'), text: z.string().trim().min(1).max(25), url: z.url().max(2000) }),
])

const createSchema = z
  .object({
    name: z.string().regex(/^[a-z0-9_]{1,512}$/, 'templateNameFormat'),
    category: z.enum(['UTILITY', 'MARKETING']),
    language: z.string().regex(/^[a-z]{2}(_[A-Z]{2})?$/),
    header: z.string().trim().max(60).optional(),
    body: z.string().trim().min(1).max(1024),
    footer: z.string().trim().max(60).optional(),
    buttons: z.array(buttonSchema).max(10).optional(),
    examples: z.record(z.string(), z.string().trim().min(1).max(200)).default({}),
  })
  .refine(
    (v) => extractVariables(`${v.header ?? ''} ${v.body}`).every((name) => v.examples[name]),
    { message: 'templateVariableExample', path: ['examples'] }
  )

// Crear: solo admins (son de la agencia, cuentan para su calidad en Meta y cuestan al enviarse).
export async function POST(request: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx.ok) return ctx.response
  const t = await getTranslations('apiErrors')

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    // Los mensajes propios del schema son claves de apiErrors.
    const key = parsed.error.issues[0]?.message
    return NextResponse.json(
      { error: key && t.has(key) ? t(key) : t('invalidInput'), issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const wa = await getOrgWhatsApp(await createServiceClient(), ctx.orgId)
  if (!wa) return NextResponse.json({ error: t('whatsappNotConnected'), code: 'not_connected' }, { status: 400 })

  try {
    const created = await createTemplate(wa.waba_id, getMessagingToken(), parsed.data)
    return NextResponse.json({ success: true, template: created })
  } catch (error) {
    log.error('failed to create template', { error, org_id: ctx.orgId })
    // El mensaje de Meta explica el rechazo (nombre repetido, formato, etc.).
    const message = error instanceof GraphError
      ? t('templateRejected', { reason: error.message })
      : t('templateCreateFailed')
    return NextResponse.json({ error: message, code: 'meta_rejected' }, { status: 400 })
  }
}
