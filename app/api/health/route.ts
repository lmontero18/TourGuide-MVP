import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'

// Health check publico para uptime monitoring (BetterStack).
// Valida solo la DB con una query minima — no chequea N8N ni servicios
// externos para no acoplar la salud de la app a la de terceros.
// La respuesta nunca incluye mensajes de error internos ni versiones.

export const dynamic = 'force-dynamic'

const log = createLogger({ route: 'health' })

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .abortSignal(AbortSignal.timeout(5_000))

    if (error) {
      log.error('health check: db query failed', { error })
      return NextResponse.json(
        { status: 'error', checks: { db: 'error' } },
        { status: 503 }
      )
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    log.error('health check: unexpected failure', { error })
    return NextResponse.json(
      { status: 'error', checks: { db: 'error' } },
      { status: 503 }
    )
  }
}
