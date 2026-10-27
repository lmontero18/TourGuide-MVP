import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { compilePrompt, type CompilePromptInput } from '@/lib/bot/compilePrompt'
import { checkPromptBudget } from '@/lib/bot/promptBudget'
import { createLogger } from '@/lib/logger'
import { dedupeBusiness, dedupeFaqs, dedupeTours } from '@/lib/knowledge/dedupe'
import { canEditKnowledge, type OrgFeatureFlags } from '@/lib/features'
import type { BotConfig, BotTone, BusinessSection, FAQ, KnowledgeEdits, KnowledgeSection, Tour } from '@/types'

const ORG_COLUMNS = 'id, name, slug, prompt, faqs, tours, business_info, bot_config, plan, status, onboarded_at, knowledge_edits'

// Lo que un agente puede guardar (flag agentKnowledge). El nombre, el tono y
// el resto de la configuracion del bot quedan solo para admins.
const KNOWLEDGE_KEYS = ['tours', 'faqs', 'business_info'] as const

// Lo que cuenta como "modificar" un tour: no la fuente ni la confianza de la IA.
function tourContent(tour: Tour) {
  return JSON.stringify([tour.name, tour.category ?? null, tour.prices ?? [], tour.info])
}

// Cada tour lleva quien lo modifico por ultima vez. Los que llegan iguales
// conservan su marca; los nuevos o cambiados se marcan con quien guarda.
function stampTours(next: Tour[], previous: Tour[], by: string, at: string): Tour[] {
  const before = new Map(previous.map((tour) => [tour.id, tour]))
  return next.map((tour) => {
    const old = before.get(tour.id)
    if (old && tourContent(old) === tourContent(tour)) {
      return { ...tour, updated_at: old.updated_at, updated_by: old.updated_by }
    }
    return { ...tour, updated_at: at, updated_by: by }
  })
}

// Secciones que cambiaron de verdad: el editor autoguarda todo junto, asi que
// cada PATCH trae las tres aunque se haya tocado una.
function changedSections(
  next: { tours?: Tour[]; faqs?: FAQ[]; business?: BusinessSection[] },
  current: { tours: Tour[]; faqs: FAQ[]; business: BusinessSection[] }
): KnowledgeSection[] {
  const sections: KnowledgeSection[] = []
  const toursKey = (list: Tour[]) => JSON.stringify(list.map((tour) => [tour.id, tourContent(tour)]))
  const faqsKey = (list: FAQ[]) => JSON.stringify(list.map((faq) => [faq.question, faq.answer]))
  const businessKey = (list: BusinessSection[]) => JSON.stringify(list.map((b) => [b.id, b.title, b.content]))
  if (next.tours && toursKey(next.tours) !== toursKey(current.tours)) sections.push('tours')
  if (next.faqs && faqsKey(next.faqs) !== faqsKey(current.faqs)) sections.push('faqs')
  if (next.business && businessKey(next.business) !== businessKey(current.business)) sections.push('business_info')
  return sections
}

export async function GET() {
  const t = await getTranslations('apiErrors')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: t('unauthorized') }, { status: 401 })
  }

  // RLS (org_select_own) solo deja ver la org del usuario: no hace falta
  // buscar antes su org_id en users (una ida y vuelta menos).
  const { data: org, error } = await supabase
    .from('organizations')
    .select(ORG_COLUMNS)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: t('orgNotFound') }, { status: 404 })
  }
  if (!org) {
    return NextResponse.json({ error: t('noOrganization') }, { status: 404 })
  }

  return NextResponse.json({ organization: org })
}

const businessHoursRangeSchema = z.object({
  // Mensajes = claves de apiErrors (se traducen al responder).
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'invalidTime'),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'invalidTime'),
}).refine((data) => data.start < data.end, {
  message: 'startBeforeEnd',
  path: ['end'],
})

const weeklyBusinessHoursSchema = z.object({
  weekdays: businessHoursRangeSchema,
  weekend: businessHoursRangeSchema.nullable(),
})

const botConfigSchema = z.object({
  timezone: z.string().min(1).max(64).optional(),
  business_hours: weeklyBusinessHoursSchema.optional(),
  tone: z.enum(['formal', 'friendly', 'casual']).optional(),
  greeting: z.string().trim().max(500).optional(),
  default_lang: z.string().trim().min(2).max(10).optional(),
}).strict()

// Las FAQs se persisten como [{question, answer}] (formato que lee N8N para RAG).
// Un `id` de edicion que mande el cliente se descarta (zod no-strict).
const faqSchema = z.object({
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(2000),
})

const priceTierSchema = z.object({
  label: z.string().trim().max(60).optional(),
  amount: z.number(),
  currency: z.string().trim().min(1).max(8),
})

const tourSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().max(100).optional(),
  prices: z.array(priceTierSchema).max(20).optional(),
  info: z.string().trim().max(4000),
  source: z.enum(['manual', 'url', 'pdf', 'photo', 'learned']).optional(),
  confidence: z.number().min(0).max(1).optional(),
})

const businessSectionSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().max(4000),
  source: z.enum(['manual', 'url', 'pdf', 'photo', 'learned']).optional(),
  confidence: z.number().min(0).max(1).optional(),
})

const patchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  // Override manual del prompt (escape hatch). Si se omite, el prompt se recompila
  // automaticamente desde name + tone + greeting + tours + faqs + business_info.
  prompt: z.string().trim().max(12000).nullable().optional(),
  bot_config: botConfigSchema.optional(),
  faqs: z.array(faqSchema).max(200).optional(),
  tours: z.array(tourSchema).max(100).optional(),
  business_info: z.array(businessSectionSchema).max(100).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'noFieldsToUpdate' })

