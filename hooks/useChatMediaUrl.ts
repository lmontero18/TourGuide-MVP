'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const SIGNED_URL_TTL_SECONDS = 3600
// Re-firmar antes de que expire la URL de 1h — si la conversacion queda
// abierta mas tiempo, el <img> apuntaria a una URL vencida hasta el remount.
const REFRESH_INTERVAL_MS = 50 * 60 * 1000

// Resuelve el path de messages.media_url (bucket privado chat-media) a una
// signed URL de 1 hora. RLS de storage limita la lectura a la org del usuario.
export function useChatMediaUrl(path: string | null | undefined) {
  const [signed, setSigned] = useState<{ path: string; url: string } | null>(null)

  useEffect(() => {
    if (!path) return

    const supabase = createClient()
    let cancelled = false

    const sign = () => {
      supabase.storage
        .from('chat-media')
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
        .then(({ data, error }) => {
          if (error) console.error('Error signing media URL:', error)
          if (!cancelled && data) setSigned({ path, url: data.signedUrl })
        })
    }

    sign()
    const interval = setInterval(sign, REFRESH_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [path])

  // Devuelve la URL solo si corresponde al path actual — sin resets sincronos.
  return path && signed?.path === path ? signed.url : null
}
