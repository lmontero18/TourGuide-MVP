'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import type { PickupData } from '@/types'

async function fetchPickups(): Promise<PickupData> {
  const res = await fetch('/api/pickups')
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? '')
  return body as PickupData
}

// Recogidas de la org (flag `pickups`). `save` reemplaza todo y deja la cache
// igual a lo guardado.
export function usePickups(enabled: boolean) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: queryKeys.pickups, queryFn: fetchPickups, enabled })

  const save = useCallback(
    async (data: PickupData, keepalive = false): Promise<boolean> => {
      try {
        const res = await fetch('/api/pickups', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          keepalive,
        })
        if (res.ok) queryClient.setQueryData(queryKeys.pickups, data)
        return res.ok
      } catch {
        return false
      }
    },
    [queryClient]
  )

  return { ...query, save }
}
