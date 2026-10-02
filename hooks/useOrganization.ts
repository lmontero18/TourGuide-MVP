'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import type { Organization } from '@/types'

async function fetchOrganization(): Promise<Organization> {
  const res = await fetch('/api/organizations')
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? '')
  return body.organization as Organization
}

// La org del usuario (tours, FAQs, configuracion). Compartida entre Tours y
// Configuracion: entrar a una despues de la otra no vuelve a esperar.
export function useOrganization() {
  return useQuery({ queryKey: queryKeys.organization, queryFn: fetchOrganization })
}
