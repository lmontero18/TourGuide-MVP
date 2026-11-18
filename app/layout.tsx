import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { Toaster } from "sonner";
import { LOCALES } from "@/i18n/config";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

// Fuentes locales (variables, OFL) en vez de next/font/google: el build ya no
// depende de bajar las fuentes de Google en cada deploy (fallaba al azar).
const bricolage = localFont({
  src: "./fonts/BricolageGrotesque-Variable.woff2",
  variable: "--font-bricolage",
  display: "swap",
  weight: "200 800",
});

const jakarta = localFont({
  src: "./fonts/PlusJakartaSans-Variable.woff2",
  variable: "--font-jakarta",
  display: "swap",
  weight: "200 800",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    // Base para las URLs relativas de metadata (canonical, og:url, og:image)
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  // Paginas cuyo contenido tiene idioma propio (posts del blog en español):
  // el proxy lo marca en la request. Solo se aceptan idiomas conocidos.
  const contentLang = (await headers()).get("x-content-lang");
  const htmlLang =
    contentLang && (LOCALES as readonly string[]).includes(contentLang)
      ? contentLang
      : locale;

  return (
    <html
      lang={htmlLang}
      className={`${bricolage.variable} ${jakarta.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
