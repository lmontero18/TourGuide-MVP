'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User as AppUser } from '@/types'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface AuthState {
  user: SupabaseUser | null
  profile: AppUser | null
  loading: boolean
  orgId: string | null
  role: AppUser['role'] | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    orgId: null,
    role: null,
  })
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('id, org_id, email, full_name, role, created_at, updated_at')
          .eq('id', user.id)
          .single()

        setState({
          user,
          profile: profile as AppUser | null,
          loading: false,
          orgId: profile?.org_id ?? null,
          role: profile?.role ?? null,
        })
      } else {
        setState({ user: null, profile: null, loading: false, orgId: null, role: null })
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('id, org_id, email, full_name, role, created_at, updated_at')
            .eq('id', session.user.id)
            .single()

          setState({
            user: session.user,
            profile: profile as AppUser | null,
            loading: false,
            orgId: profile?.org_id ?? null,
            role: profile?.role ?? null,
          })
        } else {
          setState({ user: null, profile: null, loading: false, orgId: null, role: null })
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return state
}
