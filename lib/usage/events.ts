// Uso del panel (tabla usage_events): que pantallas ven y que acciones hacen.
// Pure: lo usan el navegador (lib/usage/client.ts) y el server
// (lib/usage/server.ts, /api/usage).
//
// Nunca va contenido de conversaciones ni datos de turistas: solo el nombre
// del evento, la ruta con los ids reemplazados y props chicas.

// Lo que manda el navegador por /api/usage. Las acciones (tomar control,
// mover un lead, mandar un mensaje...) las registra el server en su route.
export const CLIENT_EVENTS = [
  'page_view',
  'session_start',
  'inbox_search',
  'inbox_filter',
  'metrics_tab',
  'changelog_open',
  'lead_panel_toggle',
] as const

export const SERVER_EVENTS = [
  'conversation_take',
  'conversation_return',
  'conversation_resolve',
  'conversation_reopen',
  'conversation_assign',
  'lead_stage',
  'lead_amount',
  'lead_edit',
  'message_sent',
  'template_sent',
  'knowledge_saved',
  'settings_saved',
  'logo_uploaded',
  'logo_removed',
  'feedback_sent',
] as const

export type ClientUsageEvent = (typeof CLIENT_EVENTS)[number]
export type UsageEvent = ClientUsageEvent | (typeof SERVER_EVENTS)[number]
export type UsageProps = Record<string, string | number | boolean | string[] | null>

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

// "/conversations/9e84…" → "/conversations/:id": agrupa pantallas y no guarda ids.
export function normalizePath(path: string): string {
  return path.split('?')[0].replace(UUID, ':id').slice(0, 200)
}

export function deviceFromUserAgent(ua: string | null | undefined): 'mobile' | 'desktop' {
  return /Mobi|Android|iPhone|iPad/i.test(ua ?? '') ? 'mobile' : 'desktop'
}
