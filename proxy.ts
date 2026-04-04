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

  const protectedPaths = ['/conversations', '/metrics', '/settings', '/dashboard']
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))

  // Redirect unauthenticated users from protected routes to login
  if (!user && isProtected) {
    return redirectWithCookies(new URL('/login', request.url), response)
  }

  if (user) {
    // Check if user has an org
    const { data: profile } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    const hasOrg = !!profile?.org_id

    // User without org trying to access dashboard → onboarding
    if (!hasOrg && isProtected) {
      return redirectWithCookies(new URL('/onboarding', request.url), response)
    }

    // User with org trying to access login → dashboard
    if (hasOrg && request.nextUrl.pathname === '/login') {
      return redirectWithCookies(new URL('/conversations', request.url), response)
    }

    // User with org trying to access onboarding → dashboard
    if (hasOrg && request.nextUrl.pathname === '/onboarding') {
      return redirectWithCookies(new URL('/conversations', request.url), response)
    }
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register', '/onboarding', '/conversations/:path*', '/metrics/:path*', '/settings/:path*'],
}
