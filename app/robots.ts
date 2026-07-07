import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.tourfy.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/onboarding',
        '/conversations',
        '/metrics',
        '/settings',
        '/dashboard',
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
