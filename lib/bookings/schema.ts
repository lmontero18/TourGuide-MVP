import { z } from 'zod'

// Campos de una reserva que manda el panel. Los mismos limites que la tabla
// (migracion 20261022010000_bookings.sql).
const text = (max: number) => z.string().trim().max(max).nullable().transform((v) => v || null)

export const bookingFields = z.object({
  tour_id: z.string().min(1).max(64).nullable(),
  tour_name: z.string().trim().min(1).max(200),
  date: z.iso.date(),
  departure: text(40),
  pax: z.number().int().min(1).max(500).nullable(),
  place: text(200),
  pickup_time: z
    .string()
    .trim()
    .regex(/^([01]?\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .or(z.literal('').transform(() => null)),
  notes: text(500),
})

export const createBookingSchema = bookingFields.extend({ lead_id: z.uuid() })
export const updateBookingSchema = bookingFields.partial().refine((v) => Object.keys(v).length > 0)
