"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { hasFeature } from "@/lib/features";

// Modo oscuro (prueba, flag inboxPreview). Los colores viven en
// app/globals.css bajo html[data-theme="dark"]; aca solo se pone el atributo
// y se recuerda la eleccion en este navegador.
const STORAGE_KEY = "tourfy-theme";
type Theme = "light" | "dark";

function readStored(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function apply(theme: Theme) {
  if (theme === "dark") document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
}

// Montado en el layout del dashboard: aplica el tema guardado y lo saca al
// salir (la landing y el login quedan siempre claros).
export function DashboardTheme() {
  const { featureFlags } = useAuth();
  const enabled = hasFeature(featureFlags, "inboxPreview");
  useEffect(() => {
    if (!enabled) return;
    apply(readStored());
    return () => apply("light");
  }, [enabled]);
  return null;
}

export default function ThemeToggle() {
  const t = useTranslations("dashboard.theme");
  const { featureFlags } = useAuth();
  // Sin hidratacion que cuidar: hasta que carga el usuario (solo en el
  // navegador) el boton no se muestra.
  const [theme, setTheme] = useState<Theme>(() => (typeof window === "undefined" ? "light" : readStored()));
  if (!hasFeature(featureFlags, "inboxPreview")) return null;

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    apply(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sin storage el tema dura hasta recargar.
    }
  };

  const label = theme === "dark" ? t("light") : t("dark");
  return (
    <button
      onClick={toggle}
      title={label}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-navy-900"
    >
      {theme === "dark" ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
