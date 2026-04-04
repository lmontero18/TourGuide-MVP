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
