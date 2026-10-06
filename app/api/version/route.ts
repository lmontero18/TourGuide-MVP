import { NextResponse } from 'next/server'

// Version desplegada ahora mismo (commit de Vercel). El cliente la compara con
// la que trae embebida para avisar que hay una version nueva. Sin cache.
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(
    { version: process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev' },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}
