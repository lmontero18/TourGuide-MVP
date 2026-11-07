// Fecha y hora en la zona horaria de una agencia, sin librerias. Lo usan los
// crons de resumenes (diario y mensual).

export function tzParts(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date)
  const v = (k: string) => Number(parts.find((x) => x.type === k)?.value)
  return { y: v('year'), m: v('month'), d: v('day'), h: v('hour'), min: v('minute'), s: v('second') }
}

// Medianoche (en UTC) del dia local y,m,d de la zona tz.
export function localMidnight(y: number, m: number, d: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d)
  const p2 = tzParts(new Date(guess), tz)
  const offset = Date.UTC(p2.y, p2.m - 1, p2.d, p2.h, p2.min, p2.s) - guess
  return new Date(guess - offset)
}
