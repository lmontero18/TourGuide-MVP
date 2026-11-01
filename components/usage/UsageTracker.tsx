"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/usage/client";

// Una sesion nueva = volver al panel despues de 30 min sin usarlo.
const SESSION_GAP_MS = 30 * 60 * 1000;
const LAST_SEEN_KEY = "tourfy.usage.lastSeen";

function touchSession() {
  try {
    const now = Date.now();
    const last = Number(localStorage.getItem(LAST_SEEN_KEY) ?? 0);
    if (now - last > SESSION_GAP_MS) track("session_start");
    localStorage.setItem(LAST_SEEN_KEY, String(now));
  } catch {
    // sin localStorage (modo privado): sin session_start
  }
}

// Montado en el layout del dashboard: cada pantalla que se abre y cada vuelta
// al panel. No renderiza nada.
export default function UsageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    touchSession();
    track("page_view");
  }, [pathname]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") touchSession();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return null;
}
