const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0'

interface WhatsAppApiResponse {
  messaging_product: string
  contacts?: { wa_id: string }[]
  messages?: { id: string }[]
}

async function callGraphApi(
  phoneNumberId: string,
  accessToken: string,
  body: Record<string, unknown>
): Promise<WhatsAppApiResponse> {
  const res = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`)
  }

  return res.json()
}

export async function sendTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  body: string
) {
  return callGraphApi(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body },
  })
}

export interface WhatsAppButton {
  id: string
  title: string
}

export async function sendButtonMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  body: string,
  buttons: WhatsAppButton[]
) {
  return callGraphApi(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  })
}

export async function sendTemplateMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  languageCode: string,
  params: string[]
) {
  return callGraphApi(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: params.length > 0
        ? [
            {
              type: 'body',
              parameters: params.map((p) => ({ type: 'text', text: p })),
            },
          ]
        : undefined,
    },
  })
}

export async function sendMediaMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  type: 'image' | 'document' | 'video',
  url: string,
  caption?: string
) {
  return callGraphApi(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    to,
    type,
    [type]: {
      link: url,
      ...(caption && { caption }),
    },
  })
}

// Registra el numero en la Cloud API (requerido para numeros nuevos onboarded por
// Embedded Signup antes de poder enviar/recibir). Establece el PIN de two-step.
// Idempotente: si el numero ya esta registrado, Meta devuelve un error que ignoramos.
export async function registerPhoneNumber(
  phoneNumberId: string,
  accessToken: string,
  pin: string
) {
  const res = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/register`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', pin }),
  })

  if (res.ok) return

  const error = (await res.json().catch(() => ({}))) as {
    error?: { code?: number; error_subcode?: number; message?: string }
  }

  // "already registered" → no-op. Meta usa code 100 / subcode 2388004 (o mensajes con
  // "already registered"). Cualquier otro error si se propaga.
  const subcode = error.error?.error_subcode
  const message = error.error?.message ?? ''
  if (subcode === 2388004 || /already\s+registered/i.test(message)) return

  throw new Error(`WhatsApp register error: ${JSON.stringify(error)}`)
}

export async function markAsRead(
  phoneNumberId: string,
  accessToken: string,
  messageId: string
) {
  const res = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`)
  }
}
