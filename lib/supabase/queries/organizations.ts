// TODO: implement with Supabase client
import type { Organization, OrgConfig } from '@/types'

export async function getOrg(_orgId: string): Promise<Organization | null> {
  return null
}

export async function updateOrgConfig(_orgId: string, _config: Partial<OrgConfig>): Promise<void> {
  // TODO: implement
}
