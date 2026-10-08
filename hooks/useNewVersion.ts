'use client'

import { useEffect, useRef } from 'react'

const CURRENT = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'
const POLL_MS = 5 * 60 * 1000

// Avisa cuando hay un deploy nuevo: revisa /api/version cada 5 min y al
// volver a la pestaña. En dev no hace nada (no hay commit).
export interface LatestChangelog {
  id: string
  adminOnly: boolean
  es: string
  en: string
}

export function useNewVersion(onNewVersion: (latest: LatestChangelog | null) => void) {
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
        const { version, latest } = (await res.json()) as { version?: string; latest?: LatestChangelog | null }
        if (version && version !== 'dev' && version !== CURRENT) {
          notified.current = true
          handler.current(latest ?? null)
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
