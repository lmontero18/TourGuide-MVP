// Plantilla HTML de los correos de Tourfy (misma estetica que la maqueta):
// cabecera navy con el logo, cuerpo blanco, boton y pie. Estilos inline
// porque los clientes de correo ignoran <style>.

const NAVY = '#0d1b34'
const MUTED = '#5a6680'
const LINE = '#e5e8ef'
const SOFT = '#f5f7fb'

export function esc(s: string | number | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const p = (text: string) => `<p style="margin:0 0 14px;color:${MUTED};font-size:14px;line-height:1.55">${text}</p>`

export function box(title: string, lines: string[]) {
  return `<div style="background:${SOFT};border:1px solid ${LINE};border-radius:10px;padding:12px 14px;margin:0 0 14px">
    <div style="font-weight:700;color:${NAVY};font-size:13px;margin-bottom:4px">${title}</div>
    ${lines.map((l) => `<div style="color:${MUTED};font-size:13px;line-height:1.5">${l}</div>`).join('')}
  </div>`
}

export function kpis(items: { value: string; label: string }[]) {
  const cells = items
    .map(
      (k) => `<td style="padding:4px"><div style="background:${SOFT};border:1px solid ${LINE};border-radius:10px;padding:10px 6px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:${NAVY}">${esc(k.value)}</div>
        <div style="font-size:11px;color:${MUTED}">${esc(k.label)}</div></div></td>`
    )
    .join('')
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 14px"><tr>${cells}</tr></table>`
}

export function layout(input: { title: string; body: string; cta?: { label: string; url: string }; footer?: string }) {
  const cta = input.cta
    ? `<a href="${esc(input.cta.url)}" style="display:inline-block;background:${NAVY};color:#ffffff;font-weight:700;font-size:14px;border-radius:10px;padding:11px 18px;text-decoration:none">${esc(input.cta.label)}</a>`
    : ''
  return `<!doctype html><html><body style="margin:0;background:#f5f6fa;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid ${LINE};border-radius:14px;overflow:hidden">
      <tr><td style="background:${NAVY};padding:16px 22px;color:#ffffff;font-size:16px;font-weight:800">Tourfy</td></tr>
      <tr><td style="padding:22px">
        <h1 style="margin:0 0 12px;font-size:19px;color:${NAVY}">${input.title}</h1>
        ${input.body}
        ${cta}
      </td></tr>
      <tr><td style="border-top:1px solid ${LINE};padding:14px 22px;font-size:12px;color:${MUTED}">${
        input.footer ?? 'Recibes este correo porque tu agencia usa Tourfy.'
      }</td></tr>
    </table>
  </td></tr></table></body></html>`
}

// Version de texto plano: el mismo contenido sin HTML (fallback de clientes).
export function toText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h1|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
