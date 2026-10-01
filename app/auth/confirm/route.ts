import { NextResponse, type NextRequest } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

// `next` sale de los templates de correo de Supabase (invite / recovery →
// /set-password, ver supabase/templates). Solo rutas internas: un `next`
// absoluto o protocol-relative (//evil.com) seria un open redirect.
function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/confirmed'
  return next
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = safeNext(searchParams.get('next'))
  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // /login muestra ?error= tal cual en un toast: va el texto ya traducido.
  const t = await getTranslations('auth.errors')
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(t('linkExpired'))}`)
}
