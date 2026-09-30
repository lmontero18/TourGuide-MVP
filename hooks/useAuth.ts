'use client'

import { useContext } from 'react'
import { AuthContext, type AuthState } from '@/components/providers/AuthProvider'

// Lee sesion + perfil del AuthProvider (montado en app/layout.tsx). No hace
// requests: todos los componentes comparten el mismo estado.
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
