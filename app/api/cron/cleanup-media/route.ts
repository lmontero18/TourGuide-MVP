import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Limpieza diaria de media de chat (Vercel Cron, ver vercel.json).
// Borra del bucket chat-media los archivos con mas de RETENTION_DAYS y pone
// media_url = null en los mensajes afectados. La descripcion de texto del
// mensaje se conserva siempre — es lo que usa el bot y pesa nada.
const RETENTION_DAYS = 90
const BATCH_SIZE = 200
// Tope de batches por corrida — el cron es diario, un backlog mayor se
// termina de drenar en corridas siguientes.
const MAX_BATCHES = 50

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  // Vercel Cron manda Authorization: Bearer ${CRON_SECRET}
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  let deleted = 0

  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const { data: expired, error } = await supabase
      .from('messages')
      .select('id, media_url')
      .not('media_url', 'is', null)
      .lt('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE)

    if (error) {
      console.error('cleanup-media query failed:', error.message)
      return NextResponse.json({ error: error.message, deleted }, { status: 500 })
    }

    if (!expired || expired.length === 0) break

    const paths = expired.map((m) => m.media_url as string)

    // Primero nullificar media_url y despues borrar del bucket: si el borrado
    // falla queda un archivo huerfano (invisible, se loggea abajo), pero nunca
    // un mensaje apuntando a media ya borrada (imagen rota en el dashboard).
    const { error: updateError } = await supabase
      .from('messages')
      .update({ media_url: null })
      .in('id', expired.map((m) => m.id))

    if (updateError) {
      console.error('cleanup-media null-out failed:', updateError.message)
      return NextResponse.json({ error: updateError.message, deleted }, { status: 500 })
    }

    // Borrar via API de Storage (no tocar storage.objects directo — deja
    // archivos huerfanos en S3).
    const { error: removeError } = await supabase.storage.from('chat-media').remove(paths)
    if (removeError) {
      console.error(
        `cleanup-media storage remove failed (${paths.length} archivos huerfanos):`,
        removeError.message,
        paths
      )
      return NextResponse.json({ error: removeError.message, deleted }, { status: 500 })
    }

    deleted += paths.length
    if (expired.length < BATCH_SIZE) break
  }

  return NextResponse.json({ deleted })
}
