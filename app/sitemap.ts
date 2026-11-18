import type { MetadataRoute } from 'next'
import { LOCALES, type Locale } from '@/i18n/config'
import { getAllPosts } from '@/lib/blog'
import { DATA_DELETION_UPDATED, PRIVACY_UPDATED, TERMS_UPDATED } from '@/lib/legal'
import { BLOG_LOCALES, languageAlternates, localizedUrl } from '@/lib/seo'

// lastmod real, nunca la fecha del build: Google ignora el lastmod de un
// sitio si ve que cambia en cada deploy sin que cambie la pagina.
// - posts: `updated` del frontmatter (o la fecha de publicacion)
// - /blog: el post mas reciente
// - legales: la fecha de "ultima actualizacion" de lib/legal.ts
// - home: sin lastmod (no hay una fecha de edicion confiable)
//
// Una entrada por URL y por idioma, cada una con sus alternates (hreflang)
// — es lo que pide Google para sitemaps multi-idioma.
function isoDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

interface PageEntry {
  path: string
  locales: readonly Locale[]
  lastModified?: Date
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}

function expand({ path, locales, ...rest }: PageEntry): MetadataRoute.Sitemap {
  const languages = languageAlternates(path, locales)
  return locales.map((locale) => ({
    url: localizedUrl(path, locale),
    ...(rest.lastModified ? { lastModified: rest.lastModified } : {}),
    changeFrequency: rest.changeFrequency,
    priority: rest.priority,
    alternates: { languages },
  }))
}

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts()
  const latestPost = posts.map((p) => p.updated).sort().at(-1)

  const pages: PageEntry[] = [
    { path: '/', locales: LOCALES, changeFrequency: 'weekly', priority: 1 },
    {
      path: '/blog',
      locales: BLOG_LOCALES,
      lastModified: latestPost ? isoDate(latestPost) : undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...posts.map((post) => ({
      path: `/blog/${post.slug}`,
      locales: BLOG_LOCALES,
      lastModified: isoDate(post.updated),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    { path: '/terms', locales: LOCALES, lastModified: isoDate(TERMS_UPDATED), changeFrequency: 'yearly', priority: 0.3 },
    { path: '/privacy', locales: LOCALES, lastModified: isoDate(PRIVACY_UPDATED), changeFrequency: 'yearly', priority: 0.3 },
    { path: '/data-deletion', locales: LOCALES, lastModified: isoDate(DATA_DELETION_UPDATED), changeFrequency: 'yearly', priority: 0.3 },
  ]

  return pages.flatMap(expand)
}
