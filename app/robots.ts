import type { MetadataRoute } from 'next';

const SITE_URL = 'https://www.hansonsguide.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/debug'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
