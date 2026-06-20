import type { MetadataRoute } from 'next';
import { LOCATIONS } from '@/lib/locations';

const SITE_URL = 'https://www.hansonsguide.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const locationRoutes: MetadataRoute.Sitemap = LOCATIONS
    .filter(l => !l.isDefault)
    .map(l => ({ url: `${SITE_URL}/${l.slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.9 }));

  return [
    { url: `${SITE_URL}/`,       lastModified: now, changeFrequency: 'daily',   priority: 1 },
    ...locationRoutes,
    { url: `${SITE_URL}/submit`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/about`,  lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
