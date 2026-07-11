import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { compilePrompt } from '@/lib/bot/compilePrompt'
import { dedupeBusiness, dedupeFaqs, dedupeTours } from '@/lib/knowledge/dedupe'
import type { BotConfig, BotTone, BusinessSection, FAQ, Tour } from '@/types'

// Payload del paso final del wizard. Tolera body vacio (clientes viejos).
const finishSchema = z.object({
  tone: z.enum(['formal', 'friendly', 'casual']).optional(),
  greeting: z.string().trim().max(500).optional(),
  default_lang: z.string().trim().min(2).max(10).optional(),
  faqs: z
    .array(z.object({
      question: z.string().trim().min(1).max(500),
      answer: z.string().trim().min(1).max(2000),
    }))
    .max(200)
    .optional(),
  tours: z
    .array(z.object({
      id: z.string().min(1).max(64),
      name: z.string().trim().min(1).max(200),
      category: z.string().trim().max(100).optional(),
      prices: z
        .array(z.object({
          label: z.string().trim().max(60).optional(),
          amount: z.number(),
          currency: z.string().trim().min(1).max(8),
        }))
        .max(20)
        .optional(),
      info: z.string().trim().max(4000),
      source: z.enum(['manual', 'url', 'pdf', 'photo', 'learned']).optional(),
      confidence: z.number().min(0).max(1).optional(),
    }))
    .max(100)
    .optional(),
  business_info: z
    .array(z.object({
      id: z.string().min(1).max(64),
      title: z.string().trim().min(1).max(200),
      content: z.string().trim().max(4000),
      source: z.enum(['manual', 'url', 'pdf', 'photo', 'learned']).optional(),
      confidence: z.number().min(0).max(1).optional(),
    }))
    .max(100)
    .optional(),
})

const createSchema = z.object({
  org_name: z.string().trim().min(1).max(100),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only'),
})

// POST — create the org for the current user (idempotent: returns existing org if already assigned)
export async function POST(request: NextRequest) {
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

  // Idempotent — already has an org, return it
  if (profile?.org_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, slug, onboarded_at')
      .eq('id', profile.org_id)
      .single()
    return NextResponse.json({ success: true, organization: org })
  }

  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { org_name, slug } = parsed.data
  const serviceClient = await createServiceClient()

  const { data: existingOrg } = await serviceClient
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existingOrg) {
    return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
  }

  // Org is created without onboarded_at — the final Launch step sets it via PATCH
  const { data: org, error: orgError } = await serviceClient
    .from('organizations')
    .insert({ name: org_name, slug })
    .select('id, name, slug, onboarded_at')
    .single()

  if (orgError || !org) {
    console.error('Failed to create organization:', orgError)
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
  }

  const { error: userError } = await serviceClient
    .from('users')
    .update({ org_id: org.id, role: 'admin' })
    .eq('id', user.id)

  if (userError) {
    console.error('Failed to assign user to org:', userError)
    return NextResponse.json({ error: 'Failed to assign user' }, { status: 500 })
  }

  const { error: subError } = await serviceClient
    .from('subscriptions')
    .insert({ org_id: org.id, plan: 'starter', status: 'trialing' })

  if (subError) {
    console.error('Failed to create subscription:', subError)
  }

  return NextResponse.json({ success: true, organization: org })
}

// PATCH — finalize onboarding: persist the wizard knowledge (tours, faqs, tone,
// greeting), compile the bot prompt, and set onboarded_at.
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

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'User has no organization' }, { status: 400 })
  }
  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  const parsed = finishSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const serviceClient = await createServiceClient()

  // Estado actual para mergear bot_config y obtener el nombre de la agencia.
  const { data: current } = await serviceClient
    .from('organizations')
    .select('name, faqs, tours, business_info, bot_config')
    .eq('id', profile.org_id)
    .single()

  const currentBotConfig = (current?.bot_config ?? {}) as BotConfig
  const nextBotConfig: BotConfig = { ...currentBotConfig }
  if (parsed.data.tone !== undefined) nextBotConfig.tone = parsed.data.tone
  if (parsed.data.greeting !== undefined) nextBotConfig.greeting = parsed.data.greeting
  if (parsed.data.default_lang !== undefined) nextBotConfig.default_lang = parsed.data.default_lang

  const tours = dedupeTours((parsed.data.tours ?? (current?.tours as Tour[] | null) ?? []) as Tour[])
  const faqs = dedupeFaqs((parsed.data.faqs ?? (current?.faqs as FAQ[] | null) ?? []) as FAQ[])
  const businessInfo = dedupeBusiness(
    (parsed.data.business_info ?? (current?.business_info as BusinessSection[] | null) ?? []) as BusinessSection[],
  )

  const prompt = compilePrompt({
    agencyName: current?.name ?? '',
    tone: (nextBotConfig.tone ?? 'friendly') as BotTone,
    greeting: nextBotConfig.greeting ?? null,
    defaultLang: nextBotConfig.default_lang,
    businessHours: nextBotConfig.business_hours,
    timezone: nextBotConfig.timezone,
    tours,
    faqs,
    businessInfo,
  })

  const { data: org, error } = await serviceClient
    .from('organizations')
    .update({
      tours,
      faqs,
      business_info: businessInfo,
      bot_config: nextBotConfig,
      prompt,
      onboarded_at: new Date().toISOString(),
    })
    .eq('id', profile.org_id)
    .select('id, name, slug, onboarded_at')
    .single()

  if (error || !org) {
    console.error('Failed to finalize onboarding:', error)
    return NextResponse.json({ error: 'Failed to finalize onboarding' }, { status: 500 })
  }

  return NextResponse.json({ success: true, organization: org })
}
