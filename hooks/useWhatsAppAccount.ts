'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'

export interface ConnectedAccount {
  id: string
  waba_id: string
  phone_number: string
  status: string
  connected_at: string | null
  payment_failed_at: string | null
}

// Numero de WhatsApp conectado de la org. RLS (whatsapp_select_own) ya limita
// a la org del usuario: no hace falta buscar antes su org_id.
export function useWhatsAppAccount() {
  return useQuery({
    queryKey: queryKeys.whatsappAccount,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('whatsapp_accounts')
        .select('id, waba_id, phone_number, status, connected_at, payment_failed_at')
        .maybeSingle()
      if (error) throw error
      return (data as ConnectedAccount | null) ?? null
    },
  })
}
