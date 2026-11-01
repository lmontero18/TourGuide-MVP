import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'
import { CLIENT_EVENTS } from '@/lib/usage/events'
import { usageRow } from '@/lib/usage/server'

const log = createLogger({ route: 'usage' })

const propValue = z.union([z.string().max(100), z.number(), z.boolean(), z.null(), z.array(z.string().max(60)).max(10)])

// Lote que manda el navegador (lib/usage/client.ts), tambien por sendBeacon al
// cerrar la pestaña: la sesion viaja en la cookie.
const bodySchema = z.object({
  events: z
    .array(
      z.object({
        event: z.enum(CLIENT_EVENTS),
        path: z.string().max(300).optional(),
        props: z.record(z.string().max(40), propValue).optional(),
      })
    )
    .min(1)
    .max(30),
})

// Uso del panel (pantallas, busquedas, filtros). Las acciones las registra
// cada route con trackUsage. Responde 204 siempre que haya sesion: el
// navegador no reintenta ni muestra nada.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse(null, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return new NextResponse(null, { status: 400 })

  const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).maybeSingle()
  if (!profile?.org_id) return new NextResponse(null, { status: 204 })

  const userAgent = request.headers.get('user-agent')
  const rows = parsed.data.events.map((e) =>
    usageRow({ orgId: profile.org_id!, userId: user.id, event: e.event, path: e.path, props: e.props, userAgent })
  )
  const service = await createServiceClient()
  const { error } = await service.from('usage_events').insert(rows)
  if (error) log.warn('usage batch insert failed', { error, org_id: profile.org_id, count: rows.length })
  return new NextResponse(null, { status: 204 })
}
