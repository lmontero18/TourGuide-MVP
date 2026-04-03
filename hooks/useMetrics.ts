// TODO: implement with Supabase queries
export interface MetricsData {
  totalLeads: number
  qualifiedLeads: number
  bookedLeads: number
  afterHoursCount: number
  estimatedRevenue: number
}

export function useMetrics(_orgId: string, _from: Date, _to: Date): MetricsData {
  return {
    totalLeads: 0,
    qualifiedLeads: 0,
    bookedLeads: 0,
    afterHoursCount: 0,
    estimatedRevenue: 0,
  }
}
