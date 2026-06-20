import type { MetadataRoute } from 'next';

const SITE_URL = 'https://www.hansonsguide.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`,       lastModified: now, changeFrequency: 'daily',   priority: 1 },
    { url: `${SITE_URL}/submit`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/about`,  lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
