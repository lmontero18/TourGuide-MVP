"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as AppUser } from "@/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { OrgFeatureFlags } from "@/lib/features";

export interface AuthState {
  user: SupabaseUser | null;
  profile: AppUser | null;
  loading: boolean;
  orgId: string | null;
  role: AppUser["role"] | null;
  onboardedAt: string | null;
  // Feature flags de la org (lib/features.ts). null = sin features beta.
  featureFlags: OrgFeatureFlags | null;
  // Nombre y logo de la agencia para el menu (flag orgBranding).
  orgName: string | null;
  orgLogoPath: string | null;
}

export interface AuthContextValue extends AuthState {
  // Configuracion guarda nombre o logo: el menu se actualiza sin recargar.
  setOrgBranding: (patch: { name?: string; logoPath?: string | null }) => void;
}

const EMPTY: AuthState = {
  user: null,
  profile: null,
  loading: false,
  orgId: null,
  role: null,
  onboardedAt: null,
  featureFlags: null,
  orgName: null,
  orgLogoPath: null,
};

type OrgRow = {
  onboarded_at: string | null;
  is_beta?: boolean;
  features?: string[];
  name?: string;
  logo_path?: string | null;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

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
        .select("id, org_id, email, full_name, role, created_at, updated_at, organizations(onboarded_at, is_beta, features, name, logo_path)")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      const orgData = data?.organizations as unknown as
        | OrgRow
        | OrgRow[]
        | null;
      const org = Array.isArray(orgData) ? orgData[0] : orgData;

      setState({
        user,
        profile: (data as unknown as AppUser) ?? null,
        loading: false,
        orgId: data?.org_id ?? null,
        role: data?.role ?? null,
        onboardedAt: org?.onboarded_at ?? null,
        featureFlags: org ? { is_beta: org.is_beta ?? false, features: org.features ?? [] } : null,
        orgName: org?.name ?? null,
        orgLogoPath: org?.logo_path ?? null,
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

  const setOrgBranding = useCallback((patch: { name?: string; logoPath?: string | null }) => {
    setState((prev) => ({
      ...prev,
      ...(patch.name !== undefined && { orgName: patch.name }),
      ...(patch.logoPath !== undefined && { orgLogoPath: patch.logoPath }),
    }));
  }, []);
  const value = useMemo(() => ({ ...state, setOrgBranding }), [state, setOrgBranding]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
