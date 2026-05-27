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

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(fromCookie)
    ? fromCookie
    : detectFromAcceptLanguage(headerStore.get("accept-language"));

  const messages = (await import(`../messages/${locale}.json`)).default;

  return { locale, messages };
});
