// Novedades de Tourfy que ve cada agencia en el panel 🎁 (TopBar). La mas
// nueva va primero. Al sacar una funcion que el cliente nota, agregar la
// entrada en el mismo PR. `adminOnly`: solo la ven los admins (ej. Tours).
export interface ChangelogEntry {
  id: string
  date: string // ISO con hora: se compara contra users.changelog_seen_at
  href?: string
  adminOnly?: boolean
  es: { title: string; body: string }
  en: { title: string; body: string }
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: 'whatsapp-coexistence',
    date: '2026-10-09T22:00:00Z',
    href: '/settings/whatsapp',
    adminOnly: true,
    es: {
      title: 'Seguí usando WhatsApp en tu celular',
      body: 'Podés conectar el número que ya usás en la app WhatsApp Business sin dejarla. Lo que respondés desde el celular aparece en Tourfy y el bot se pausa en esa conversación.',
    },
    en: {
      title: 'Keep using WhatsApp on your phone',
      body: 'Connect the number you already use in the WhatsApp Business app without leaving it. What you reply from your phone shows up in Tourfy and the bot pauses in that conversation.',
    },
  },
  {
    id: 'mobile',
    date: '2026-10-09T18:00:00Z',
    href: '/conversations',
    es: {
      title: 'Tourfy en el celular',
      body: 'El panel ahora se adapta al teléfono: menú abajo, la lista de conversaciones a pantalla completa y el chat como en WhatsApp, con botón para volver.',
    },
    en: {
      title: 'Tourfy on your phone',
      body: 'The dashboard now fits your phone: menu at the bottom, the conversation list full screen and the chat like WhatsApp, with a back button.',
    },
  },
  {
    id: 'assign-agent',
    date: '2026-10-09T15:00:00Z',
    href: '/conversations',
    es: {
      title: 'Asignar conversaciones a tu equipo',
      body: 'En cada chat, "Asignar a…" pasa la conversación a otra persona del equipo. A quien se la asignan le llega un aviso en la app y un correo.',
    },
    en: {
      title: 'Assign conversations to your team',
      body: 'In each chat, "Assign to…" hands the conversation to someone else on the team. They get an in-app notification and an email.',
    },
  },
  {
    id: 'tours-review-first',
    date: '2026-10-08T22:50:00Z',
    href: '/tours',
    adminOnly: true,
    es: {
      title: 'Tours por revisar, arriba',
      body: 'Los tours sin precio, sin detalles o leídos con poca certeza aparecen primero con un aviso, hasta que los completes. Un tour sin precio el bot no lo puede cotizar.',
    },
    en: {
      title: 'Tours to review, on top',
      body: "Tours without a price, without details or read with low confidence show up first with a notice until you complete them. The bot can't quote a tour without a price.",
    },
  },
  {
    id: 'tours-reimport',
    date: '2026-10-08T22:40:00Z',
    href: '/tours',
    adminOnly: true,
    es: {
      title: 'Volver a importar tours',
      body: 'Si agregas un tour a tu web o cambias un precio, toca "Volver a importar" en Tours: traemos solo lo nuevo, sin duplicar, y nunca borramos nada.',
    },
    en: {
      title: 'Import tours again',
      body: 'If you add a tour to your website or change a price, tap "Import again" in Tours: we bring only what is new, without duplicates, and never delete anything.',
    },
  },
  {
    id: 'settings-tabs',
    date: '2026-10-07T23:00:00Z',
    href: '/settings',
    adminOnly: true,
    es: {
      title: 'Configuración ordenada en pestañas',
      body: 'General, WhatsApp, Correos y Facturación, cada una en su pestaña. En Facturación descargas tus facturas y cambias la tarjeta.',
    },
    en: {
      title: 'Settings organized in tabs',
      body: 'General, WhatsApp, Emails and Billing, each in its own tab. In Billing you download invoices and change your card.',
    },
  },
  {
    id: 'email-alerts',
    date: '2026-10-07T18:00:00Z',
    href: '/settings/emails',
    es: {
      title: 'Avisos por correo',
      body: 'Te escribimos si un cliente espera más de 5 minutos sin que nadie lo tome, si el bot no pudo responder, y cada mañana a las 8:00 un resumen del día anterior.',
    },
    en: {
      title: 'Email alerts',
      body: "We email you if a customer waits more than 5 minutes without anyone taking over, if the bot couldn't reply, and every morning at 8:00 with a summary of the day before.",
    },
  },
]

export function latestDate(entries: ChangelogEntry[]): string | null {
  return entries.reduce<string | null>((max, e) => (!max || e.date > max ? e.date : max), null)
}

const NEW_FOR_DAYS = 14

// Etiqueta "Nuevo" sobre la funcion misma durante sus primeras 2 semanas.
export function isNewFeature(id: string): boolean {
  const entry = CHANGELOG.find((e) => e.id === id)
  return !!entry && Date.now() - new Date(entry.date).getTime() < NEW_FOR_DAYS * 24 * 60 * 60 * 1000
}
