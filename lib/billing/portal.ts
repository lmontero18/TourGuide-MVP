// Portal de clientes de Stripe (cuenta NOMADAI LLC / Tourfy). Es un link
// publico y unico para todos los clientes: Stripe identifica a cada uno por el
// correo con el que pago y le manda un codigo de verificacion.
export const STRIPE_PORTAL_URL = 'https://billing.stripe.com/p/login/eVq6oG7Upbw42red8a3ks00'

export function billingPortalUrl(email?: string | null): string {
  if (!email) return STRIPE_PORTAL_URL
  return `${STRIPE_PORTAL_URL}?prefilled_email=${encodeURIComponent(email)}`
}
