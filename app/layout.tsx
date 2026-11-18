import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Toaster } from "sonner";
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
  // Paginas publicas: el idioma de la URL (/en/...). Panel: cookie.
  // Ver i18n/request.ts.

  return (
    <html
      lang={locale}
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
