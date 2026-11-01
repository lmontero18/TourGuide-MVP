'use client'

import type { ClientUsageEvent, UsageProps } from '@/lib/usage/events'

// Cola de eventos de uso del navegador. Se manda en lotes a /api/usage cada
// FLUSH_MS y al ocultar la pestaña (sendBeacon, que sobrevive al cierre).
// Nunca tira: medir no puede romper el panel.
const FLUSH_MS = 10_000
const MAX_BATCH = 30

type Queued = { event: ClientUsageEvent; path: string; props?: UsageProps }

const queue: Queued[] = []
let timer: ReturnType<typeof setTimeout> | null = null
let listening = false

export function track(event: ClientUsageEvent, props?: UsageProps) {
  if (typeof window === 'undefined') return
  queue.push({ event, path: window.location.pathname, props })
  if (!listening) {
    listening = true
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush(true)
    })
  }
  if (queue.length >= MAX_BATCH) flush()
  else if (!timer) timer = setTimeout(() => flush(), FLUSH_MS)
}

function flush(beacon = false) {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (!queue.length) return
  const body = JSON.stringify({ events: queue.splice(0, MAX_BATCH) })
  try {
    if (beacon && navigator.sendBeacon?.('/api/usage', new Blob([body], { type: 'application/json' }))) return
    fetch('/api/usage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
  } catch {
    // sin red o sin sendBeacon: se pierde el lote, no pasa nada
  }
  if (queue.length) timer = setTimeout(() => flush(), FLUSH_MS)
}
