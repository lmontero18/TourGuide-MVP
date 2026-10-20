import type { PickupData, Tour } from '@/types'
import { NO_PICKUP, fold, near, tokens } from './grid'

// Busca la hora de recogida para la tool `get_pickup_times` del bot. El cliente
// escribe el tour y el hotel como le salen ("canopy", "el arenal manoa"), asi
// que se busca por palabras, sin tildes y con alias. Ante la duda no se elige:
// se devuelven opciones y el bot pregunta o pasa con el equipo.

// Palabras que no ayudan a distinguir un hotel de otro.
const PLACE_WORDS = new Set(['hotel', 'hoteles', 'hostal', 'hostel', 'lodge', 'resort', 'inn', 'cabinas', 'cabanas', 'villas', 'suites', 'spa'])

function placeTokens(text: string) {
  return tokens(text).filter((w) => !PLACE_WORDS.has(w))
}

// Fraccion de las palabras de la consulta que aparecen en el nombre.
function score(query: string[], name: string[]) {
  if (query.length === 0 || name.length === 0) return 0
  const hits = query.filter((q) => name.some((n) => near(q, n))).length
  return hits / Math.max(query.length, Math.min(name.length, 3))
}

interface Candidate<T> {
  item: T
  names: string[]
}

// Mejor candidato o, si hay empate o nada convence, las opciones mas cercanas.
function best<T>(query: string, candidates: Candidate<T>[], toTokens: (text: string) => string[]) {
  const q = fold(query)
  const qTokens = toTokens(query)
  const scored = candidates
    .map((c) => {
      const s = Math.max(
        ...c.names.map((name) => {
          const n = fold(name)
          // Igual gana a todo; despues, nombre completo dentro de la consulta o
          // al reves ("Manoa" en "hotel manoa").
          if (n && n === q) return 2
          if (n && ((n.length >= 4 && q.includes(n)) || (q.length >= 4 && n.includes(q)))) return 1
          return score(qTokens, toTokens(name))
        })
      )
      return { item: c.item, s }
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)

  const top = scored[0]
  if (top && top.s >= 0.5 && scored[1]?.s !== top.s) return { match: top.item, options: [] as T[] }
  return { match: null, options: scored.slice(0, 5).map((x) => x.item) }
}

export type PickupValue = { departure: string; status: 'time'; time: string } | { departure: string; status: 'no_pickup' | 'pending' }

export interface ZoneHotels {
  zone: string
  hotels: string[]
}

export type PickupLookup =
  | { status: 'no_data' }
  | { status: 'hotels'; zones: ZoneHotels[] }
  | { status: 'hotel_ok'; hotel: string; zone: string }
  | { status: 'tour_not_found'; options: string[] }
  | { status: 'need_hotel'; tour: string }
  | { status: 'hotel_not_found'; tour: string | null; options: string[] }
  | { status: 'found'; tour: string; operator: string | null; hotel: string; zone: string; departures: PickupValue[]; hotels?: string[] }

// tour y hotel son opcionales: "¿en que hoteles recogen?" llega sin ninguno y
// devuelve la lista por zona; "¿recogen en el Manoa?" llega sin tour.
export function lookupPickup(data: PickupData, catalog: Tour[], tourQuery: string | null, hotelQuery: string | null): PickupLookup {
  const names = new Map(catalog.map((t) => [t.id, t.name]))
  const tours = data.tours.filter((t) => names.has(t.tour_id))
  if (tours.length === 0 || data.zones.length === 0) return { status: 'no_data' }

  const zoneById = new Map(data.zones.map((z) => [z.id, z]))
  const hotelsOf = (zoneId: string) => data.places.filter((p) => p.zone_id === zoneId).map((p) => p.name)

  // Hoteles y tambien zonas: el cliente puede decir "en Tamarindo" sin hotel.
  let place: { zoneId: string; placeId: string | null; name: string } | null = null
  if (hotelQuery?.trim()) {
    const candidates: Candidate<{ zoneId: string; placeId: string | null; name: string }>[] = [
      ...data.places
        .filter((p) => zoneById.has(p.zone_id))
        .map((p) => ({ item: { zoneId: p.zone_id, placeId: p.id, name: p.name }, names: [p.name, ...p.aliases] })),
      ...data.zones.map((z) => ({ item: { zoneId: z.id, placeId: null, name: z.name }, names: [z.name] })),
    ]
    const found = best(hotelQuery, candidates, placeTokens)
    if (!found.match) {
      return { status: 'hotel_not_found', tour: null, options: found.options.map((p) => p.name) }
    }
    place = found.match
  }

  if (!tourQuery?.trim()) {
    if (place?.placeId) return { status: 'hotel_ok', hotel: place.name, zone: zoneById.get(place.zoneId)!.name }
    const zones = place ? data.zones.filter((z) => z.id === place.zoneId) : data.zones
    return { status: 'hotels', zones: zones.map((z) => ({ zone: z.name, hotels: hotelsOf(z.id) })) }
  }

  const tour = best(tourQuery, tours.map((t) => ({ item: t, names: [names.get(t.tour_id)!] })), tokens)
  if (!tour.match) {
    // Sin parecidos: todos los tours con recogida, para que el bot reintente
    // con el nombre correcto ("el canopi" → "Canopy Arenal").
    const options = tour.options.length ? tour.options : tours
    return { status: 'tour_not_found', options: options.map((t) => names.get(t.tour_id)!) }
  }
  const pickupTour = tour.match
  const tourName = names.get(pickupTour.tour_id)!

  if (!place) return { status: 'need_hotel', tour: tourName }
  const { zoneId, placeId, name } = place

  const times = new Map(
    data.times
      .filter((x) => x.tour_id === pickupTour.tour_id && x.zone_id === zoneId)
      .map((x) => [`${x.departure}|${x.place_id ?? ''}`, x.pickup_time])
  )
  const departures = pickupTour.departures.map((label, i): PickupValue => {
    // La excepcion del hotel gana sobre la hora de su zona.
    const value = (placeId && times.get(`${i}|${placeId}`)) || times.get(`${i}|`)
    if (!value) return { departure: label, status: 'pending' }
    if (value === NO_PICKUP) return { departure: label, status: 'no_pickup' }
    return { departure: label, status: 'time', time: value }
  })

  return {
    status: 'found',
    tour: tourName,
    operator: pickupTour.operator,
    hotel: name,
    zone: zoneById.get(zoneId)!.name,
    departures,
    // Solo dijo la zona: la hora es la de la zona, pero algun hotel puede tener otra.
    ...(placeId ? {} : { hotels: hotelsOf(zoneId) }),
  }
}

// Lo que el bot tiene que hacer con cada resultado. Va en la respuesta de la
// tool para que no dependa de que el prompt lo recuerde.
export function pickupInstruction(result: PickupLookup): string {
  switch (result.status) {
    case 'no_data':
      return 'Esta agencia no tiene horas de recogida cargadas para ese tour. No inventes una hora: di que alguien del equipo le confirma la hora de recogida y usa transfer_to_human si el cliente la necesita ya.'
    case 'tour_not_found':
      return (
        `No se encontro el tour con certeza. Los tours con hora de recogida cargada (los mas parecidos primero) son: ${result.options.join(', ')}. ` +
        'Si el cliente se refiere a uno de ellos, vuelve a usar get_pickup_times con ese nombre exacto (si no esta claro cual, preguntale). ' +
        'Si es otro tour, no hay hora cargada: no inventes una, di que alguien del equipo le confirma la hora de recogida.'
      )
    case 'hotels':
      return (
        'Estas son las zonas y hoteles donde se recoge. No le pegues la lista completa al cliente: cuentale en que zonas recogen, ' +
        'menciona 2 o 3 hoteles de ejemplo si ayuda y preguntale en que hotel se hospeda. Si te lo dice, vuelve a usar get_pickup_times con ese hotel (y el tour si ya lo sabes). ' +
        'Si su hotel no aparece, no digas que no se recoge: di que el equipo le confirma.'
      )
    case 'hotel_ok':
      return 'Ese hotel esta en la lista de recogidas. Confirmale que lo recogen ahi. Para darle la hora necesitas el tour: si no lo sabes, preguntale cual tour quiere y vuelve a usar get_pickup_times con el tour y el hotel.'
    case 'need_hotel':
      return 'Pregunta al cliente en que hotel o zona se hospeda y vuelve a usar get_pickup_times con ese dato.'
    case 'hotel_not_found':
      return result.options.length
        ? `No se encontro el hotel con certeza. Pregunta al cliente si es alguno de estos: ${result.options.join(', ')}. Si no es ninguno, di que alguien del equipo le confirma la recogida y usa transfer_to_human.`
        : 'Ese hotel no esta en la lista de recogidas. No inventes una hora ni digas que no se recoge: di que alguien del equipo le confirma la recogida y usa transfer_to_human.'
    case 'found': {
      const any = result.departures.some((d) => d.status === 'time')
      const pending = result.departures.some((d) => d.status === 'pending')
      return (
        'Informa solo las horas de las salidas que le interesan al cliente, tal cual aparecen (son horas de recogida en el hotel). ' +
        (any ? '' : 'Ninguna salida tiene hora para ese hotel. ') +
        'Si una salida dice no_pickup, dile que en esa salida no se recoge en su hotel y ofrece otra salida que si tenga hora o pasarlo con el equipo. ' +
        (pending ? 'Si una salida dice pending, la hora no esta confirmada: no inventes una, di que el equipo se la confirma y usa transfer_to_human si la necesita. ' : '') +
        (result.hotels ? 'El cliente solo dijo la zona: la hora es la de la zona, pero preguntale el hotel para confirmarla. ' : '') +
        'Nunca des una hora que no este en esta respuesta.'
      )
    }
  }
}
