import type { LeadDetails } from '@/types'
import { cleanText } from '@/lib/leads/emptyValue'

// Ficha del lead (la que arma la IA en lib/leads/extract.ts) pegada al system
// prompt en cada mensaje. La memoria del bot en N8N guarda pocos mensajes: en
// charlas largas perdia el hilo ("¿a cual tour te referis?" cuando el cliente
// decia "al que estabamos hablando"). Puede ir un poco atrasada: manda lo que
// el cliente diga ahora.
export interface LeadCard {
  tour_interest: string | null
  metadata: LeadDetails | null
}

const FIELDS: [keyof LeadDetails, string][] = [
  ['travel_date', 'Fecha'],
  ['group_size', 'Personas'],
  ['pickup', 'Hotel o zona'],
  ['quote', 'Precio que se le dio'],
  ['needs', 'Necesidades'],
]

export function leadContext(lead: LeadCard | null): string {
  if (!lead) return ''
  const lines = [
    cleanText(lead.tour_interest) ? `- Tour: ${cleanText(lead.tour_interest)}` : null,
    ...FIELDS.map(([key, label]) => {
      const value = cleanText(lead.metadata?.[key])
      return value ? `- ${label}: ${value.slice(0, 200)}` : null
    }),
  ].filter(Boolean)
  if (lines.length === 0) return ''
  return (
    `## LO QUE YA SABES DE ESTE CLIENTE\n` +
    `${lines.join('\n')}\n` +
    `Usalo para seguir el hilo y no volver a preguntar lo que ya dijo. Si dice "ese tour" o "el que estabamos hablando", ` +
    `es este (y usalo en get_pickup_times si aplica). Si lo que dice ahora cambia algo, manda lo nuevo.`
  )
}
