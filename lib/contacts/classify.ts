import 'server-only'
import OpenAI from 'openai'
import type { ContactKind } from '@/types'
import type { TranscriptLine } from '@/lib/leads/extract'

// ¿Quien escribe es un cliente o un negocio? Se pregunta una sola vez, cuando
// el bot pasa la conversacion a un humano (ver internal/bot-control). Mismo
// modelo barato que la ficha del lead (~$0.0003 por llamada).
const MODEL = process.env.LEADS_MODEL || 'gpt-4o-mini'

let client: OpenAI | null = null
function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY no está configurada')
  client ??= new OpenAI({ apiKey })
  return client
}

const SYSTEM_PROMPT = `Lees una conversación de WhatsApp con una agencia de turismo y decides quién escribe.

- customer: un viajero o alguien que pregunta por tours, precios, fechas o reservas para sí, su familia, sus amigos o su grupo. También un cliente que ya reservó y pregunta por su propio viaje.
- business: otra empresa o profesional que NO viene a comprar un tour para sí. Por ejemplo: una agencia u operador que mandó clientes y pregunta por ellos o coordina las reservas de sus clientes; un proveedor (transporte, hotel, guía, restaurante) coordinando logística; alguien que ofrece servicios, publicidad o una alianza; un proveedor que cobra una factura; alguien que busca trabajo.

Ante la duda, responde customer: es mucho peor dejar a un cliente sin bot que dejar pasar a un negocio.`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['kind'],
  properties: { kind: { type: 'string', enum: ['customer', 'business'] } },
} as const

const ROLE_LABEL: Record<TranscriptLine['role'], string> = { user: 'Quien escribe', assistant: 'Bot', agent: 'Agente' }

export async function classifyContact(transcript: TranscriptLine[]): Promise<ContactKind> {
  const chat = transcript.map((m) => `${ROLE_LABEL[m.role]}: ${m.content}`).join('\n')
  const completion = await getClient().chat.completions.create({
    model: MODEL,
    temperature: 0,
    max_tokens: 20,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Conversación:\n${chat}` },
    ],
    response_format: { type: 'json_schema', json_schema: { name: 'contact_kind', strict: true, schema: SCHEMA } },
  })
  const raw = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as { kind?: unknown }
  return raw.kind === 'business' ? 'business' : 'customer'
}
