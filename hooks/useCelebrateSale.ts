'use client'

import { useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { hasFeature } from '@/lib/features'
import { celebrateSale } from '@/lib/celebrate'

// Confeti al pasar un lead a Reservado, si la org tiene el flag celebrations.
export function useCelebrateSale() {
  const { featureFlags } = useAuth()
  return useCallback(() => {
    if (hasFeature(featureFlags, 'celebrations')) void celebrateSale()
  }, [featureFlags])
}
