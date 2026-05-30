import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { compilePrompt } from '@/lib/bot/compilePrompt'
import { dedupeBusiness, dedupeFaqs, dedupeTours } from '@/lib/knowledge/dedupe'
import type { BotConfig, BotTone, BusinessSection, FAQ, Tour } from '@/types'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'No organization' }, { status: 404 })
  }

  const { data: org, error } = await supabase
    .from('organizations')
    .select('id, name, slug, prompt, faqs, tours, business_info, bot_config, plan, status, onboarded_at')
    .eq('id', profile.org_id)
    .single()

  if (error || !org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  return NextResponse.json({ organization: org })
}

const businessHoursSchema = z.object({
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format (HH:MM)'),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format (HH:MM)'),
})

const botConfigSchema = z.object({
  timezone: z.string().min(1).max(64).optional(),
  business_hours: businessHoursSchema.optional(),
  tone: z.enum(['formal', 'friendly', 'casual']).optional(),
  greeting: z.string().trim().max(500).optional(),
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
}).refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' })

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

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

  const update: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) update.name = parsed.data.name
  if (effFaqs !== undefined) update.faqs = effFaqs
  if (effTours !== undefined) update.tours = effTours
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
    parsed.data.bot_config?.greeting !== undefined

  if (parsed.data.prompt !== undefined) {
    update.prompt = parsed.data.prompt
  } else if (touchesKnowledge) {
    update.prompt = compilePrompt({
      agencyName: parsed.data.name ?? current?.name ?? '',
      tone: (nextBotConfig.tone ?? 'friendly') as BotTone,
      greeting: nextBotConfig.greeting ?? null,
      // Dedup también al compilar: si no llegó tours en el body pero la columna
      // tiene duplicados viejos, el prompt sale limpio igual.
      tours: dedupeTours((effTours ?? (current?.tours as Tour[] | null) ?? [])),
      faqs: dedupeFaqs((effFaqs ?? (current?.faqs as FAQ[] | null) ?? [])),
      businessInfo: dedupeBusiness((effBusiness ?? (current?.business_info as BusinessSection[] | null) ?? [])),
    })
  }

  const { data: org, error } = await supabase
    .from('organizations')
    .update(update)
    .eq('id', profile.org_id)
    .select('id, name, slug, prompt, faqs, tours, business_info, bot_config, plan, status, onboarded_at')
    .single()

  if (error || !org) {
    console.error('Failed to update organization:', error)
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
  }

  return NextResponse.json({ success: true, organization: org })
}
