import type { PickupData, PickupTime } from '@/types'

// Valor de una celda que dice explicitamente "no recoge". Sin valor = sin cargar.
export const NO_PICKUP = 'none'

// Clave de una hora en la tabla: tour + salida + zona (+ hotel si es excepcion).
export function timeKey(tourId: string, departure: number, zoneId: string, placeId: string | null = null) {
  return `${tourId}|${departure}|${zoneId}|${placeId ?? ''}`
}

export function indexTimes(times: PickupTime[]) {
  return new Map(times.map((x) => [timeKey(x.tour_id, x.departure, x.zone_id, x.place_id), x.pickup_time]))
}

// "07:05", "7.05", "705" → "7:05". null = no es una hora.
export function normalizeTime(raw: string): string | null {
  const text = raw.trim().replace(/\s+/g, '').replace('.', ':').replace('h', ':')
  const match = /^(\d{1,2}):?(\d{2})$/.exec(text)
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return null
  return `${h}:${String(m).padStart(2, '0')}`
}

// Pone una hora o NO_PICKUP; null la borra (queda sin cargar).
export function setTime(data: PickupData, tourId: string, departure: number, zoneId: string, placeId: string | null, time: string | null): PickupData {
  const key = timeKey(tourId, departure, zoneId, placeId)
  const times = data.times.filter((x) => timeKey(x.tour_id, x.departure, x.zone_id, x.place_id) !== key)
  if (time) times.push({ tour_id: tourId, departure, zone_id: zoneId, place_id: placeId, pickup_time: time })
  return { ...data, times }
}

// Sin tilde ni mayusculas, para buscar hoteles y zonas.
export function fold(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}
