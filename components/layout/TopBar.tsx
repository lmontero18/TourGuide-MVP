"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/app/(auth)/login/actions";
import { setLocale } from "@/app/actions/locale";
import { LOCALES, type Locale } from "@/i18n/config";

interface TopBarProps {
  title: string;
  children?: React.ReactNode;
}

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

export default function TopBar({ title, children }: TopBarProps) {
  const { profile } = useAuth();
  const locale = useLocale() as Locale;
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const initials = getInitials(profile?.full_name ?? null, profile?.email ?? null);
  const displayName = profile?.full_name ?? profile?.email ?? "User";

  const handleLocaleChange = (next: Locale) => {
    if (next === locale) return;
    startTransition(() => setLocale(next));
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5">
      <h1 className="font-display text-lg font-bold tracking-tight text-navy-900">
        {title}
      </h1>
      <div className="flex items-center gap-3">
        {children}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            title="Account"
            className="h-8 w-8 rounded-full bg-navy-900/10 flex items-center justify-center transition-colors hover:bg-navy-900/15"
          >
            <span className="text-xs font-bold text-navy-700">{initials}</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 z-20 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="px-3 py-2.5 border-b border-slate-100">
                <p className="text-xs font-semibold text-navy-900 truncate">{displayName}</p>
                {profile?.email && profile.full_name && (
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{profile.email}</p>
                )}
                {profile?.role && (
                  <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{profile.role}</p>
                )}
              </div>
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Language
                </p>
                <div className="flex gap-1">
                  {LOCALES.map((l) => {
                    const active = l === locale;
                    return (
                      <button
                        key={l}
                        type="button"
                        disabled={isPending || active}
                        onClick={() => handleLocaleChange(l)}
                        className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] font-bold tracking-wide transition-colors disabled:cursor-not-allowed ${
                          active
                            ? "border-navy-900 bg-navy-900 text-white"
                            : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-navy-900 disabled:opacity-60"
                        }`}
                      >
                        {LOCALE_LABELS[l]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <form
                action={async () => {
                  setLoggingOut(true);
                  await logout();
                }}
              >
                <button
                  type="submit"
                  disabled={loggingOut}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  {loggingOut ? "Signing out..." : "Sign out"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
