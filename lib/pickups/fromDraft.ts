import type { PickupData, Tour } from '@/types'
import type { DraftColumn, PickupDraft, SlotKind } from './parseSheet'
import { fold } from './grid'

const STOPWORDS = new Set(['tour', 'tours', 'de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'a', 'al', 'desde', 'the', 'and', 'to', 'of', 'from', 'con', 'with'])

function tokens(text: string) {
  return fold(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
}

// "perezosos" ~ "perezoso": uno empieza con el otro (palabras de 5+ letras,
// para que "cano" no calce con "canopy").
function near(a: string, b: string) {
  return a === b || (Math.min(a.length, b.length) >= 5 && (a.startsWith(b) || b.startsWith(a)))
}

export type MatchQuality = 'exact' | 'partial'

export interface ColumnMatch {
  tourId: string | null
  quality: MatchQuality | null
}

// Sugiere a que tour corresponde cada columna del Excel. Cada tour se usa una
// sola vez (la tabla tiene una columna por tour); gana la columna que mejor
// coincide. Lo dudoso queda marcado para que la agencia lo revise.
export function suggestMatches(columns: DraftColumn[], tours: Tour[]): Record<string, ColumnMatch> {
  const tourTokens = tours.filter((t) => t.name.trim()).map((tour) => ({ id: tour.id, words: tokens(tour.name) }))
  const candidates: { column: string; tourId: string; score: number; tourCover: number }[] = []
  for (const column of columns) {
    const words = tokens(column.label)
    if (!words.length) continue
    for (const tour of tourTokens) {
      const hits = words.filter((w) => tour.words.some((tw) => near(w, tw))).length
      if (!hits) continue
      candidates.push({ column: column.key, tourId: tour.id, score: hits / words.length, tourCover: hits / Math.max(tour.words.length, 1) })
    }
  }

  // Solo se sugiere si la mayoria de las palabras de la columna calzan. Es
  // "exacto" si ademas cubre al menos la mitad del nombre del tour; si no, va
  // marcado para revisar ("PUENTES" ~ "Puentes Colgantes y Catarata").
  const result: Record<string, ColumnMatch> = Object.fromEntries(columns.map((c) => [c.key, { tourId: null, quality: null }]))
  const usedTours = new Set<string>()
  for (const c of candidates.sort((a, b) => b.score - a.score || b.tourCover - a.tourCover)) {
    if (c.score <= 0.5 || usedTours.has(c.tourId) || result[c.column].tourId) continue
    usedTours.add(c.tourId)
    result[c.column] = { tourId: c.tourId, quality: c.score === 1 && c.tourCover >= 0.5 ? 'exact' : 'partial' }
  }
  return result
}

// Arma la tabla de recogidas con lo que la agencia confirmo en la revision.
export function draftToPickups(
  draft: PickupDraft,
  mapping: Record<string, string | null>,
  zoneNames: Record<string, string>,
  slotLabel: (kind: SlotKind | null, index: number, count: number) => string
): PickupData {
  const columns = draft.columns.filter((c) => mapping[c.key])
  const data: PickupData = { zones: [], places: [], tours: [], times: [] }

  columns.forEach((column, i) => {
    data.tours.push({
      tour_id: mapping[column.key]!,
      departures: labelSlots(column.slots, slotLabel),
      operator: column.operator,
      sort: i,
    })
  })

  draft.zones.forEach((zone, i) => {
    const zoneId = crypto.randomUUID()
    data.zones.push({ id: zoneId, name: zoneNames[zone.key]?.trim() || zone.hotels[0].name, sort: i })
    for (const column of columns) {
      const tourId = mapping[column.key]!
      ;(zone.times[column.key] ?? []).forEach((time, departure) => {
        if (time && departure < column.slots.length) {
          data.times.push({ tour_id: tourId, departure, zone_id: zoneId, place_id: null, pickup_time: time })
        }
      })
    }
    for (const hotel of zone.hotels) {
      const placeId = crypto.randomUUID()
      data.places.push({ id: placeId, zone_id: zoneId, name: hotel.name, aliases: [] })
      for (const column of columns) {
        const tourId = mapping[column.key]!
        ;(hotel.own[column.key] ?? []).forEach((time, departure) => {
          if (time && departure < column.slots.length) {
            data.times.push({ tour_id: tourId, departure, zone_id: zoneId, place_id: placeId, pickup_time: time })
          }
        })
      }
    }
  })

  return data
}

// "Mañana", "Tarde"; si se repiten, "Mañana 1", "Mañana 2".
function labelSlots(slots: (SlotKind | null)[], slotLabel: (kind: SlotKind | null, index: number, count: number) => string) {
  const totals = new Map<SlotKind | null, number>()
  for (const s of slots) totals.set(s, (totals.get(s) ?? 0) + 1)
  const seen = new Map<SlotKind | null, number>()
  return slots.map((s) => {
    const n = (seen.get(s) ?? 0) + 1
    seen.set(s, n)
    return slotLabel(s, n, totals.get(s) ?? 1)
  })
}
