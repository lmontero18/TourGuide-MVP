import 'server-only'

// Envio de correos transaccionales por la API de Resend (mismo dominio que
// el SMTP de Supabase Auth: no-reply@tourfy.app). Sin RESEND_API_KEY no
// manda nada y devuelve false: quien llama decide el fallback.
export async function sendEmail(input: { to: string; subject: string; text: string; replyTo?: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) return false
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Tourfy <no-reply@tourfy.app>',
      to: [input.to],
      subject: input.subject,
      text: input.text,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  })
  return res.ok
}
