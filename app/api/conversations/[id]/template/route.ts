import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getMessagingToken } from '@/lib/whatsapp/token'
import { getOrgWhatsApp } from '@/lib/whatsapp/orgAccount'
import { GraphError, listTemplates, renderTemplate, sendTemplate } from '@/lib/whatsapp/templates'
import { createLogger } from '@/lib/logger'

const log = createLogger({ route: 'conversations/[id]/template' })

const schema = z.object({
  name: z.string().regex(/^[a-z0-9_]{1,512}$/),
  language: z.string().max(10),
  values: z.record(z.string(), z.string().trim().min(1).max(500)).default({}),
})

// Envia una plantilla aprobada (CODE-174). Es la forma de retomar una
// conversacion pasada la ventana de 24h. Igual que responder, toma la
// conversacion: si el cliente contesta, le responde el agente, no el bot.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  if (!profile?.org_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, org_id, assigned_agent_id, contact:contacts(phone)')
    .eq('id', id)
    .is('deleted_at', null)
    .single<{ id: string; org_id: string; assigned_agent_id: string | null; contact: { phone: string } | null }>()
  if (!conv || conv.org_id !== profile.org_id || !conv.contact?.phone) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }
  if (conv.assigned_agent_id && conv.assigned_agent_id !== user.id) {
    return NextResponse.json({ error: 'Another agent is handling this conversation', code: 'not_assignee' }, { status: 403 })
  }

  const wa = await getOrgWhatsApp(await createServiceClient(), profile.org_id)
  if (!wa) return NextResponse.json({ error: 'WhatsApp not connected' }, { status: 400 })
  const token = getMessagingToken()

  // Se valida contra Meta: solo plantillas aprobadas, y con todas sus variables.
  let template
  try {
    const all = await listTemplates(wa.waba_id, token)
    template = all.find((t) => t.name === parsed.data.name && t.language === parsed.data.language)
  } catch (error) {
    log.error('failed to load templates', { error, org_id: profile.org_id })
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 502 })
  }
  if (!template || template.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Template not approved', code: 'not_approved' }, { status: 400 })
  }
  const missing = template.variables.filter((v) => !parsed.data.values[v])
  if (missing.length) {
    return NextResponse.json({ error: 'Missing variables', code: 'missing_variables', missing }, { status: 400 })
  }

  try {
    await sendTemplate(wa.phone_number_id, token, conv.contact.phone, template, parsed.data.values)
  } catch (error) {
    log.error('failed to send template', { error, org_id: profile.org_id })
    const message = error instanceof GraphError ? error.message : 'Failed to send template'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  // Tomar la conversacion (atomico: solo si nadie la tiene o ya es mia).
  await supabase
    .from('conversations')
    .update({ bot_active: false, assigned_agent_id: user.id, status: 'open' })
    .eq('id', conv.id)
    .eq('org_id', profile.org_id)
    .or(`assigned_agent_id.is.null,assigned_agent_id.eq.${user.id}`)

  const { error: insertError } = await supabase.from('messages').insert({
    conversation_id: conv.id,
    role: 'agent',
    content: renderTemplate(template, parsed.data.values),
    from_bot: false,
  })
  if (insertError) {
    log.error('template sent but not saved', { error: insertError, org_id: profile.org_id })
    return NextResponse.json({ error: 'Template sent but not saved locally' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
