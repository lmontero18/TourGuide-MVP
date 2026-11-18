import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./config";

export { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale };

function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

function detectFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const first = header.split(",")[0]?.trim().toLowerCase().slice(0, 2);
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

export default getRequestConfig(async ({ requestLocale }) => {
  // Sitio publico (app/[locale]): el idioma lo dice la URL y nada mas — el
  // middleware de next-intl (proxy.ts) lo resuelve. Ver i18n/routing.ts.
  const fromUrl = await requestLocale;
  if (isLocale(fromUrl)) {
    const messages = (await import(`../messages/${fromUrl}.json`)).default;
    return { locale: fromUrl, messages };
  }

  // Panel, login y demas rutas sin idioma en la URL: cookie del selector y,
  // si no hay, el Accept-Language del navegador.
  const cookieStore = await cookies();
  const headerStore = await headers();

  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(fromCookie)
    ? fromCookie
    : detectFromAcceptLanguage(headerStore.get("accept-language"));

  const messages = (await import(`../messages/${locale}.json`)).default;

  return { locale, messages };
});
