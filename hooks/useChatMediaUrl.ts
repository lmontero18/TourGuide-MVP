'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Resuelve el path de messages.media_url (bucket privado chat-media) a una
// signed URL de 1 hora. RLS de storage limita la lectura a la org del usuario.
export function useChatMediaUrl(path: string | null | undefined) {
  const [signed, setSigned] = useState<{ path: string; url: string } | null>(null)

  useEffect(() => {
    if (!path) return

    const supabase = createClient()
    let cancelled = false

    supabase.storage
      .from('chat-media')
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (error) console.error('Error signing media URL:', error)
        if (!cancelled && data) setSigned({ path, url: data.signedUrl })
      })

    return () => {
      cancelled = true
    }
  }, [path])

  // Devuelve la URL solo si corresponde al path actual — sin resets sincronos.
  return path && signed?.path === path ? signed.url : null
}
