// TODO: implement with Supabase auth
import type { Role } from '@/types'

export interface AuthState {
  userId: string | null
  orgId: string | null
  role: Role | null
  isLoading: boolean
}

export function useAuth(): AuthState {
  return {
    userId: null,
    orgId: null,
    role: null,
    isLoading: true,
  }
}
