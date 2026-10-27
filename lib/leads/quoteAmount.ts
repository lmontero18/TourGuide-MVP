// Monto sugerido para una venta a partir de la cotizacion que la IA guardo en
// la ficha (metadata.quote), p. ej. "$368 total", "$2,650.98 total",
// "₡9.950 por persona", "4 990 colones". Solo es una sugerencia: el equipo la
// confirma o la corrige antes de guardarla. Ante la duda no sugiere nada
// ("desde 83 USD" no es lo que se cobro).
export interface SuggestedAmount {
  amount: number
  currency: string
}

function currencyOf(text: string): string | null {
  if (/C\$|c[oó]rdoba|\bNIO\b/i.test(text)) return 'NIO'
  if (/₡|col[oó]n|colones|\bCRC\b/i.test(text)) return 'CRC'
  if (/\$|US\$|USD|d[oó]lar/i.test(text)) return 'USD'
  if (/€|EUR/i.test(text)) return 'EUR'
  return null
}

// "2,650.98" → 2650.98 · "9.950" → 9950 · "4 990" → 4990 · "67,50" → 67.5
function parseNumber(raw: string): number | null {
  const s = raw.replace(/(\d)[\s ](?=\d{3}\b)/g, '$1')
  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  let normalized: string
  if (lastDot >= 0 && lastComma >= 0) {
    const decimal = lastDot > lastComma ? '.' : ','
    const thousands = decimal === '.' ? ',' : '.'
    normalized = s.split(thousands).join('').replace(decimal, '.')
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? '.' : ','
    const parts = s.split(sep)
    // Un solo separador seguido de exactamente 3 digitos = miles.
    normalized = parts.length > 2 || parts.at(-1)!.length === 3 ? parts.join('') : parts.join('.')
  } else {
    normalized = s
  }
  const n = Number(normalized)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function suggestAmount(quote: string | null | undefined, groupSize?: string | null): SuggestedAmount | null {
  if (!quote || quote === 'null') return null
  const text = quote.trim()
  // "desde" no es lo que se cobro; un cargo extra no es el total de la venta.
  if (/\bdesde\b|\bfrom\b|\baprox|adicional|\bextra\b|recargo|additional/i.test(text)) return null
  const match = /\d[\d.,\s ]*\d|\d/.exec(text)
  if (!match) return null
  const value = parseNumber(match[0].trim())
  if (value === null) return null
  const currency = currencyOf(text) ?? 'USD'

  const perPerson = /por persona|per person|\bp\/?p\b|c\/u|cada uno|each/i.test(text)
  if (!perPerson) return { amount: value, currency }
  const people = groupCount(groupSize)
  if (!people) return null
  return { amount: Math.round(value * people * 100) / 100, currency }
}

const COUNT_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, one: 1, dos: 2, two: 2, tres: 3, three: 3, cuatro: 4, four: 4,
  cinco: 5, five: 5, seis: 6, six: 6, siete: 7, seven: 7, ocho: 8, eight: 8,
}

// Cuantas personas dice la ficha: "4", "2 adultos y 1 niño" → 3, "pareja" → 2,
// "solo yo" → 1. Las edades no cuentan ("niño de 5 años"). Ante la duda, null.
export function groupCount(groupSize: string | null | undefined): number | null {
  const text = (groupSize ?? '').toLowerCase().trim()
  if (!text || text === 'null') return null
  if (/\b(pareja|couple|dos personas)\b/.test(text)) return 2
  if (/^(solo|sola|yo solo|yo sola|solo yo|just me|alone|1 persona|una persona)$/.test(text)) return 1
  // "2 adultos y 1 niño": suma cada numero (o palabra) seguido de quien es.
  const people = /(\d+|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|one|two|three|four|five|six|seven|eight)\s+(adult|niñ|nin|menor|persona|pax|people|person|kid|child|bebé|bebe|infant|senior|mayor|estudiante|student)/g
  let total = 0
  for (const m of text.matchAll(people)) total += Number(m[1]) || COUNT_WORDS[m[1]]
  if (total > 0) return total
  // Un solo numero suelto: "Grupo de 10".
  const numbers = text.match(/\d+/g)
  if (numbers?.length === 1) return Number(numbers[0]) || null
  const first = /^\s*(\d+)/.exec(text)?.[1] ?? /^\s*(\w+)/.exec(text)?.[1]
  const n = first ? Number(first) || COUNT_WORDS[first] : NaN
  return Number.isFinite(n) && n > 0 ? n : null
}

// La cotizacion separada para editarla con campos (numero, moneda, por persona
// o total) en vez de texto libre. Se vuelve a guardar como texto con
// formatQuote, en el mismo formato que escribe la IA y que lee suggestAmount.
export interface QuoteParts {
  amount: number | null
  currency: string
  perPerson: boolean
}

export function parseQuote(quote: string | null | undefined): QuoteParts {
  const text = (quote ?? '').trim()
  const match = /\d[\d.,\s ]*\d|\d/.exec(text)
  return {
    amount: match ? parseNumber(match[0].trim()) : null,
    currency: currencyOf(text) ?? 'USD',
    perPerson: /por persona|por adulto|per person|per adult|\bp\/?p\b|c\/u|cada uno|each/i.test(text),
  }
}

const QUOTE_SYMBOL: Record<string, string> = { USD: '$', CRC: '₡', NIO: 'C$', EUR: '€' }

// 280, USD, true → "$280 por persona" · 9950, CRC, false → "₡9950 total"
export function formatQuote(amount: number, currency: string, perPerson: boolean): string {
  const symbol = QUOTE_SYMBOL[currency]
  const value = symbol ? `${symbol}${amount}` : `${amount} ${currency}`
  return `${value} ${perPerson ? 'por persona' : 'total'}`
}
