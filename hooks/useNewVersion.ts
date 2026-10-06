'use client'

import { useEffect, useRef } from 'react'

const CURRENT = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'
const POLL_MS = 5 * 60 * 1000

// Avisa cuando hay un deploy nuevo: revisa /api/version cada 5 min y al
// volver a la pestaña. En dev no hace nada (no hay commit).
export function useNewVersion(onNewVersion: () => void) {
  const notified = useRef(false)
  const handler = useRef(onNewVersion)
  useEffect(() => {
    handler.current = onNewVersion
  })

  useEffect(() => {
    if (CURRENT === 'dev') return
    const check = async () => {
      if (notified.current || document.visibilityState !== 'visible') return
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) return
        const { version } = (await res.json()) as { version?: string }
        if (version && version !== 'dev' && version !== CURRENT) {
          notified.current = true
          handler.current()
        }
      } catch {
        // Sin red: se reintenta en el proximo ciclo.
      }
    }
    const id = setInterval(check, POLL_MS)
    const onVisible = () => void check()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
}
