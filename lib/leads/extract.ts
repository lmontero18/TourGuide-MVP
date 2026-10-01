import 'server-only'
import OpenAI from 'openai'
import type { LeadDetails, LeadIntent } from '@/types'

// Extractor de la ficha del lead. gpt-4o-mini: sacar campos a un JSON es una
// tarea simple y cuesta ~$0.0005 por llamada (ver doc de costos de IA).
const MODEL = process.env.LEADS_MODEL || 'gpt-4o-mini'

let client: OpenAI | null = null
function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY no está configurada')
  client ??= new OpenAI({ apiKey })
  return client
}

export interface ExtractedLead extends LeadDetails {
  tour_interest: string | null
  intent: LeadIntent | null
  summary: string | null
  next_step: string | null
}

export interface TranscriptLine {
  role: 'user' | 'assistant' | 'agent'
  content: string
}

// Estatico y primero: OpenAI cachea el prefijo (mas barato en cada llamada).
const SYSTEM_PROMPT = `Eres el asistente de CRM de una agencia de turismo. Lees una conversación de WhatsApp entre un cliente, el bot de la agencia y a veces un agente humano, y completas la ficha del cliente.

Devuelve SOLO lo que la conversación dice. Si un dato no aparece, usa null. Nunca inventes fechas, precios ni cantidades.

Campos:
- tour_interest: el tour o los tours que le interesan. Si coincide con un tour del catálogo, usa ese nombre exacto. Varios tours separados por " + ".
- travel_date: la fecha o el rango en que quiere hacer el tour, como lo diría una persona ("sábado 14 de noviembre", "15 al 18 de marzo", "fechas flexibles en diciembre"). Si dice "este sábado", resuélvelo con la fecha de hoy que te paso.
- group_size: cuántas personas y quiénes ("2 adultos + 2 niños (8 y 10)", "pareja", "grupo de 12").
- quote: el precio que se le cotizó o que se habló, con moneda ("$150 total", "$45 por persona"). El último que se mencionó.
- pickup: dónde recogerlo o desde dónde sale (hotel, ciudad).
- needs: necesidades especiales (alimentación, movilidad, idioma del guía, niños pequeños, mascotas).
- language: idioma en que escribe el cliente, en español ("Español", "Inglés", "Francés").
- intent: browsing = solo pregunta o curiosea; quoting = pide precios para fechas o grupo concretos; ready = quiere reservar, pregunta cómo pagar o manda un comprobante. Si no hay suficiente, null.
- summary: 1 o 2 frases para que un vendedor entienda el caso sin leer el chat. Quién es, qué quiere, cuándo y cuánto. Sin saludos.
- next_step: la próxima acción concreta para el equipo ("Enviar datos de pago y confirmar cupos", "Verificar el pago de $150 en el banco"). Si el cliente mandó un comprobante, el paso es verificarlo: nunca lo des por pagado.

Escribe los campos en español, aunque el cliente escriba en otro idioma.`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['tour_interest', 'travel_date', 'group_size', 'quote', 'pickup', 'needs', 'language', 'intent', 'summary', 'next_step'],
  properties: {
    tour_interest: { type: ['string', 'null'] },
    travel_date: { type: ['string', 'null'] },
    group_size: { type: ['string', 'null'] },
    quote: { type: ['string', 'null'] },
    pickup: { type: ['string', 'null'] },
    needs: { type: ['string', 'null'] },
    language: { type: ['string', 'null'] },
    intent: { type: ['string', 'null'], enum: ['browsing', 'quoting', 'ready', null] },
    summary: { type: ['string', 'null'] },
    next_step: { type: ['string', 'null'] },
  },
} as const

const ROLE_LABEL: Record<TranscriptLine['role'], string> = {
  user: 'Cliente',
  assistant: 'Bot',
  agent: 'Agente',
}

const clip = (v: unknown, max: number) =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null

export async function extractLead(input: {
  transcript: TranscriptLine[]
  tourNames: string[]
  today: string
  timezone: string
}): Promise<ExtractedLead> {
  const catalog = input.tourNames.length ? input.tourNames.slice(0, 100).join('\n') : '(sin catálogo)'
  const chat = input.transcript.map((m) => `${ROLE_LABEL[m.role]}: ${m.content}`).join('\n')

  const completion = await getClient().chat.completions.create({
    model: MODEL,
    temperature: 0,
    max_tokens: 500,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Hoy es ${input.today} (zona horaria ${input.timezone}).\n\nCatálogo de tours:\n${catalog}\n\nConversación:\n${chat}`,
      },
    ],
    response_format: { type: 'json_schema', json_schema: { name: 'lead_card', strict: true, schema: SCHEMA } },
  })

  const raw = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as Record<string, unknown>
  const intent = raw.intent === 'browsing' || raw.intent === 'quoting' || raw.intent === 'ready' ? raw.intent : null
  return {
    tour_interest: clip(raw.tour_interest, 200),
    travel_date: clip(raw.travel_date, 120),
    group_size: clip(raw.group_size, 120),
    quote: clip(raw.quote, 120),
    pickup: clip(raw.pickup, 200),
    needs: clip(raw.needs, 300),
    language: clip(raw.language, 40),
    intent,
    summary: clip(raw.summary, 600),
    next_step: clip(raw.next_step, 300),
  }
}
