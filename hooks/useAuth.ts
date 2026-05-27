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
  onboardedAt: string | null
}

const EMPTY: AuthState = {
  user: null,
  profile: null,
  loading: false,
  orgId: null,
  role: null,
  onboardedAt: null,
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ ...EMPTY, loading: true })
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false

    async function loadProfile(user: SupabaseUser) {
      const { data } = await supabase
        .from('users')
        .select('id, org_id, email, full_name, role, created_at, updated_at, organizations(onboarded_at)')
        .eq('id', user.id)
        .single()

      if (cancelled) return

      const orgData = data?.organizations as unknown as
        | { onboarded_at: string | null }
        | { onboarded_at: string | null }[]
        | null
      const org = Array.isArray(orgData) ? orgData[0] : orgData

      setState({
        user,
        profile: (data as unknown as AppUser) ?? null,
        loading: false,
        orgId: data?.org_id ?? null,
        role: data?.role ?? null,
        onboardedAt: org?.onboarded_at ?? null,
      })
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return
      if (user) loadProfile(user)
      else setState(EMPTY)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      if (session?.user) loadProfile(session.user)
      else setState(EMPTY)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  return state
}
