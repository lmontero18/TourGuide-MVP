import { createMiddlewareClient } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function redirectWithCookies(url: URL, response: NextResponse) {
  const redirect = NextResponse.redirect(url)
  // Copy refreshed auth cookies to the redirect response
  response.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value)
  })
  return redirect
}

export async function proxy(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)

  const { data: { user } } = await supabase.auth.getUser()

  const protectedPaths = ['/conversations', '/metrics', '/settings', '/dashboard', '/onboarding']
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))

  // Redirect unauthenticated users from protected routes to login
  if (!user && isProtected) {
    return redirectWithCookies(new URL('/login', request.url), response)
  }

  if (user) {
    // Check if the user's org has completed onboarding
    const { data: profile } = await supabase
      .from('users')
      .select('org_id, organizations(onboarded_at)')
      .eq('id', user.id)
      .maybeSingle()

    const orgData = profile?.organizations as unknown as { onboarded_at: string | null } | { onboarded_at: string | null }[] | null
    const org = Array.isArray(orgData) ? orgData[0] : orgData
    const isOnboarded = !!org?.onboarded_at

    // Not onboarded → force onboarding (sin redirigir si ya está ahí — loop)
    if (!isOnboarded && isProtected && request.nextUrl.pathname !== '/onboarding') {
      return redirectWithCookies(new URL('/onboarding', request.url), response)
    }

    // Onboarded → keep out of auth / onboarding pages
    if (isOnboarded && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
      return redirectWithCookies(new URL('/conversations', request.url), response)
    }

    if (isOnboarded && request.nextUrl.pathname === '/onboarding') {
      return redirectWithCookies(new URL('/conversations', request.url), response)
    }
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register', '/onboarding', '/conversations/:path*', '/metrics/:path*', '/settings/:path*'],
}
