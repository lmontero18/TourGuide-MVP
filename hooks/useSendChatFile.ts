'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

// Manda fotos/PDFs al cliente (CODE-194) en dos pasos para poder subir varios
// en paralelo y enviarlos en orden:
//   upload(file) → URL firmada (server) + subida directa a Storage (sin pasar
//                  por Vercel, que corta en 4.5 MB). Devuelve el path.
//   send(path)   → envio por WhatsApp (server, que guarda el mensaje; llega
//                  al chat por realtime).
// Los dos tiran Error con el texto para el toast.
export function useSendChatFile(conversationId: string) {
  const t = useTranslations('dashboard.chat')

  const upload = useCallback(
    async (file: File): Promise<string> => {
      const urlRes = await fetch(`/api/conversations/${conversationId}/media/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mime: file.type, size: file.size }),
      })
      const upload = await urlRes.json().catch(() => ({}))
      if (!urlRes.ok) throw new Error(upload.error ?? t('errors.upload'))

      const { error } = await createClient()
        .storage.from('chat-media')
        .uploadToSignedUrl(upload.path, upload.token, file, { contentType: file.type })
      if (error) throw new Error(t('errors.upload'))
      return upload.path as string
    },
    [conversationId, t]
  )

  const send = useCallback(
    async (path: string, file: File, caption: string): Promise<void> => {
      const res = await fetch(`/api/conversations/${conversationId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, mime: file.type, filename: file.name, caption }),
      })
      const result = await res.json().catch(() => ({}))
      if (res.status === 409 && result.code === 'window_closed') throw new Error(t('windowClosedToast'))
      if (!res.ok) throw new Error(result.error ?? t('errors.upload'))
    },
    [conversationId, t]
  )

  return { upload, send }
}
