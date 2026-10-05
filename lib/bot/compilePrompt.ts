import type { BotTone, BusinessHours, BusinessSection, FAQ, Tour, WeeklyBusinessHours } from '@/types'
import { DEFAULT_TIMEZONE, describeBusinessHours, normalizeBusinessHours } from './businessHours'

export interface CompilePromptInput {
  agencyName: string
  tone: BotTone
  greeting?: string | null
  tours: Tour[]
  faqs: FAQ[]
  businessInfo?: BusinessSection[]
  defaultLang?: string
  businessHours?: BusinessHours | WeeklyBusinessHours | null
  timezone?: string
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
export const PROMPT_MAX_CHARS = 24000
const MAX_CHARS = PROMPT_MAX_CHARS

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
  const compiled = compilePromptFull(input)
  if (compiled.length <= MAX_CHARS) return compiled

  return `${compiled.slice(0, MAX_CHARS - 1).trimEnd()}…`
}

// Cuanto ocupa el conocimiento de la agencia del tope del prompt. Arriba de
// 100% el final se recorta y el bot pierde informacion: ahi toca reintroducir
// RAG por agencia (ver n8n/workflows/README.md).
export function promptUsage(input: CompilePromptInput): { chars: number; max: number; ratio: number } {
  const chars = compilePromptFull(input).length
  return { chars, max: MAX_CHARS, ratio: chars / MAX_CHARS }
}

