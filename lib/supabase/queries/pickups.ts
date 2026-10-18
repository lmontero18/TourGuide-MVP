import { createClient } from '@/lib/supabase/server'
import type { PickupData, PickupPlace, PickupTime, PickupTour, PickupZone } from '@/types'

// Recogidas de la org del usuario (RLS: solo lee la suya).
export async function getPickups(): Promise<PickupData> {
  const supabase = await createClient()

  const [zones, places, tours, times] = await Promise.all([
    supabase.from('pickup_zones').select('id, name, sort').order('sort'),
    supabase.from('pickup_places').select('id, zone_id, name, aliases').order('name'),
    supabase.from('pickup_tours').select('tour_id, departures, operator, sort').order('sort'),
    supabase.from('pickup_times').select('tour_id, departure, zone_id, place_id, pickup_time'),
  ])

  const error = zones.error ?? places.error ?? tours.error ?? times.error
  if (error) throw error

  return {
    zones: (zones.data ?? []) as PickupZone[],
    places: (places.data ?? []) as PickupPlace[],
    tours: (tours.data ?? []) as PickupTour[],
    times: (times.data ?? []) as PickupTime[],
  }
}

// Reemplaza todas las recogidas de la org en una transaccion (save_pickups).
// La funcion corre con RLS: solo un admin puede guardar.
export async function savePickups(data: PickupData) {
  const supabase = await createClient()

  const { error } = await supabase.rpc('save_pickups', {
    p_zones: data.zones,
    p_places: data.places,
    p_tours: data.tours,
    p_times: data.times,
  })

  if (error) throw error
}
