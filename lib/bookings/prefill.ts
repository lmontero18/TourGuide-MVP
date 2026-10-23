import type { PickupData, Tour } from '@/types'
import { best, lookupPickup } from '@/lib/pickups/lookup'
import { fold, tokens } from '@/lib/pickups/grid'
import { cleanText } from '@/lib/leads/emptyValue'

// Llena la reserva con lo que la IA saco del chat (ficha del lead). Todo es una
// sugerencia: el equipo revisa antes de guardar, asi que ante la duda se deja
// vacio en vez de adivinar.

const MONTHS: Record<string, number> = {
  enero: 1, ene: 1, january: 1, jan: 1,
  febrero: 2, feb: 2, february: 2,
  marzo: 3, mar: 3, march: 3,
  abril: 4, abr: 4, april: 4, apr: 4,
  mayo: 5, may: 5,
  junio: 6, jun: 6, june: 6,
  julio: 7, jul: 7, july: 7,
  agosto: 8, ago: 8, august: 8, aug: 8,
  septiembre: 9, setiembre: 9, sep: 9, sept: 9, set: 9, september: 9,
  octubre: 10, oct: 10, october: 10,
  noviembre: 11, nov: 11, november: 11,
  diciembre: 12, dic: 12, december: 12, dec: 12,
}

// Fecha local YYYY-MM-DD (sin pasar por UTC: a las 19:00 en Costa Rica
// toISOString ya da el dia siguiente).
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return isoDate(new Date(y, m - 1, d + days))
}

function build(year: number | null, month: number, day: number, today: Date): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  let y = year ?? today.getFullYear()
  if (y < 100) y += 2000
  const date = new Date(y, month - 1, day)
  if (date.getMonth() !== month - 1) return null // 31 de febrero
  // Sin año y ya paso: es del año que viene ("15 de enero" dicho en octubre).
  if (year === null && isoDate(date) < isoDate(today)) date.setFullYear(y + 1)
  return isoDate(date)
}

// "sábado 14 de noviembre", "15 al 18 de marzo", "Nov 14", "14/11", "2026-11-14",
// "mañana". Un rango devuelve el primer dia. null si no hay una fecha concreta
// ("fechas flexibles en diciembre").
export function parseTravelDate(text: string | null | undefined, today = new Date()): string | null {
  if (!text) return null
  const s = fold(text)

  if (/\b(manana|tomorrow)\b/.test(s)) return addDays(isoDate(today), 1)
  if (/\b(hoy|today)\b/.test(s)) return isoDate(today)

  const iso = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/.exec(s)
  if (iso) return build(Number(iso[1]), Number(iso[2]), Number(iso[3]), today)

  const numeric = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(s)
  if (numeric) return build(numeric[3] ? Number(numeric[3]) : null, Number(numeric[2]), Number(numeric[1]), today)

  const year = /\b(20\d{2})\b/.exec(s)
  const y = year ? Number(year[1]) : null
  // Dia antes del mes: "14 de noviembre", "15 al 18 de marzo" (gana el 15).
  const dayFirst = /\b(\d{1,2})(?:\s*(?:al|a|-|to|y|and)\s*\d{1,2})?\s*(?:de\s+|of\s+)?([a-z]+)/g
  for (const m of s.matchAll(dayFirst)) {
    const month = MONTHS[m[2]]
    if (month) return build(y, month, Number(m[1]), today)
  }
  // Mes antes del dia: "Nov 14", "november 14th".
  const monthFirst = /\b([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/g
  for (const m of s.matchAll(monthFirst)) {
    const month = MONTHS[m[1]]
    if (month) return build(y, month, Number(m[2]), today)
  }
  return null
}

// "2 adultos + 2 niños (8 y 10)" → 4, "grupo de 12" → 12, "pareja" → 2.
export function parsePax(text: string | null | undefined): number | null {
  if (!text) return null
  // Lo que va entre parentesis son edades, no personas.
  const s = fold(text).replace(/\([^)]*\)/g, ' ')
  // "4 personas, 2 niños": el total ya viene dicho.
  const total = /\b(\d{1,3})\s*(?:personas|people|persons|pax)\b/.exec(s)
  if (total) return Number(total[1]) || null
  const numbers = [...s.matchAll(/\b(\d{1,3})\b/g)].map((m) => Number(m[1])).filter((n) => n > 0)
  if (numbers.length > 0) {
    const total = numbers.reduce((a, b) => a + b, 0)
    return total <= 500 ? total : null
  }
  if (/\b(pareja|couple|dos|two)\b/.test(s)) return 2
  if (/\b(solo|sola|alone|una persona|one person)\b/.test(s)) return 1
  return null
}

// Tour del catalogo que mas se parece a lo que pidio el cliente.
export function matchTour(text: string | null | undefined, catalog: Tour[]): Tour | null {
  if (!text?.trim()) return null
  return best(text, catalog.map((tour) => ({ item: tour, names: [tour.name] })), tokens).match
}

// Salidas del tour segun la tabla de Recogidas ("7:30", "Tarde").
export function departuresOf(pickups: PickupData | undefined, tourId: string | null): string[] {
  if (!pickups || !tourId) return []
  return pickups.tours.find((t) => t.tour_id === tourId)?.departures ?? []
}

// Hora de recogida para el tour, el hotel y la salida, con la misma busqueda que
// usa el bot. null si no hay hora cargada (queda "por confirmar").
export function pickupTimeFor(
  pickups: PickupData | undefined,
  catalog: Tour[],
  tourName: string,
  place: string | null,
  departure: string | null
): string | null {
  if (!pickups || !place?.trim() || !tourName.trim()) return null
  const result = lookupPickup(pickups, catalog, tourName, place)
  if (result.status !== 'found') return null
  const values = departure ? result.departures.filter((d) => d.departure === departure) : result.departures
  // Sin salida elegida solo se sugiere si el tour tiene una sola.
  if (!departure && values.length !== 1) return null
  const value = values[0]
  return value?.status === 'time' ? value.time : null
}

interface LeadLike {
  tour_interest: string | null
  metadata: { travel_date?: string | null; group_size?: string | null; pickup?: string | null } | null
}

// Reserva nueva a partir de la ficha del lead. La hora de recogida no va aca:
// el formulario la calcula con la salida que elija el equipo.
export function prefillFromLead(lead: LeadLike, catalog: Tour[], today = new Date()) {
  // cleanText: la IA a veces guarda "null" o "N/A" como texto.
  const interest = cleanText(lead.tour_interest)
  const tour = matchTour(interest, catalog)
  return {
    tour_id: tour?.id ?? null,
    // Si no esta en el catalogo queda lo que pidio el cliente, para corregir.
    tour_name: tour?.name ?? interest ?? '',
    date: parseTravelDate(cleanText(lead.metadata?.travel_date), today) ?? '',
    departure: null,
    pax: parsePax(cleanText(lead.metadata?.group_size)),
    place: cleanText(lead.metadata?.pickup),
    pickup_time: null,
    notes: null,
  }
}
