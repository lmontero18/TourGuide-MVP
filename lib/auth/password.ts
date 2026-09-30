import { z } from 'zod'

// Reglas de contraseña compartidas por signup y /set-password (invitados y
// recuperacion). 72 = limite de bcrypt en GoTrue.
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be 72 characters or less')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
