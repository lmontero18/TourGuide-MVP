import { defineRouting } from "next-intl/routing";
import { LOCALES, type Locale } from "./config";

// URLs por idioma del sitio PUBLICO (home, blog, legales). El panel, el login
// y /api NO pasan por aca: siguen eligiendo idioma por cookie (i18n/request.ts).
//
// - Español en la raiz (/terms), ingles con prefijo (/en/terms).
// - El idioma sale SOLO de la URL: sin deteccion por Accept-Language ni por
//   cookie, para que Googlebot reciba siempre el idioma de la URL que pide.
// - Sin cookie: el middleware no pisa el idioma que eligio el usuario del panel.
// - Sin header Link de alternates: el hreflang va en el <head> (lib/seo.ts),
//   que sabe que paginas existen en un solo idioma (el blog).
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: "es",
  localePrefix: "as-needed",
  localeDetection: false,
  localeCookie: false,
  alternateLinks: false,
});

export const PUBLIC_DEFAULT_LOCALE: Locale = "es";

// Paginas publicas: rutas que el middleware de next-intl atiende. Al agregar
// una pagina publica nueva, sumarla aca y al `matcher` de proxy.ts.
const PUBLIC_PATH = /^\/(?:(?:en|es)(?:\/.*)?|blog(?:\/.*)?|terms|privacy|data-deletion)?$/;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH.test(pathname);
}

// "/terms" + "en" -> "/en/terms"; "/" + "en" -> "/en"; español sin prefijo
export function localizedPath(path: string, locale: string): string {
  if (locale === PUBLIC_DEFAULT_LOCALE) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

// Inversa: "/en/terms" -> { locale: "en", path: "/terms" }
export function splitLocalePath(pathname: string): { locale: Locale; path: string } {
  const match = pathname.match(/^\/(en|es)(\/.*)?$/);
  if (match) return { locale: match[1] as Locale, path: match[2] ?? "/" };
  return { locale: PUBLIC_DEFAULT_LOCALE, path: pathname };
}
