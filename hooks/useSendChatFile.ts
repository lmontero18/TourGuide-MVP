'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { outboundMediaSpec } from '@/lib/whatsapp/outboundMedia'

// Manda una foto o PDF al cliente (CODE-194) en tres pasos: URL firmada de
// subida (server), subida directa a Storage (sin pasar por Vercel, que corta
// en 4.5 MB) y envio por WhatsApp (server, que guarda el mensaje). El mensaje
// llega al chat por realtime. Devuelve true si se envio.
export function useSendChatFile(conversationId: string) {
  const t = useTranslations('dashboard.chat')

  return useCallback(
    async (file: File, caption: string): Promise<boolean> => {
      const spec = outboundMediaSpec(file.type)
      if (!spec) {
        toast.error(t('errors.fileType'))
        return false
      }
      if (file.size > spec.maxBytes) {
        toast.error(t('errors.fileTooLarge'))
        return false
      }
      try {
        const urlRes = await fetch(`/api/conversations/${conversationId}/media/upload-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mime: file.type, size: file.size }),
        })
        const upload = await urlRes.json()
        if (!urlRes.ok) throw new Error(upload.error ?? t('errors.upload'))

        const { error: uploadError } = await createClient()
          .storage.from('chat-media')
          .uploadToSignedUrl(upload.path, upload.token, file, { contentType: file.type })
        if (uploadError) throw new Error(t('errors.upload'))

        const res = await fetch(`/api/conversations/${conversationId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: upload.path, mime: file.type, filename: file.name, caption }),
        })
        const result = await res.json()
        if (res.status === 409 && result.code === 'window_closed') throw new Error(t('windowClosedToast'))
        if (!res.ok) throw new Error(result.error ?? t('errors.upload'))
        return true
      } catch (err) {
        toast.error(err instanceof Error && err.message ? err.message : t('errors.upload'))
        return false
      }
    },
    [conversationId, t]
  )
}
