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

// Cifras en grilla de 2 columnas: 4 en una sola fila quedaban apretadas en
// el celular. Cada celda es el td (no un div adentro) para que las de una
// misma fila midan lo mismo.
export function kpis(items: { value: string; label: string }[]) {
  const cell = (k: { value: string; label: string }) =>
    `<td width="50%" valign="middle" style="background:${SOFT};border:1px solid ${LINE};border-radius:10px;padding:12px 8px;text-align:center">
        <div style="font-size:24px;line-height:1.2;font-weight:800;color:${NAVY}">${esc(k.value)}</div>
        <div style="margin-top:2px;font-size:12px;line-height:1.35;color:${MUTED}">${esc(k.label)}</div></td>`
  const rows: string[] = []
  for (let i = 0; i < items.length; i += 2) {
    const pair = items.slice(i, i + 2)
    rows.push(`<tr>${pair.map(cell).join('')}${pair.length === 1 ? '<td width="50%"></td>' : ''}</tr>`)
  }
  return `<table role="presentation" width="100%" cellspacing="8" cellpadding="0" style="margin:0 0 6px;border-collapse:separate">${rows.join('')}</table>`
}

export function layout(input: { title: string; body: string; cta?: { label: string; url: string }; footer?: string }) {
  const cta = input.cta
    ? `<a href="${esc(input.cta.url)}" style="display:inline-block;background:${NAVY};color:#ffffff;font-weight:700;font-size:14px;border-radius:10px;padding:11px 18px;text-decoration:none">${esc(input.cta.label)}</a>`
    : ''
  // color-scheme "light": pide a los clientes que respetan la meta (Apple Mail,
  // Outlook) no invertir los colores en modo oscuro; la cabecera navy y las
  // cifras se ven como fueron diseñadas.
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head><body style="margin:0;background:#f5f6fa;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px">
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
