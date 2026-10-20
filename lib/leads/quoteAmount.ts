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
  const people = Number(/\d+/.exec(groupSize ?? '')?.[0])
  if (!Number.isFinite(people) || people <= 0) return null
  return { amount: Math.round(value * people * 100) / 100, currency }
}
