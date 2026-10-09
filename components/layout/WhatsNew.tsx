"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useChangelog } from "@/hooks/useChangelog";

// Panel de Novedades (🎁 en la barra de arriba). El punto queda hasta que el
// usuario lo abre; lo que era nuevo al abrir se marca "Nuevo" en la lista.
export default function WhatsNew() {
  const t = useTranslations("dashboard.whatsNew");
  const locale = useLocale();
  const { entries, unseen, markSeen } = useChangelog();
  const [open, setOpen] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", handler);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      setFreshIds(new Set(unseen.map((e) => e.id)));
      void markSeen();
    }
    setOpen((v) => !v);
  };

  if (!entries.length) return null;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        title={t("title")}
        aria-label={unseen.length ? t("unseen", { count: unseen.length }) : t("title")}
        aria-expanded={open}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-navy-900"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="8" width="18" height="4" rx="1" />
          <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
          <path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" />
        </svg>
        {unseen.length > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white" />}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-20 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-navy-900">{t("title")}</p>
            <p className="text-[11px] text-slate-500">{t("sub")}</p>
          </div>
          <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
            {entries.map((entry) => {
              const copy = locale === "en" ? entry.en : entry.es;
              return (
                <li key={entry.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] tabular-nums text-slate-400">{fmt(entry.date)}</span>
                    {freshIds.has(entry.id) && (
                      <span className="rounded-full bg-blue-50 px-1.5 py-px text-[10px] font-bold text-blue-700">{t("new")}</span>
                    )}
                    {entry.requested && (
                      <span className="rounded-full bg-green-50 px-1.5 py-px text-[10px] font-bold text-green-700">{t("requested")}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-navy-900">{copy.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{copy.body}</p>
                  {entry.href && (
                    <Link href={entry.href} onClick={() => setOpen(false)} className="mt-1.5 inline-block text-xs font-semibold text-blue-600 hover:underline">
                      {t("try")} →
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
