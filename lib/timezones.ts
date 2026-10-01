// Zonas horarias que ofrece Configuracion (LATAM + algunas de referencia).
// La zona define el horario de atencion, la hora que ve el bot, las metricas
// de fuera de horario y el corte del mes del tier gratis de Meta.
export const TIMEZONES: { id: string; label: string }[] = [
  { id: 'America/Mexico_City', label: 'México (Ciudad de México)' },
  { id: 'America/Cancun', label: 'México (Cancún)' },
  { id: 'America/Guatemala', label: 'Guatemala' },
  { id: 'America/El_Salvador', label: 'El Salvador' },
  { id: 'America/Tegucigalpa', label: 'Honduras' },
  { id: 'America/Managua', label: 'Nicaragua' },
  { id: 'America/Costa_Rica', label: 'Costa Rica' },
  { id: 'America/Panama', label: 'Panamá' },
  { id: 'America/Havana', label: 'Cuba' },
  { id: 'America/Santo_Domingo', label: 'República Dominicana' },
  { id: 'America/Puerto_Rico', label: 'Puerto Rico' },
  { id: 'America/Bogota', label: 'Colombia' },
  { id: 'America/Guayaquil', label: 'Ecuador' },
  { id: 'America/Lima', label: 'Perú' },
  { id: 'America/Caracas', label: 'Venezuela' },
  { id: 'America/La_Paz', label: 'Bolivia' },
  { id: 'America/Santiago', label: 'Chile' },
  { id: 'America/Asuncion', label: 'Paraguay' },
  { id: 'America/Argentina/Buenos_Aires', label: 'Argentina' },
  { id: 'America/Montevideo', label: 'Uruguay' },
  { id: 'America/Sao_Paulo', label: 'Brasil (São Paulo)' },
  { id: 'America/New_York', label: 'EE.UU. (Este)' },
  { id: 'America/Los_Angeles', label: 'EE.UU. (Pacífico)' },
  { id: 'Europe/Madrid', label: 'España' },
]

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

// "UTC-6" segun la fecha actual (respeta horario de verano).
export function utcOffsetLabel(tz: string): string {
  try {
    const part = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value
    return part?.replace('GMT', 'UTC') || 'UTC'
  } catch {
    return 'UTC'
  }
}
