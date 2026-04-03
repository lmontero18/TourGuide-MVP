// TODO: install @supabase/supabase-js @supabase/ssr
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function createMiddlewareClient(req: NextRequest) {
  const response = NextResponse.next()
  return {
    supabase: null as unknown,
    response,
  }
}
