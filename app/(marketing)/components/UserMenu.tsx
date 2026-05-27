"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/app/(auth)/login/actions";

function initials(name: string | null, email: string | null) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  }
  return email?.[0]?.toUpperCase() ?? "?";
}

export function MobileAuthLinks({ onSelect }: { onSelect: () => void }) {
  const t = useTranslations("nav");
  const { user, onboardedAt, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return (
      <div className="flex flex-col gap-2">
        <Link
          href="/register"
          onClick={onSelect}
          className="flex h-10 items-center justify-center rounded-lg bg-navy-900 text-sm font-semibold text-white"
        >
          {t("cta")}
        </Link>
        <Link
          href="/login"
          onClick={onSelect}
          className="flex h-10 items-center justify-center rounded-lg border border-slate-200 text-sm font-medium text-slate-600"
        >
          {t("login")}
        </Link>
      </div>
    );
  }

  const primaryHref = onboardedAt ? "/conversations" : "/onboarding";
  const primaryLabel = onboardedAt ? t("dashboard") : t("finishOnboarding");

  return (
    <div className="flex flex-col gap-2">
      <Link
        href={primaryHref}
        onClick={onSelect}
        className="flex h-10 items-center justify-center rounded-lg bg-navy-900 text-sm font-semibold text-white"
      >
        {primaryLabel}
      </Link>
      <form action={logout}>
        <button
          type="submit"
          onClick={onSelect}
          className="w-full flex h-10 items-center justify-center rounded-lg border border-slate-200 text-sm font-medium text-slate-600"
        >
          {t("signOut")}
        </button>
      </form>
    </div>
  );
}

export function UserMenu() {
  const t = useTranslations("nav");
  const { user, profile, onboardedAt, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (loading) {
    return <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" aria-hidden />;
  }

  if (!user) {
    return (
      <>
        <Link
          href="/login"
          className="text-sm font-medium text-slate-500 hover:text-navy-900 transition-colors hidden md:block"
        >
          {t("login")}
        </Link>
        <Link
          href="/register"
          className="hidden sm:inline-flex h-8 sm:h-9 items-center rounded-lg bg-navy-900 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white transition-all hover:bg-navy-800 hover:shadow-lg hover:shadow-navy-900/20 active:scale-[0.98]"
        >
          {t("cta")}
        </Link>
      </>
    );
  }

  const primaryHref = onboardedAt ? "/conversations" : "/onboarding";
  const primaryLabel = onboardedAt ? t("dashboard") : t("finishOnboarding");
  const email = user.email ?? null;
  const name = profile?.full_name ?? null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("account")}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white transition-all hover:bg-navy-800 hover:shadow-lg hover:shadow-navy-900/20 active:scale-[0.97]"
      >
        {initials(name, email)}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-[calc(100%+8px)] w-56 overflow-hidden rounded-xl border border-slate-200/70 bg-white/95 backdrop-blur-xl shadow-lg shadow-slate-900/5"
          >
            <div className="px-3 py-2.5 border-b border-slate-100">
              {name && <p className="text-sm font-semibold text-navy-900 truncate">{name}</p>}
              {email && <p className="text-xs text-slate-500 truncate">{email}</p>}
            </div>
            <div className="py-1">
              <Link
                href={primaryHref}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-navy-900 hover:bg-slate-50 transition-colors"
              >
                {primaryLabel}
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  role="menuitem"
                  className="w-full text-left px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-navy-900 transition-colors"
                >
                  {t("signOut")}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
