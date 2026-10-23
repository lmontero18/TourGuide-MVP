'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import type { Booking } from '@/types'

export interface BookingWithLead extends Booking {
  lead: { conversation_id: string | null; contact: { name: string | null; phone: string } | null } | null
}

export type BookingInput = Pick<Booking, 'tour_id' | 'tour_name' | 'date' | 'departure' | 'pax' | 'place' | 'pickup_time' | 'notes'>

type MutationResult = { ok: true } | { ok: false; error: string }

const BOOKING_SELECT =
  'id, org_id, lead_id, tour_id, tour_name, date, departure, pax, place, pickup_time, notes, created_at, updated_at, lead:leads(conversation_id, contact:contacts(name, phone))'

// "7:05" < "13:30" como hora, no como texto. Sin hora van al final.
function minutes(time: string | null) {
  if (!time) return Number.POSITIVE_INFINITY
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Orden de la ruta del dia: por hora de recogida, despues por tour.
export function sortBookings(list: BookingWithLead[]) {
  return [...list].sort(
    (a, b) => minutes(a.pickup_time) - minutes(b.pickup_time) || a.tour_name.localeCompare(b.tour_name)
  )
}

// Reservas entre dos fechas (YYYY-MM-DD, inclusive): la pantalla Reservas pide
// la semana del dia elegido y filtra el dia en el cliente.
export function useBookingsRange(from: string, to: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.bookingsRange(from, to),
    enabled,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('bookings')
        .select(BOOKING_SELECT)
        .gte('date', from)
        .lte('date', to)
        .order('date')
        .limit(2000)
      if (error) throw error
      return (data ?? []) as unknown as BookingWithLead[]
    },
  })
}

// Reservas de un lead (ficha), de la mas proxima a la mas lejana.
export function useLeadBookings(leadId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.leadBookings(leadId),
    enabled,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('bookings')
        .select(BOOKING_SELECT)
        .eq('lead_id', leadId)
        .order('date')
      if (error) throw error
      return (data ?? []) as unknown as BookingWithLead[]
    },
  })
}

async function send(url: string, method: string, body?: unknown): Promise<MutationResult> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.ok) return { ok: true }
    const json = await res.json().catch(() => ({}))
    return { ok: false, error: json.error ?? '' }
  } catch {
    return { ok: false, error: '' }
  }
}

// Crear, corregir y borrar. La ficha y la pantalla Reservas comparten datos:
// cada cambio refresca las dos.
export function useBookingMutations() {
  const queryClient = useQueryClient()
  const done = useCallback(
    (res: MutationResult) => {
      if (res.ok) void queryClient.invalidateQueries({ queryKey: ['bookings'] })
      return res
    },
    [queryClient]
  )

  const create = useCallback(
    async (leadId: string, input: BookingInput) => done(await send('/api/bookings', 'POST', { ...input, lead_id: leadId })),
    [done]
  )
  const update = useCallback(
    async (id: string, input: Partial<BookingInput>) => done(await send(`/api/bookings/${id}`, 'PATCH', input)),
    [done]
  )
  const remove = useCallback(async (id: string) => done(await send(`/api/bookings/${id}`, 'DELETE')), [done])

  return { create, update, remove }
}
