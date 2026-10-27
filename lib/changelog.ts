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
    id: 'sale-confetti',
    date: '2026-10-27T21:00:00Z',
    href: '/leads',
    es: {
      title: 'Cada venta se celebra 🎉',
      body: 'Cuando marcas una oportunidad como Reservado, Tourfy lo celebra con confeti. Marca cada venta con su monto: así ves cuánto vende tu equipo por WhatsApp.',
    },
    en: {
      title: 'Every sale gets celebrated 🎉',
      body: 'When you mark an opportunity as Booked, Tourfy celebrates with confetti. Mark every sale with its amount so you can see how much your team sells on WhatsApp.',
    },
  },
  {
    id: 'inbox-v2',
    date: '2026-10-27T04:00:00Z',
    href: '/conversations',
    es: {
      title: 'Nueva bandeja: ves quién espera respuesta',
      body: 'La pestaña "Por responder" junta a los clientes que esperan al equipo, con cuánto llevan esperando. Cada chat muestra el tour, la etapa y un resumen de qué está pasando.',
    },
    en: {
      title: 'New inbox: see who is waiting for an answer',
      body: 'The "To answer" tab gathers the clients waiting for your team and how long they have waited. Each chat shows the tour, the stage and a summary of what is going on.',
    },
  },
  {
    id: 'lead-panel',
    date: '2026-10-27T04:00:00Z',
    href: '/conversations',
    es: {
      title: 'La ficha del cliente, siempre a la vista',
      body: 'Al lado del chat ves la ficha del cliente: etapa, monto, fecha, grupo, precio cotizado con el total y el próximo paso. Todo se edita con un clic.',
    },
    en: {
      title: 'The customer card, always in view',
      body: 'Next to the chat you see the customer card: stage, amount, date, group, quoted price with the total and the next step. Click anything to edit it.',
    },
  },
  {
    id: 'dark-mode',
    date: '2026-10-27T04:00:00Z',
    href: '/conversations',
    es: {
      title: 'Modo oscuro',
      body: 'Con el botón de la luna, arriba a la derecha, cambias Tourfy a oscuro. Se recuerda en este navegador.',
    },
    en: {
      title: 'Dark mode',
      body: 'Use the moon button at the top right to switch Tourfy to dark. Your choice is remembered in this browser.',
    },
  },
  {
    id: 'agent-knowledge',
    date: '2026-10-27T04:00:00Z',
    href: '/tours',
    es: {
      title: 'Todo el equipo puede editar tours y preguntas',
      body: 'Los agentes ahora entran a Tours y preguntas para corregir precios, tours y respuestas del bot. Cada sección y cada tour muestra quién lo modificó por última vez.',
    },
    en: {
      title: 'Your whole team can edit tours and FAQs',
      body: 'Agents can now open Tours and FAQs to fix prices, tours and bot answers. Each section and tour shows who edited it last.',
    },
  },
  {
    id: 'pickups',
    date: '2026-10-22T16:00:00Z',
    href: '/tours',
    adminOnly: true,
    es: {
      title: 'Horas de recogida en el bot',
      body: 'En Tours › Recogidas cargas a qué hora pasas por cada zona u hotel en cada tour, o importas tu tabla. El bot le dice al cliente a qué hora lo recogen y en qué hoteles recogen.',
    },
    en: {
      title: 'Pickup times in the bot',
      body: 'In Tours › Pickups you set what time you pick up at each zone or hotel for each tour, or import your table. The bot tells the client their pickup time and which hotels you pick up from.',
    },
  },
  {
    id: 'lead-sale-amount',
    date: '2026-10-19T22:30:00Z',
    href: '/leads',
    es: {
      title: 'Ve cuánto vendiste con Tourfy',
      body: 'Al marcar una oportunidad como Reservado te preguntamos el monto, ya llenado con lo que se cotizó en el chat. Así la tarjeta de Ingresos muestra lo que vendiste este mes.',
    },
    en: {
      title: 'See how much you sold with Tourfy',
      body: 'When you mark an opportunity as Booked we ask for the amount, prefilled with what was quoted in the chat. That way the Revenue card shows what you sold this month.',
    },
  },
  {
    id: 'chat-day-dividers',
    date: '2026-10-19T15:00:00Z',
    href: '/conversations',
    es: {
      title: 'Ves en qué día llegó cada mensaje',
      body: 'En las conversaciones largas, el chat separa los mensajes por día: "Hoy", "Ayer" o la fecha, como en WhatsApp.',
    },
    en: {
      title: 'See which day each message arrived',
      body: 'In long conversations, the chat splits messages by day: "Today", "Yesterday" or the date, like WhatsApp.',
    },
  },
  {
    id: 'team-general-alerts',
    date: '2026-10-15T02:10:00Z',
    href: '/settings/notifications',
    adminOnly: true,
    es: {
      title: 'Elegí quién recibe los avisos generales',
      body: 'En Configuración → Avisos del equipo decidís quién recibe el aviso y el correo cuando el bot pide que alguien atienda a un cliente. Quien lo tenga apagado igual recibe lo suyo: las conversaciones que le asignan y los mensajes de sus clientes.',
    },
    en: {
      title: 'Choose who gets general alerts',
      body: 'In Settings → Team notifications you decide who gets the alert and email when the bot asks for someone to help a customer. People with it off still get their own: conversations assigned to them and messages from their customers.',
    },
  },
  {
    id: 'chat-attachments',
    date: '2026-10-14T22:50:00Z',
    href: '/conversations',
    es: {
      title: 'Mandá fotos y PDFs desde el chat',
      body: 'Con el clip 📎 (o arrastrando o pegando) podés mandarle al cliente varias fotos o PDFs a la vez: itinerarios, fotos del tour, comprobantes.',
    },
    en: {
      title: 'Send photos and PDFs from the chat',
      body: 'With the 📎 clip (or by dragging or pasting) you can send the customer several photos or PDFs at once: itineraries, tour photos, receipts.',
    },
  },
  {
    id: 'reactions-emoji',
    date: '2026-10-14T22:30:00Z',
    href: '/conversations',
    es: {
      title: 'Ves con qué emoji reaccionó el cliente',
      body: 'Cuando un cliente reacciona a un mensaje en WhatsApp, en el chat ves el emoji (👍, ❤️, 😮…) en vez de "(reaction)".',
    },
    en: {
      title: 'See which emoji the customer reacted with',
      body: 'When a customer reacts to a message on WhatsApp, the chat shows the emoji (👍, ❤️, 😮…) instead of "(reaction)".',
    },
  },
  {
    id: 'chat-input-grows',
    date: '2026-10-14T22:15:00Z',
    href: '/conversations',
    es: {
      title: 'Más espacio para escribir',
      body: 'El cuadro de respuesta del chat ahora crece mientras escribís, para que puedas ver y revisar mensajes largos antes de enviarlos.',
    },
    en: {
      title: 'More room to write',
      body: 'The chat reply box now grows as you type, so you can see and review long messages before sending them.',
    },
  },
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
