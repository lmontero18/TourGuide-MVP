'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import type { PickupData } from '@/types'
import type { PickupDraft } from '@/lib/pickups/parseSheet'

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

// Sube el Excel de recogidas y devuelve el borrador para revisar (no guarda).
export async function importPickupsFile(file: File): Promise<{ draft?: PickupDraft; error?: string }> {
  const form = new FormData()
  form.append('file', file)
  try {
    const res = await fetch('/api/pickups/import', { method: 'POST', body: form })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { error: body.error ?? '' }
    return { draft: body.draft as PickupDraft }
  } catch {
    return { error: '' }
  }
}
