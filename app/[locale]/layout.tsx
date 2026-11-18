import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

// Sitio publico con idioma en la URL: /terms (español) y /en/terms (ingles).
// El layout raiz ya pone <html lang> y un provider con el idioma de la URL;
// este provider propio hace que los textos cambien al navegar del lado del
// cliente entre /terms y /en/terms (el layout raiz no se vuelve a renderizar
// en esa navegacion, este si porque cambia el segmento [locale]).
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
