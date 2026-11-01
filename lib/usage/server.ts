import 'server-only'

import { after } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'
import { deviceFromUserAgent, normalizePath, type UsageEvent, type UsageProps } from '@/lib/usage/events'

const log = createLogger({ module: 'usage' })

interface TrackInput {
  orgId: string
  userId: string | null
  event: UsageEvent
  props?: UsageProps
  path?: string | null
  userAgent?: string | null
}

export function usageRow(input: TrackInput) {
  return {
    org_id: input.orgId,
    user_id: input.userId,
    event: input.event,
    path: input.path ? normalizePath(input.path) : null,
    device: input.userAgent === undefined ? null : deviceFromUserAgent(input.userAgent),
    props: input.props ?? {},
  }
}

// Registra una accion despues de responder (after): no suma latencia y si
// falla no rompe nada, solo queda en el log.
export function trackUsage(input: TrackInput) {
  after(async () => {
    const service = await createServiceClient()
    const { error } = await service.from('usage_events').insert(usageRow(input))
    if (error) log.warn('usage event insert failed', { error, org_id: input.orgId, event: input.event })
  })
}
