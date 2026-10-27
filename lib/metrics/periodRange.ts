import type { MetricsPeriod } from '@/types'

const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90 } as const

// Rango [from, to) de un periodo de Metricas. El mes calendario se corta en la
// hora local de quien mira (get_org_metrics_month lo hace en la zona de la
// agencia; para estas vistas la diferencia de unas horas no cambia la foto).
export function periodRange(period: MetricsPeriod): { from: Date; to: Date } {
  if (period.startsWith('month:')) {
    const [y, m] = period.slice(6).split('-').map(Number)
    return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) }
  }
  const to = new Date()
  const days = PERIOD_DAYS[period as keyof typeof PERIOD_DAYS] ?? 7
  return { from: new Date(to.getTime() - days * 86_400_000), to }
}