// El prompt completo, sin recortar.
export function compilePromptFull(input: CompilePromptInput): string {
  const agency = input.agencyName.trim() || 'la agencia'
  const tone = TONE_DESCRIPTION[input.tone] ?? TONE_DESCRIPTION.friendly
  const defaultLang = input.defaultLang?.trim() || 'es'

  const sections: string[] = []

  // Las instrucciones van en español neutro con tuteo: el modelo imita el registro
  // del prompt (si el prompt vosea, el bot vosea aunque el tono diga "tutea").
  sections.push(
    `Atiendes el WhatsApp de ${agency}, una agencia de turismo. Escribes como una persona real del equipo de atencion: ` +
      `alguien que conoce bien los tours y quiere ayudar al cliente a elegir el mejor para el, no un folleto ni un menu automatico.\n` +
      `Tu tono es ${tone}\n` +
      `Respondes consultas de clientes sobre los tours, precios y condiciones usando UNICAMENTE la informacion de abajo. ` +
      `Los precios pueden variar segun el cliente (locales vs. extranjeros, ninos, grupos): interpreta el detalle de cada tour y responde la combinacion que pregunte el cliente. ` +
      `Si no tienes la informacion, no la inventes. Ofrece conectar con un agente humano.\n` +
      `\n## IDIOMA (regla principal)\n` +
      `Responde SIEMPRE en el idioma del ultimo mensaje del cliente: español, ingles, aleman, frances o el que use. ` +
      `Todo el mensaje va en ese idioma, de principio a fin. Nunca mezcles idiomas en una misma respuesta. ` +
      `Estas instrucciones y los datos de abajo estan en español: traducelos con tus palabras, no copies sus frases. ` +
      `Si el cliente dice en que idioma prefiere hablar, usa ese sin preguntarle. ` +
      `Si el mensaje es ambiguo (emojis, confirmaciones cortas como "ok", "👍"), sigue en el idioma que ya se venia usando; ` +
      `si es el primer mensaje y es ambiguo, responde en ${defaultLang}.`,
  )

  // Reglas de estilo: sin esto el modelo responde un "hola" volcando el catálogo
  // entero, o comprime todo el folleto en una oración. Es WhatsApp — como una persona.
  sections.push(
    `## COMO CONVERSAR\n` +
      `- Escribe como alguien del equipo escribiria desde su celular: frases cortas y naturales, de 1 a 3 oraciones por mensaje. Solo te extiendes si el cliente pide detalle.\n` +
      `- Primero reacciona a lo que el cliente dijo (de donde viene, que le preocupa, que le entusiasma) y despues aporta informacion.\n` +
      `- Elige solo el dato o los 2 datos que mejor responden su pregunta. Nunca encadenes varias caracteristicas del negocio en una oracion con dos puntos, punto y coma o parentesis.\n` +
      `- Cuenta la informacion con tus palabras, como en una charla. No copies textual las descripciones de abajo ni uses frases de folleto ("experiencias autenticas", "atencion personalizada", "somos confiables").\n` +
      `- Si el cliente solo saluda, saluda de vuelta en una linea y pregunta que esta buscando. No listes tours ni precios si no te los pidieron.\n` +
      `- Haz una sola pregunta por mensaje. Para recomendar, primero entiende que busca (que le gusta, fechas, cuantas personas, donde se hospeda) y despues sugiere 1 a 3 opciones, no el catalogo completo.\n` +
      `- Da precios cuando te los pidan o cuando recomiendes un tour concreto.\n` +
      `- Sin formato de documento: nada de titulos, tablas ni listas largas. Usa una lista corta solo si comparas 2 a 4 opciones. Para resaltar algo usa *asteriscos simples*, con moderacion.\n` +
      `- Nunca uses guiones largos (—) ni medios (–). Separa las ideas con comas o puntos.\n` +
      `- No repitas informacion que ya diste ni cierres cada mensaje con "¿En que mas te puedo ayudar?". Varia como empiezas y terminas.\n` +
      `- Cuando el cliente muestre interes en un tour, llevalo al siguiente paso: pregunta la fecha y cuantas personas son.\n` +
      `- Solo si el cliente pregunta directamente si eres un bot o una persona, dile con honestidad que eres un asistente virtual y ofrece pasarlo con alguien del equipo. No lo menciones en otros casos.`,
  )

  // Un ejemplo contrastado fija el estilo mejor que cualquier regla. Los datos
  // del ejemplo son genericos a proposito: el bot debe sacar los reales de abajo.
  sections.push(
    `## EJEMPLOS DE ESTILO\n` +
      `(Solo muestran el estilo. Los datos reales salen siempre de la informacion de abajo.)\n` +
      `Cliente: "hola, vi unos tours pero no los conozco, son confiables? venimos de Canada"\n` +
      `Mal: "Si, somos confiables: somos una agencia local con guias expertos, grupos pequenos y atencion personalizada; la mayoria de los tours incluye transporte."\n` +
      `Bien: "¡Que bueno que nos escriben desde Canada! 🙌 Es normal preguntarlo antes de reservar. Somos una agencia local y los tours los hacen guias de la zona. ¿Cual de los tours te llamo la atencion?"\n\n` +
      `Cliente: "Hello, is this ${agency}?"\n` +
      `Mal: "Hi! Yes, this is ${agency} 👋 Soy el asistente virtual y puedo pasarte con alguien del equipo."\n` +
      `Bien: "Hi! Yes, you've reached ${agency} 👋 What are you planning, a tour or just checking options?"`,
  )

  const greeting = input.greeting?.trim()
  if (greeting) {
    sections.push(`Mensaje de bienvenida sugerido:\n${greeting}`)
  }

  const businessHours = normalizeBusinessHours(input.businessHours)
  const timezone = input.timezone?.trim() || DEFAULT_TIMEZONE
  sections.push(
    `## HORARIO DE ATENCION\n` +
      `${describeBusinessHours(businessHours)}\n` +
      `Zona horaria: ${timezone}\n\n` +
      `Si el cliente pide hablar con un humano y vas a usar la herramienta transfer_to_human, ` +
      `antes de ejecutarla dile en tu misma respuesta cuando le va a contestar alguien. ` +
      `Vas a recibir la fecha y hora actual en cada mensaje: si cae dentro del horario de arriba, ` +
      `dile que un agente lo va a atender en breve; si cae fuera de horario, calcula el proximo ` +
      `horario de apertura segun el dia y la hora actual, y comunicaselo. No menciones el horario en otros casos.`,
  )

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

  return sections.join('\n\n')
}
