import type { BusinessHours, WeeklyBusinessHours } from '@/types'

export const DEFAULT_RANGE: BusinessHours = { start: '09:00', end: '18:00' }
export const DEFAULT_TIMEZONE = 'America/Lima'

/**
 * Normaliza business_hours al formato semanal (weekdays/weekend). El formato
 * viejo (un solo rango) se trata como "el mismo horario todos los dias" —
 * preserva el comportamiento actual de orgs que no resavearon todavia, en
 * vez de asumir el finde cerrado (que seria un cambio de comportamiento
 * silencioso).
 */
export function normalizeBusinessHours(
  raw: BusinessHours | WeeklyBusinessHours | null | undefined,
): WeeklyBusinessHours {
  if (!raw) return { weekdays: DEFAULT_RANGE, weekend: DEFAULT_RANGE }
  if ('weekdays' in raw) return raw
  return { weekdays: raw, weekend: raw }
}

const DAYS_ES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const DAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

// "09:00" -> "9:00", como se dice en una charla.
const spoken = (hhmm: string) => hhmm.replace(/^0(\d)/, '$1')

/**
 * Si la agencia esta abierta ahora y, si no, cuando abre. Va al system prompt
 * en cada mensaje para que el bot diga cuando le contestan al pasar con el
 * equipo. Antes lo calculaba el modelo con el horario y la hora: gpt-5-mini
 * (con razonamiento) lo hacia bien, gpt-5.4-mini (sin razonamiento, nov 2026)
 * decia "en breve" un sabado con la agencia cerrada. Calcularlo aca no depende
 * del modelo.
 */
export function handoffTimeNote(
  raw: BusinessHours | WeeklyBusinessHours | null | undefined,
  timezone: string,
  now: Date = new Date(),
): string {
  const hours = normalizeBusinessHours(raw)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const today = DAY_INDEX[get('weekday')] ?? 0
  const time = `${get('hour')}:${get('minute')}`
  const rangeFor = (day: number) => (day === 0 || day === 6 ? hours.weekend : hours.weekdays)

  const todayRange = rangeFor(today)
  if (todayRange && time >= todayRange.start && time < todayRange.end) {
    return (
      `Ahora la agencia esta ABIERTA. Si pasas al cliente con el equipo, ` +
      `dile que le contestan en breve.`
    )
  }

  let when: string | null = null
  let start = ''
  if (todayRange && time < todayRange.start) {
    when = 'hoy'
    start = todayRange.start
  } else {
    for (let i = 1; i <= 7; i++) {
      const range = rangeFor((today + i) % 7)
      if (range) {
        when = i === 1 ? 'mañana' : `el ${DAYS_ES[(today + i) % 7]}`
        start = range.start
        break
      }
    }
  }
  if (!when) return 'Ahora la agencia esta CERRADA. Si pasas al cliente con el equipo, NO digas "en breve".'
  return (
    `Ahora la agencia esta CERRADA y abre ${when} a las ${spoken(start)}. ` +
    `Si pasas al cliente con el equipo, NO digas "en breve": dile que le contestan ${when} desde las ${spoken(start)}.`
  )
}

/**
 * Texto legible del horario para el prompt del bot.
 */
export function describeBusinessHours(hours: WeeklyBusinessHours): string {
  const weekdays = `Lunes a viernes: ${hours.weekdays.start} a ${hours.weekdays.end}.`
  const weekend = hours.weekend
    ? `Sabado y domingo: ${hours.weekend.start} a ${hours.weekend.end}.`
    : `Sabado y domingo: cerrado.`
  return `${weekdays} ${weekend}`
}
