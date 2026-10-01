import 'server-only'

// Plantillas de mensaje de WhatsApp (CODE-174). Viven en el WABA de cada
// agencia: Meta es la fuente de verdad (tambien se pueden editar desde el
// WhatsApp Manager), asi que se leen siempre de la Graph API, sin copia local.
//
// Variables con nombre ({{nombre}}): parameter_format NAMED. Meta exige un
// ejemplo por variable al crear, y revisa cada plantilla (hasta 24 h).

const GRAPH = 'https://graph.facebook.com/v21.0'

export type TemplateCategory = 'UTILITY' | 'MARKETING'

import type { TemplateButton, WhatsAppTemplate } from '@/types'

export type { TemplateButton, WhatsAppTemplate }

export interface CreateTemplateInput {
  name: string
  category: TemplateCategory
  language: string
  header?: string
  body: string
  footer?: string
  buttons?: TemplateButton[]
  // Ejemplo por variable: { nombre: 'Ana', tour: 'Isletas' }
  examples: Record<string, string>
}

export class GraphError extends Error {
  constructor(message: string, public status: number, public detail?: string) {
    super(message)
  }
}

export function extractVariables(text: string): string[] {
  const found = [...text.matchAll(/\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g)].map((m) => m[1])
  return [...new Set(found)]
}

async function graph<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GRAPH}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init?.headers },
    signal: AbortSignal.timeout(15_000),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = (body as { error?: { message?: string; error_user_msg?: string } }).error
    throw new GraphError(err?.error_user_msg || err?.message || 'Graph API error', res.status, JSON.stringify(err ?? body))
  }
  return body as T
}

interface GraphComponent {
  type: string
  format?: string
  text?: string
  buttons?: { type: string; text: string; url?: string }[]
}

interface GraphTemplate {
  id: string
  name: string
  status: string
  category: string
  language: string
  rejected_reason?: string
  components?: GraphComponent[]
}

function normalize(t: GraphTemplate): WhatsAppTemplate {
  const comp = (type: string) => t.components?.find((c) => c.type === type)
  const header = comp('HEADER')?.format === 'TEXT' ? comp('HEADER')?.text ?? null : null
  const body = comp('BODY')?.text ?? ''
  return {
    id: t.id,
    name: t.name,
    status: t.status,
    category: t.category,
    language: t.language,
    rejected_reason: t.rejected_reason && t.rejected_reason !== 'NONE' ? t.rejected_reason : undefined,
    header,
    body,
    footer: comp('FOOTER')?.text ?? null,
    buttons: (comp('BUTTONS')?.buttons ?? [])
      .filter((b) => b.type === 'QUICK_REPLY' || b.type === 'URL')
      .map((b) => ({ type: b.type as TemplateButton['type'], text: b.text, url: b.url })),
    variables: extractVariables(`${header ?? ''} ${body}`),
  }
}

export async function listTemplates(wabaId: string, token: string): Promise<WhatsAppTemplate[]> {
  const res = await graph<{ data: GraphTemplate[] }>(
    `/${wabaId}/message_templates?fields=id,name,status,category,language,rejected_reason,components&limit=200`,
    token
  )
  return (res.data ?? []).map(normalize)
}

export async function createTemplate(wabaId: string, token: string, input: CreateTemplateInput) {
  const components: Record<string, unknown>[] = []
  if (input.header?.trim()) {
    const headerVars = extractVariables(input.header)
    components.push({
      type: 'HEADER',
      format: 'TEXT',
      text: input.header.trim(),
      ...(headerVars.length
        ? { example: { header_text_named_params: headerVars.map((v) => ({ param_name: v, example: input.examples[v] ?? v })) } }
        : {}),
    })
  }
  const bodyVars = extractVariables(input.body)
  components.push({
    type: 'BODY',
    text: input.body.trim(),
    ...(bodyVars.length
      ? { example: { body_text_named_params: bodyVars.map((v) => ({ param_name: v, example: input.examples[v] ?? v })) } }
      : {}),
  })
  if (input.footer?.trim()) components.push({ type: 'FOOTER', text: input.footer.trim() })
  if (input.buttons?.length) {
    components.push({
      type: 'BUTTONS',
      buttons: input.buttons.map((b) => (b.type === 'URL' ? { type: 'URL', text: b.text, url: b.url } : { type: 'QUICK_REPLY', text: b.text })),
    })
  }

  return graph<{ id: string; status: string; category: string }>(`/${wabaId}/message_templates`, token, {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      language: input.language,
      category: input.category,
      parameter_format: 'NAMED',
      components,
    }),
  })
}

export async function deleteTemplate(wabaId: string, token: string, name: string) {
  return graph<{ success: boolean }>(`/${wabaId}/message_templates?name=${encodeURIComponent(name)}`, token, {
    method: 'DELETE',
  })
}

// Texto final que ve el cliente (para guardarlo como mensaje en el chat).
export function renderTemplate(t: WhatsAppTemplate, values: Record<string, string>): string {
  const fill = (s: string) => s.replace(/\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g, (_, v: string) => values[v] ?? `{{${v}}}`)
  return [t.header ? `*${fill(t.header)}*` : null, fill(t.body), t.footer].filter(Boolean).join('\n\n')
}

export async function sendTemplate(
  phoneNumberId: string,
  token: string,
  to: string,
  t: WhatsAppTemplate,
  values: Record<string, string>
) {
  const param = (v: string) => ({ type: 'text', parameter_name: v, text: values[v] ?? '' })
  const headerVars = t.header ? extractVariables(t.header) : []
  const bodyVars = extractVariables(t.body)
  const components: Record<string, unknown>[] = []
  if (headerVars.length) components.push({ type: 'header', parameters: headerVars.map(param) })
  if (bodyVars.length) components.push({ type: 'body', parameters: bodyVars.map(param) })

  return graph<{ messages?: { id: string }[] }>(`/${phoneNumberId}/messages`, token, {
    method: 'POST',
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: { name: t.name, language: { code: t.language }, ...(components.length ? { components } : {}) },
    }),
  })
}
