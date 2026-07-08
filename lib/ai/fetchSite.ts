// Trae el contenido legible de un sitio para pasarlo al extractor.
// Lee la página dada + descubre y trae páginas internas relevantes (tours, paquetes,
// nosotros, faq, contacto…) para capturar TODO el contexto del negocio, no una sola página.
// Usa r.jina.ai (markdown limpio) con fallback a fetch + strip de HTML para la página inicial.

import { ImportUserError } from "./errors";

const MAX_TOTAL = 220_000;
const MAX_PER_PAGE = 45_000;
const MAX_EXTRA_PAGES = 6;

// Rutas comunes a probar cuando el sitio no expone links claros (homepage JS-heavy,
// o el usuario pega una página profunda). Las que den 404 simplemente se descartan.
const COMMON_PATHS = [
  "nosotros", "sobre-nosotros", "quienes-somos", "about",
  "contacto", "contact",
  "tours", "paquetes", "servicios", "precios", "tarifas",
  "faq", "preguntas-frecuentes",
];

// Palabras clave para priorizar qué páginas internas vale la pena leer.
const RELEVANT = [
  "tour", "paquete", "package", "excursion", "trek", "itinerar", "destino",
  "nosotros", "about", "quienes", "empresa", "historia",
  "faq", "pregunt", "ayuda",
  "contact", "servicio", "precio", "tarifa", "reserv", "pago",
];

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function isPrivateIp(host: string): boolean {
  // IPv6 literal (URL.hostname ya quita los corchetes)
  if (host.includes(":")) {
    return (
      host === "::1" ||
      host === "::" ||
      /^f[cd]/i.test(host) || // fc00::/7 (ULA)
      /^fe80:/i.test(host) || // link-local
      host.toLowerCase().startsWith("::ffff:") // IPv4-mapped
    );
  }
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) || // link-local / metadata (169.254.169.254)
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

// Guard SSRF: el fetch directo de fallback sale desde nuestra infra, así que
// bloquea hosts internos y rangos privados. No cubre DNS rebinding (hostname
// público que resuelve a IP privada) — superficie admin-only, riesgo aceptado.
function assertPublicUrl(url: string): void {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new ImportUserError("URL inválida. Revisá la dirección.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new ImportUserError("Solo se aceptan URLs http(s).");
  }
  const host = u.hostname.toLowerCase();
  const blockedHost =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal");
  if (blockedHost || isPrivateIp(host)) {
    throw new ImportUserError("Esa URL apunta a una red privada — usá el dominio público del sitio.");
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function readViaJina(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { "X-Return-Format": "markdown" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const md = await res.text();
    return md.trim().length > 50 ? md : null;
  } catch {
    return null;
  }
}

function extractInternalLinks(markdown: string, baseUrl: string): string[] {
  let origin: string;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return [];
  }
  const out = new Set<string>();
  const re = /\[[^\]]*\]\(([^)\s]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(markdown))) {
    const href = match[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      const u = new URL(href, baseUrl);
      if (u.origin !== origin) continue;
      if (/\.(jpe?g|png|gif|webp|svg|pdf|zip|mp4|mp3|css|js)$/i.test(u.pathname)) continue;
      u.hash = "";
      out.add(u.toString());
    } catch {
      // ignora hrefs inválidos
    }
  }
  return [...out];
}

function pickRelevant(links: string[], baseUrl: string): string[] {
  const base = normalizeUrl(baseUrl);
  return links
    .filter((l) => l !== base && l !== `${base}/`)
    .map((l) => ({ l, score: RELEVANT.filter((k) => l.toLowerCase().includes(k)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.l)
    .slice(0, MAX_EXTRA_PAGES);
}

export interface FetchSiteResult {
  content: string;
  /** true si pudimos leer una cantidad razonable de texto. */
  usable: boolean;
  /** cuántas páginas alcanzamos a leer (1 = solo la inicial). */
  pages: number;
}

export async function fetchSiteContent(url: string): Promise<FetchSiteResult> {
  const base = normalizeUrl(url);
  assertPublicUrl(base);

  // Página inicial: jina, con fallback a HTML crudo.
  let home = await readViaJina(base, 20_000);
  if (!home) {
    try {
      const res = await fetch(base, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; TourfyBot/1.0)" },
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) home = stripHtml(await res.text());
    } catch {
      // se maneja abajo
    }
  }
  if (!home) {
    throw new ImportUserError("No pudimos acceder al sitio. Revisá la URL.");
  }

  const pages: string[] = [`# Página principal: ${base}\n${home.slice(0, MAX_PER_PAGE)}`];

  // Descubre páginas internas relevantes a partir de los links de la home.
  let candidates = pickRelevant(extractInternalLinks(home, base), base);

  // Si encontramos pocas, probamos rutas comunes (las que den 404 se descartan solas).
  if (candidates.length < 3) {
    try {
      const origin = new URL(base).origin;
      const guessed = COMMON_PATHS.map((p) => `${origin}/${p}`);
      candidates = [...new Set([...candidates, ...guessed])];
    } catch {
      // base inválida: nos quedamos con lo que haya
    }
  }
  candidates = candidates.slice(0, MAX_EXTRA_PAGES + 4);

  if (candidates.length > 0) {
    const results = await Promise.allSettled(candidates.map((l) => readViaJina(l, 15_000)));
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value) {
        pages.push(`# Página: ${candidates[i]}\n${r.value.slice(0, MAX_PER_PAGE)}`);
      }
    });
  }

  const content = pages.join("\n\n---\n\n").slice(0, MAX_TOTAL);
  return { content, usable: content.trim().length > 200, pages: pages.length };
}
