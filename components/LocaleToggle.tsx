"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import type { Locale } from "@/i18n/request";

interface LocaleToggleProps {
  className?: string;
}

export default function LocaleToggle({ className }: LocaleToggleProps) {
  const locale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();

  const next: Locale = locale === "en" ? "es" : "en";

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => setLocale(next))}
      aria-label={`Switch to ${next.toUpperCase()}`}
      className={
        className ??
        "inline-flex h-7 sm:h-8 items-center justify-center rounded-md border border-slate-200 px-2 sm:px-2.5 text-[11px] sm:text-xs font-bold text-slate-500 hover:text-navy-900 hover:border-slate-300 transition-colors tracking-wide disabled:opacity-60"
      }
    >
      {next.toUpperCase()}
    </button>
  );
}
