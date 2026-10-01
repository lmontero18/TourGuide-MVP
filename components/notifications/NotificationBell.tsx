"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { playChime } from "@/lib/notifications/alert";

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-40 ${on ? "bg-navy-900" : "bg-slate-200"}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

// Preferencias de avisos del navegador (CODE-175). El punto azul invita a
// activar las notificaciones del escritorio mientras sigan apagadas.
export default function NotificationBell() {
  const t = useTranslations("dashboard.notifications");
  const { sound, desktop, permission, setSound, setDesktop } = useNotificationPrefs();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const muted = !sound && !desktop;
  const nudge = !desktop && permission === "default";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title={t("bell")}
        aria-label={t("bell")}
        className="relative h-8 w-8 rounded-full flex items-center justify-center text-slate-500 transition-colors hover:bg-slate-100 hover:text-navy-900"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          {muted && <path d="M2 2l20 20" />}
        </svg>
        {nudge && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white" />}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-20 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <p className="text-xs font-bold text-navy-900">{t("bell")}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{t("events")}</p>

          <div className="mt-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-navy-900">{t("desktop")}</p>
              <p className="text-[10px] text-slate-400">{t("desktopHint")}</p>
            </div>
            <Toggle
              on={desktop}
              onChange={(v) => setDesktop(v)}
              disabled={permission === "denied" || permission === "unsupported"}
            />
          </div>
          {permission === "denied" && <p className="mt-1.5 text-[10px] text-amber-700">{t("denied")}</p>}
          {permission === "unsupported" && <p className="mt-1.5 text-[10px] text-slate-400">{t("unsupported")}</p>}

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-navy-900">{t("sound")}</p>
            <Toggle
              on={sound}
              onChange={(v) => {
                setSound(v);
                // Al activarlo suena una vez: confirma y "desbloquea" el audio.
                if (v) playChime();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
