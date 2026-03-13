import { Metadata } from 'next';
import Link from 'next/link';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';

export const metadata: Metadata = {
  title: 'Blog bien-être',
  description:
    'Conseils, astuces et articles sur le bien-être, la santé naturelle, le développement personnel et les médecines douces.',
  openGraph: {
    title: 'Blog bien-être – Theralib',
    description:
      'Conseils, astuces et articles sur le bien-être, la santé naturelle et les médecines douces.',
  },
};

// Revalidate every 10 minutes for ISR
export const revalidate = 600;

interface BlogPostItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: string;
  category: string;
  authorName: string;
  publishedAt?: { _seconds: number };
  readingTime: number;
}

async function getPublishedPosts(): Promise<BlogPostItem[]> {
  const snap = await adminDb
    .collection(COLLECTIONS.BLOG_POSTS)
    .where('status', '==', 'published')
    .orderBy('publishedAt', 'desc')
    .limit(30)
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      title: d.title,
      slug: d.slug,
      excerpt: d.excerpt,
      coverImage: d.coverImage || undefined,
      category: d.category,
      authorName: d.authorName,
      publishedAt: d.publishedAt,
      readingTime: d.readingTime || 1,
    };
  });
}

function formatDate(ts?: { _seconds: number }): string {
  if (!ts?._seconds) return '';
  return new Date(ts._seconds * 1000).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-brand-petrol mb-4">
          Blog bien-être
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Conseils, astuces et inspirations pour prendre soin de vous au quotidien.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">📝</p>
          <p className="text-lg">Aucun article pour le moment.</p>
          <p className="text-sm mt-2">Revenez bientôt !</p>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article key={post.id} className="group">
              <Link href={`/blog/${post.slug}`} className="block">
                {/* Cover image */}
                <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-gradient-to-br from-brand-teal/10 to-brand-teal/5 mb-4">
                  {post.coverImage ? (
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl text-brand-teal/30">
                      📰
                    </div>
                  )}
                </div>

                {/* Category badge */}
                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-brand-teal/10 text-brand-teal mb-2">
                  {post.category}
                </span>

                {/* Title */}
                <h2 className="text-lg font-bold text-brand-petrol group-hover:text-brand-teal transition-colors mb-2 line-clamp-2">
                  {post.title}
                </h2>

                {/* Excerpt */}
                <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                  {post.excerpt}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{formatDate(post.publishedAt)}</span>
                  <span>·</span>
                  <span>{post.readingTime} min de lecture</span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}

      {/* SEO structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'Blog Theralib',
            description: 'Conseils et articles sur le bien-être et les médecines douces',
            url: 'https://theralib.net/blog',
            publisher: {
              '@type': 'Organization',
              name: 'Theralib',
              url: 'https://theralib.net',
            },
          }),
        }}
      />
    </div>
  );
}
