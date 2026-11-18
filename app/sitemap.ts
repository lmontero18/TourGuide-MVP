import type { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/blog'
import { DATA_DELETION_UPDATED, PRIVACY_UPDATED, TERMS_UPDATED } from '@/lib/legal'
import { absoluteUrl } from '@/lib/seo'

// lastmod real, nunca la fecha del build: Google ignora el lastmod de un
// sitio si ve que cambia en cada deploy sin que cambie la pagina.
// - posts: `updated` del frontmatter (o la fecha de publicacion)
// - /blog: el post mas reciente
// - legales: la fecha de "ultima actualizacion" de lib/legal.ts
// - home: sin lastmod (no hay una fecha de edicion confiable)
function isoDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts()
  const latestPost = posts.map((p) => p.updated).sort().at(-1)

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: isoDate(post.updated),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    {
      url: absoluteUrl('/blog'),
      ...(latestPost ? { lastModified: isoDate(latestPost) } : {}),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...postEntries,
    { url: absoluteUrl('/terms'), lastModified: isoDate(TERMS_UPDATED), changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/privacy'), lastModified: isoDate(PRIVACY_UPDATED), changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/data-deletion'), lastModified: isoDate(DATA_DELETION_UPDATED), changeFrequency: 'yearly', priority: 0.3 },
  ]
}
