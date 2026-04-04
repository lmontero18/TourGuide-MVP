import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if user has an org to decide where to send them
      let next = '/conversations'
      if (data.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('org_id')
          .eq('id', data.user.id)
          .single()

        if (!profile?.org_id) {
          next = '/onboarding'
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
