// Mensajes del cliente que no piden respuesta: se guardan como marcador entre
// corchetes y ni el bot ni el cron de "sin respuesta" los toman como pregunta.
//   [video], [reaction]      → tipo sin contenido para el bot
//   [reaction] 👍            → reaccion con su emoji (CODE-193)
//   [reaction_removed]       → el cliente quito su reaccion
// Pure: se usa en el webhook, el cron y el chat (cliente).
const BARE = /^\[[a-z_]+\]$/
const REACTION_PREFIX = '[reaction] '

export function isPlaceholder(content: string): boolean {
  return BARE.test(content) || content.startsWith(REACTION_PREFIX)
}

export function reactionContent(emoji: string | undefined | null): string {
  const e = (emoji ?? '').trim().slice(0, 32)
  return e ? `${REACTION_PREFIX}${e}` : '[reaction_removed]'
}

// Para mostrar en el chat. null = no es una reaccion.
export function parseReaction(content: string): { emoji: string | null; removed: boolean } | null {
  if (content === '[reaction_removed]') return { emoji: null, removed: true }
  if (content === '[reaction]') return { emoji: null, removed: false }
  if (content.startsWith(REACTION_PREFIX)) return { emoji: content.slice(REACTION_PREFIX.length), removed: false }
  return null
}
