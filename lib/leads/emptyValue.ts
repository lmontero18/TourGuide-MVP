// El modelo a veces devuelve el texto "null" (o "N/A", "ninguna") en vez de
// null. Se trata como vacio al guardar la ficha y al mostrarla/usarla, para
// las fichas que ya quedaron guardadas asi.
const EMPTY = /^(null|undefined|none|n\/?a|ninguna?|nada|no aplica|-+|—)$/i

export function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text && !EMPTY.test(text) ? text : null
}