export async function PATCH(request: NextRequest) {
  const t = await getTranslations('apiErrors')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: t('unauthorized') }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('org_id, role, full_name, email, organizations(is_beta, features)')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: t('adminOnly') }, { status: 403 })
  }

  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) {
    const key = parsed.error.issues[0]?.message
    return NextResponse.json({ error: key && t.has(key) ? t(key) : t('invalidInput') }, { status: 400 })
  }

  // Admin: todo. Agente con el flag: solo tours, FAQs e info del negocio.
  const isAdmin = profile.role === 'admin'
  const knowledgeOnly = Object.keys(parsed.data).every((key) => (KNOWLEDGE_KEYS as readonly string[]).includes(key))
  const orgFlags = profile.organizations as unknown as OrgFeatureFlags | null
  if (!isAdmin && !(knowledgeOnly && canEditKnowledge(profile.role, orgFlags))) {
    return NextResponse.json({ error: t('adminOnly') }, { status: 403 })
  }
  const editor = profile.full_name?.trim() || profile.email

  // Estado actual: necesario para mergear bot_config y para recompilar el prompt
  // con los valores efectivos (lo que llega en el body + lo que ya estaba).
  const { data: current } = await supabase
    .from('organizations')
    .select('name, prompt, faqs, tours, business_info, bot_config')
    .eq('id', profile.org_id)
    .single()

  const currentBotConfig = (current?.bot_config ?? {}) as BotConfig
  const nextBotConfig: BotConfig = parsed.data.bot_config
    ? { ...currentBotConfig, ...parsed.data.bot_config }
    : currentBotConfig

  // Deduplica lo que llega (reimportar agrega, y el modelo puede repetir secciones).
  const effTours = parsed.data.tours !== undefined ? dedupeTours(parsed.data.tours as Tour[]) : undefined
  const effFaqs = parsed.data.faqs !== undefined ? dedupeFaqs(parsed.data.faqs as FAQ[]) : undefined
  const effBusiness =
    parsed.data.business_info !== undefined ? dedupeBusiness(parsed.data.business_info as BusinessSection[]) : undefined

  const now = new Date().toISOString()
  const changed = changedSections(
    { tours: effTours, faqs: effFaqs, business: effBusiness },
    {
      tours: (current?.tours as Tour[] | null) ?? [],
      faqs: (current?.faqs as FAQ[] | null) ?? [],
      business: (current?.business_info as BusinessSection[] | null) ?? [],
    }
  )

  const update: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) update.name = parsed.data.name
  if (effFaqs !== undefined) update.faqs = effFaqs
  if (effTours !== undefined) update.tours = stampTours(effTours, (current?.tours as Tour[] | null) ?? [], editor, now)
  if (effBusiness !== undefined) update.business_info = effBusiness
  if (parsed.data.bot_config) update.bot_config = nextBotConfig

  // El prompt se recompila cuando cambia algo que lo alimenta. Un `prompt` explicito
  // en el body es un override manual y gana sobre la recompilacion.
  const touchesKnowledge =
    parsed.data.name !== undefined ||
    parsed.data.faqs !== undefined ||
    parsed.data.tours !== undefined ||
    parsed.data.business_info !== undefined ||
    parsed.data.bot_config?.tone !== undefined ||
    parsed.data.bot_config?.greeting !== undefined ||
    parsed.data.bot_config?.default_lang !== undefined ||
    parsed.data.bot_config?.business_hours !== undefined ||
    parsed.data.bot_config?.timezone !== undefined

  if (parsed.data.prompt !== undefined) {
    update.prompt = parsed.data.prompt
  } else if (touchesKnowledge) {
    const promptInput: CompilePromptInput = {
      agencyName: parsed.data.name ?? current?.name ?? '',
      tone: (nextBotConfig.tone ?? 'friendly') as BotTone,
      greeting: nextBotConfig.greeting ?? null,
      defaultLang: nextBotConfig.default_lang,
      businessHours: nextBotConfig.business_hours,
      timezone: nextBotConfig.timezone,
      // Dedup también al compilar: si no llegó tours en el body pero la columna
      // tiene duplicados viejos, el prompt sale limpio igual.
      tours: dedupeTours((effTours ?? (current?.tours as Tour[] | null) ?? [])),
      faqs: dedupeFaqs((effFaqs ?? (current?.faqs as FAQ[] | null) ?? [])),
      businessInfo: dedupeBusiness((effBusiness ?? (current?.business_info as BusinessSection[] | null) ?? [])),
    }
    update.prompt = compilePrompt(promptInput)
    checkPromptBudget(promptInput, profile.org_id, createLogger({ route: 'organizations', org_id: profile.org_id }))
  }

  // Un agente no tiene UPDATE en organizations (RLS solo admin): su guardado
  // va con service role, ya acotado arriba a tours/FAQs/info y a su org.
  const writer = isAdmin ? supabase : await createServiceClient()
  const { data: org, error } = await writer
    .from('organizations')
    .update(update)
    .eq('id', profile.org_id)
    .select(ORG_COLUMNS)
    .single()

  if (error || !org) {
    console.error('Failed to update organization:', error)
    return NextResponse.json({ error: t('orgUpdateFailed') }, { status: 500 })
  }

  // Quien modifico cada seccion (con la sesion del usuario: touch_knowledge
  // lee su nombre). Si falla no se pierde el guardado.
  let edits = (org.knowledge_edits ?? {}) as KnowledgeEdits
  if (changed.length) {
    const { error: touchError } = await supabase.rpc('touch_knowledge', { p_sections: changed })
    if (touchError) console.error('Failed to record knowledge edit:', touchError)
    else edits = { ...edits, ...Object.fromEntries(changed.map((s) => [s, { at: now, by: editor }])) }
  }

  return NextResponse.json({ success: true, organization: { ...org, knowledge_edits: edits } })
}
