// Archivos que un agente puede mandar desde el chat (CODE-194). Pure: lo usa
// el input del chat (accept, validacion antes de subir) y los routes.
// Limites de Meta: imagen 5 MB (solo jpeg/png), documento 100 MB; el bucket
// chat-media corta en 16 MB.
export type OutboundMediaKind = 'image' | 'document'

export const OUTBOUND_MEDIA: Record<string, { kind: OutboundMediaKind; ext: string; maxBytes: number }> = {
  'image/jpeg': { kind: 'image', ext: 'jpg', maxBytes: 5 * 1024 * 1024 },
  'image/png': { kind: 'image', ext: 'png', maxBytes: 5 * 1024 * 1024 },
  'application/pdf': { kind: 'document', ext: 'pdf', maxBytes: 16 * 1024 * 1024 },
}

export const OUTBOUND_ACCEPT = Object.keys(OUTBOUND_MEDIA).join(',')

export function outboundMediaSpec(mime: string) {
  return OUTBOUND_MEDIA[mime] ?? null
}

// Contenido que se guarda en messages.content. Imagen sin texto = marcador
// "[image]" (el chat muestra solo la foto); documento = "[Documento: x.pdf]"
// como los entrantes, con el texto del agente en la linea siguiente.
export function outboundMediaContent(kind: OutboundMediaKind, filename: string, caption: string): string {
  if (kind === 'image') return caption || '[image]'
  const doc = `[Documento: ${filename}]`
  return caption ? `${doc}\n${caption}` : doc
}

// Para el chat: separa "[Documento: x.pdf]\ntexto" en nombre y texto.
export function parseDocumentContent(content: string): { filename: string; caption: string } | null {
  const m = /^\[Documento: ([^\]\n]+)\](?:\n([\s\S]*))?$/.exec(content)
  return m ? { filename: m[1], caption: m[2] ?? '' } : null
}
