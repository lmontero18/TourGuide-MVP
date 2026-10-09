import { NextResponse } from 'next/server'
import { CHANGELOG } from '@/lib/changelog'

// Version desplegada ahora mismo (commit de Vercel). El cliente la compara con
// la que trae embebida para avisar que hay una version nueva. Tambien manda la
// ultima novedad: el cliente viejo no la conoce y la nombra en el aviso. Sin cache.
export const dynamic = 'force-dynamic'

export function GET() {
  const latest = CHANGELOG[0]
  return NextResponse.json(
    {
      version: process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev',
      latest: latest
        ? { id: latest.id, adminOnly: !!latest.adminOnly, es: latest.es.title, en: latest.en.title }
        : null,
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}
