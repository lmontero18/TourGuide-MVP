import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
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

  // /login muestra ?error= tal cual en un toast: va el texto ya traducido.
  const t = await getTranslations('auth.errors')
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(t('callbackFailed'))}`)
}
