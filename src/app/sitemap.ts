import type { MetadataRoute } from 'next';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { SEO_CITIES, SEO_SPECIALTIES } from '@/lib/seo/local-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://theralib.net';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/repertoire`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/register`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/mentions-legales`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/cgv`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/confidentialite`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  // Blog posts
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const blogSnap = await adminDb
      .collection(COLLECTIONS.BLOG_POSTS)
      .where('status', '==', 'published')
      .orderBy('publishedAt', 'desc')
      .get();

    blogPages = blogSnap.docs.map((doc) => {
      const data = doc.data();
      const updatedAt = data.updatedAt?._seconds
        ? new Date(data.updatedAt._seconds * 1000)
        : now;
      return {
        url: `${SITE_URL}/blog/${data.slug}`,
        lastModified: updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      };
    });
  } catch {
    // If blog query fails, skip blog pages in sitemap
  }

  // Blog index page
  const blogIndex: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  // Local SEO pages (specialty-city combos)
  const localPages: MetadataRoute.Sitemap = [];
  for (const specialty of SEO_SPECIALTIES) {
    for (const city of SEO_CITIES) {
      localPages.push({
        url: `${SITE_URL}/${specialty.slug}-${city.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  // Professional profiles
  let proPages: MetadataRoute.Sitemap = [];
  try {
    const proSnap = await adminDb
      .collection(COLLECTIONS.PROFESSIONALS)
      .where('isActive', '==', true)
      .limit(500)
      .get();

    proPages = proSnap.docs.map((doc) => ({
      url: `${SITE_URL}/profil/${doc.id}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch {
    // Skip if query fails
  }

  return [...staticPages, ...blogIndex, ...blogPages, ...localPages, ...proPages];
}
