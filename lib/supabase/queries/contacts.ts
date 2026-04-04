import { createClient } from '@/lib/supabase/server'
import type { Contact } from '@/types'

export async function getContact(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contacts')
    .select('id, org_id, phone, name, channel, custom_attributes, last_seen_at, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Contact
}

export async function upsertContact(orgId: string, phone: string, name?: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contacts')
    .upsert(
      {
        org_id: orgId,
        phone,
        ...(name && { name }),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,phone' }
    )
    .select('id, org_id, phone, name, channel, custom_attributes, last_seen_at, created_at, updated_at')
    .single()

  if (error) throw error
  return data as Contact
}
