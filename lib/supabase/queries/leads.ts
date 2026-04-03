// TODO: implement with Supabase client
import type { Lead } from '@/types'

export async function getLeads(_orgId: string): Promise<Lead[]> {
  return []
}

export async function getLeadStats(_orgId: string, _from: Date, _to: Date) {
  return []
}

export async function getAfterHoursStats(_orgId: string, _from: Date, _to: Date) {
  return 0
}
