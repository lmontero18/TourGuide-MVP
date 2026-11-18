import type { Metadata } from "next";
import { LOCALES, type Locale } from "@/i18n/config";
import { PUBLIC_DEFAULT_LOCALE, localizedPath } from "@/i18n/routing";

// SEO del sitio publico: dominio canonico, metadata por pagina y JSON-LD.
// El dominio canonico es fijo (no sale de una env var): los canonical, el
// sitemap y el JSON-LD tienen que apuntar siempre a prod, aunque el build sea
// un preview de Vercel.
export const SITE_URL = "https://www.tourfy.app";
export const SITE_NAME = "Tourfy";
export const LOGO_URL = `${SITE_URL}/app-icon-1024.png`;

// TODO: agregar las URLs de las redes de Tourfy (Instagram, LinkedIn, X…).
// Mientras este vacio, el JSON-LD de Organization sale sin `sameAs`.
export const SOCIAL_PROFILES: string[] = [];

export const BLOG_AUTHOR = {
  "@type": "Person",
  name: "Luis Montero",
  url: "https://x.com/monterobuilds",
} as const;

export function absoluteUrl(path: string): string {
  if (path === "/" || path === "") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

// URL absoluta de una pagina en un idioma: ("/terms", "en") -> .../en/terms
export function localizedUrl(path: string, locale: string): string {
  return absoluteUrl(localizedPath(path, locale));
}

// Idiomas en los que existe el blog. Al publicar posts en ingles, sumar "en"
// aca (y sacar el notFound de app/[locale]/blog/layout.tsx).
export const BLOG_LOCALES: readonly Locale[] = ["es"];

// hreflang: una entrada por idioma en que existe la pagina, mas x-default
// apuntando a la version sin prefijo (español).
export function languageAlternates(
  path: string,
  locales: readonly Locale[] = LOCALES,
): Record<string, string> {
  return {
    ...Object.fromEntries(locales.map((l) => [l, localizedUrl(path, l)])),
    "x-default": localizedUrl(path, PUBLIC_DEFAULT_LOCALE),
  };
}

export function ogLocale(lang: string): string {
  return lang === "es" ? "es_LA" : "en_US";
}

interface PageMetadataInput {
  title: string;
  description: string;
  /** Ruta sin prefijo de idioma ("/terms"); el prefijo lo pone `lang` */
  path: string;
  lang: string;
  /** Idiomas en que existe la pagina (hreflang). Default: todos */
  locales?: readonly Locale[];
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
}

// Canonical absoluto (en el idioma de la pagina) + hreflang + Open Graph. Next no mezcla `openGraph` entre
// layout y pagina (el de la pagina reemplaza al del padre), por eso cada
// pagina publica arma el suyo completo con esto.
export function pageMetadata({
  title,
  description,
  path,
  lang,
  locales = LOCALES,
  type = "website",
  publishedTime,
  modifiedTime,
}: PageMetadataInput): Metadata {
  const url = localizedUrl(path, lang);
  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path, locales) },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: ogLocale(lang),
      type,
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
  };
}

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export const organizationJsonLd = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: SITE_NAME,
  url: SITE_URL,
  logo: { "@type": "ImageObject", url: LOGO_URL, width: 1024, height: 1024 },
  description: "WhatsApp AI for tour agencies in Latin America.",
  address: { "@type": "PostalAddress", addressCountry: "CR" },
  areaServed: [
    { "@type": "Country", name: "Costa Rica" },
    { "@type": "Place", name: "Latin America" },
  ],
  ...(SOCIAL_PROFILES.length > 0 ? { sameAs: SOCIAL_PROFILES } : {}),
};

// Serializa para <script type="application/ld+json">. El replace de `<`
// evita que un string cierre el <script> (recomendacion de la guia JSON-LD
// de Next).
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

interface WebPageJsonLdInput {
  name: string;
  description: string;
  path: string;
  lang: string;
  dateModified?: string;
}

// Paginas simples (legales): WebPage con el publisher y la fecha de edicion
export function webPageJsonLd({ name, description, path, lang, dateModified }: WebPageJsonLdInput) {
  const url = localizedUrl(path, lang);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": url,
    url,
    name,
    description,
    inLanguage: lang,
    ...(dateModified ? { dateModified } : {}),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", "@id": ORGANIZATION_ID, name: SITE_NAME, url: SITE_URL },
  };
}
