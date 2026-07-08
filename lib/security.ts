// Comparación de secretos en tiempo constante. `===` cortocircuita en el
// primer byte distinto y filtra información de timing sobre el valor esperado
// (firmas HMAC, bearer tokens).
import { timingSafeEqual } from 'crypto'

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  // timingSafeEqual exige buffers del mismo largo; la longitud de la firma
  // esperada no es secreta, así que este early-return no filtra nada útil.
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
