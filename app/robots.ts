import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Panel y API: requieren login, no tienen nada para indexar
      disallow: [
        '/api/',
        '/onboarding',
        '/conversations',
        '/leads',
        '/bookings',
        '/metrics',
        '/settings',
        '/tours',
        '/templates',
        '/dashboard',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}
