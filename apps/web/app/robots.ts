import type { MetadataRoute } from 'next'

/** The internal pages are password-gated; keeping them out of the index too. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/internal' },
  }
}
