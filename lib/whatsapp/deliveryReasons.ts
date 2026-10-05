// Codigos de error de entrega de Meta → motivo legible (clave de i18n en
// dashboard.chat.delivery.reasons). Lo comparten la burbuja y los avisos.
export type DeliveryReason =
  | 'payment'
  | 'window'
  | 'marketingLimit'
  | 'notOnWhatsApp'
  | 'unsupported'
  | 'experiment'
  | 'unavailable'
  | 'generic'

export function deliveryReason(code: number | null | undefined): DeliveryReason {
  switch (code) {
    case 131042: return 'payment'          // sin metodo de pago en la WABA
    case 131047: return 'window'           // ventana de 24 h cerrada
    case 131049: return 'marketingLimit'   // Meta limita marketing a ese usuario
    case 131026: return 'notOnWhatsApp'    // numero sin WhatsApp o que nos bloqueo
    case 131051: return 'unsupported'
    case 130472: return 'experiment'       // experimento de Meta: no entrega marketing
    case 131016:
    case 131000: return 'unavailable'
    default: return 'generic'
  }
}
