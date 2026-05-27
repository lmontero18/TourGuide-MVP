import type { BotTone, BusinessSection, FAQ, Tour } from '@/types'

export interface CompilePromptInput {
  agencyName: string
  tone: BotTone
  greeting?: string | null
  tours: Tour[]
  faqs: FAQ[]
  businessInfo?: BusinessSection[]
}

const TONE_DESCRIPTION: Record<BotTone, string> = {
  formal:
    'profesional, pulido y cortes. Trata al cliente de usted y mantiene un registro formal.',
  friendly:
    'calido, cercano y amigable. Tutea al cliente y puede usar emojis con moderacion.',
  casual:
    'relajado, divertido y muy cercano. Usa lenguaje coloquial y emojis con naturalidad.',
}

// Tope suave para que el prompt no crezca sin control. Holgado para que entren
// decenas de tours + secciones del negocio. Las columnas jsonb guardan todo a
// full-fidelity; esto solo acota el texto compilado que lee el bot.
const MAX_CHARS = 24000

function renderTour(tour: Tour): string {
  const name = tour.name.trim()
  if (!name) return ''
  const category = tour.category?.trim()
  const head = category ? `${name} (${category})` : name
  const priceStr = (tour.prices ?? [])
    .filter((p) => Number.isFinite(p.amount) && p.currency)
    .map((p) => `${p.label ? `${p.label} ` : ''}${p.amount} ${p.currency}`)
    .join(' · ')
  const info = tour.info.trim()
  const detail = [priceStr, info].filter(Boolean).join(' · ')
  return detail ? `- ${head}: ${detail}` : `- ${head}`
}

function renderFaq(faq: FAQ): string {
  const q = faq.question.trim()
  const a = faq.answer.trim()
  if (!q || !a) return ''
  return `P: ${q}\nR: ${a}`
}

function renderSection(section: BusinessSection): string {
  const title = section.title.trim()
  const content = section.content.trim()
  if (!title || !content) return ''
  return `### ${title}\n${content}`
}

/**
 * Ensambla el system prompt que consume el bot (N8N lee `organizations.prompt`).
 * Funcion pura y deterministica: misma entrada => mismo texto. Toda ruta de
 * guardado (onboarding, editor, import) debe pasar por aqui para que `prompt`
 * nunca se desincronice de `tours` + `faqs` + personalidad.
 */
export function compilePrompt(input: CompilePromptInput): string {
  const agency = input.agencyName.trim() || 'la agencia'
  const tone = TONE_DESCRIPTION[input.tone] ?? TONE_DESCRIPTION.friendly

  const sections: string[] = []

  sections.push(
    `Eres el asistente virtual de WhatsApp de ${agency}, una agencia de turismo.\n` +
      `Tu tono es ${tone}\n` +
      `Respondes consultas de clientes sobre los tours, precios y condiciones usando UNICAMENTE la informacion de abajo. ` +
      `Los precios pueden variar segun el cliente (locales vs. extranjeros, ninos, grupos): interpreta el detalle de cada tour y responde la combinacion que pregunte el cliente. ` +
      `Si no tienes la informacion, no la inventes — ofrece conectar con un agente humano.`,
  )

  const greeting = input.greeting?.trim()
  if (greeting) {
    sections.push(`Mensaje de bienvenida sugerido:\n${greeting}`)
  }

  // Los tours van primero: es lo que más consulta el cliente. Si algo se trunca
  // por el tope, que sea la info del negocio o las FAQs, no el catálogo.
  const tourLines = input.tours.map(renderTour).filter(Boolean)
  if (tourLines.length > 0) {
    sections.push(`## TOURS\n${tourLines.join('\n')}`)
  }

  const businessLines = (input.businessInfo ?? []).map(renderSection).filter(Boolean)
  if (businessLines.length > 0) {
    sections.push(`## INFORMACION DEL NEGOCIO\n${businessLines.join('\n\n')}`)
  }

  const faqLines = input.faqs.map(renderFaq).filter(Boolean)
  if (faqLines.length > 0) {
    sections.push(`## PREGUNTAS FRECUENTES\n${faqLines.join('\n\n')}`)
  }

  const compiled = sections.join('\n\n')
  if (compiled.length <= MAX_CHARS) return compiled

  return `${compiled.slice(0, MAX_CHARS - 1).trimEnd()}…`
}
