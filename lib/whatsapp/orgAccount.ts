import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

// WABA y numero conectados de una org (whatsapp_accounts es admin-only por
// RLS: quien llama tiene que usar el service client si no es admin).
export async function getOrgWhatsApp(supabase: SupabaseClient, orgId: string) {
  const { data } = await supabase
    .from('whatsapp_accounts')
    .select('waba_id, phone_number_id')
    .eq('org_id', orgId)
    .maybeSingle()
  return data as { waba_id: string; phone_number_id: string } | null
}
