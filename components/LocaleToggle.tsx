"use client";

import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { localizedPath, splitLocalePath } from "@/i18n/routing";

interface LocaleToggleProps {
  className?: string;
}

// Selector de idioma del sitio publico: lleva a la misma pagina en el otro
// idioma (/terms <-> /en/terms). Nunca redirige solo: el idioma es el de la URL.
// Tambien guarda la cookie para que el panel abra en el idioma elegido.
export default function LocaleToggle({ className }: LocaleToggleProps) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const t = useTranslations("localeToggle");

  const { path } = splitLocalePath(pathname);
  // El blog existe solo en español (lib/seo.ts > BLOG_LOCALES): sin selector
  if (path === "/blog" || path.startsWith("/blog/")) return null;

  const next: Locale = locale === "en" ? "es" : "en";

  return (
    // <a> y no <Link>: navegacion completa para que el <html lang> y todo el
    // layout se rendericen en el idioma nuevo.
    <a
      href={localizedPath(path, next)}
      hrefLang={next}
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      }}
      aria-label={t("switchTo", { lang: t(`names.${next}`) })}
      className={
        className ??
        "inline-flex h-7 sm:h-8 items-center justify-center rounded-md border border-slate-200 px-2 sm:px-2.5 text-[11px] sm:text-xs font-bold text-slate-500 hover:text-navy-900 hover:border-slate-300 transition-colors tracking-wide"
      }
    >
      {next.toUpperCase()}
    </a>
  );
}
