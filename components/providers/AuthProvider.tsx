"use client";

import { createContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as AppUser } from "@/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export interface AuthState {
  user: SupabaseUser | null;
  profile: AppUser | null;
  loading: boolean;
  orgId: string | null;
  role: AppUser["role"] | null;
  onboardedAt: string | null;
}

const EMPTY: AuthState = {
  user: null,
  profile: null,
  loading: false,
  orgId: null,
  role: null,
  onboardedAt: null,
};

export const AuthContext = createContext<AuthState | null>(null);

// Una sola fuente de sesion + perfil para toda la app. Antes cada componente
// que llamaba useAuth() (Sidebar, TopBar, lista, chat) cargaba el perfil por
// su cuenta, dos veces (getUser + INITIAL_SESSION): ~15 requests identicos
// por cada navegacion entre conversaciones.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ ...EMPTY, loading: true });
  // Usuario cuyo perfil ya esta cargado: TOKEN_REFRESHED / INITIAL_SESSION del
  // mismo usuario no vuelven a pegarle a la DB.
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function loadProfile(user: SupabaseUser) {
      if (loadedFor.current === user.id) return;
      loadedFor.current = user.id;
      const { data } = await supabase
        .from("users")
        .select("id, org_id, email, full_name, role, created_at, updated_at, organizations(onboarded_at)")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      const orgData = data?.organizations as unknown as
        | { onboarded_at: string | null }
        | { onboarded_at: string | null }[]
        | null;
      const org = Array.isArray(orgData) ? orgData[0] : orgData;

      setState({
        user,
        profile: (data as unknown as AppUser) ?? null,
        loading: false,
        orgId: data?.org_id ?? null,
        role: data?.role ?? null,
        onboardedAt: org?.onboarded_at ?? null,
      });
    }

    // onAuthStateChange emite INITIAL_SESSION al suscribirse: no hace falta un
    // getUser() aparte. El perfil se lee con RLS, asi que una sesion invalida
    // simplemente no trae fila.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user) {
        loadProfile(session.user);
      } else {
        loadedFor.current = null;
        setState(EMPTY);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
