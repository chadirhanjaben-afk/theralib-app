import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { FieldValue } from 'firebase-admin/firestore';

export const revalidate = 600;

interface Props {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  const snap = await adminDb
    .collection(COLLECTIONS.BLOG_POSTS)
    .where('slug', '==', slug)
    .where('status', '==', 'published')
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  // Increment view count (fire-and-forget)
  adminDb
    .collection(COLLECTIONS.BLOG_POSTS)
    .doc(doc.id)
    .update({ viewCount: FieldValue.increment(1) })
    .catch(() => {});

  return { id: doc.id, ...doc.data() } as Record<string, unknown> & { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return { title: 'Article introuvable' };
  }

  const title = (post.seoTitle as string) || (post.title as string);
  const description =
    (post.seoDescription as string) || (post.excerpt as string) || '';

  return {
    title,
    description,
    openGraph: {
      title: `${title} – Theralib`,
      description,
      type: 'article',
      publishedTime: post.publishedAt
        ? new Date(
            (post.publishedAt as { _seconds: number })._seconds * 1000
          ).toISOString()
        : undefined,
      images: post.coverImage ? [{ url: post.coverImage as string }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

function formatDate(ts?: { _seconds: number }): string {
  if (!ts?._seconds) return '';
  return new Date(ts._seconds * 1000).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  // Extract typed values
  const postTitle = String(post.title || '');
  const postCategory = String(post.category || '');
  const postAuthor = String(post.authorName || '');
  const postContent = String(post.content || '');
  const postCoverImage = post.coverImage ? String(post.coverImage) : null;
  const postReadingTime = Number(post.readingTime) || 1;
  const postTags = Array.isArray(post.tags) ? (post.tags as string[]) : [];
  const postPublishedAt = post.publishedAt as { _seconds: number } | undefined;

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      {/* Back link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-sm text-brand-teal hover:underline mb-8"
      >
        ← Retour au blog
      </Link>

      {/* Category */}
      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-brand-teal/10 text-brand-teal mb-4">
        {postCategory}
      </span>

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-bold text-brand-petrol mb-4 leading-tight">
        {postTitle}
      </h1>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-100">
        <span>Par {postAuthor}</span>
        <span>·</span>
        <span>{formatDate(postPublishedAt)}</span>
        <span>·</span>
        <span>{postReadingTime} min de lecture</span>
      </div>

      {/* Cover image */}
      {postCoverImage && (
        <div className="aspect-[16/9] rounded-2xl overflow-hidden mb-10">
          <img
            src={postCoverImage}
            alt={postTitle}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div
        className="prose prose-lg max-w-none prose-headings:text-brand-petrol prose-a:text-brand-teal prose-a:no-underline hover:prose-a:underline"
        dangerouslySetInnerHTML={{ __html: postContent }}
      />

      {/* Tags */}
      {postTags.length > 0 && (
        <div className="mt-10 pt-8 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {postTags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-brand-teal/10 to-brand-teal/5 text-center">
        <h3 className="text-xl font-bold text-brand-petrol mb-2">
          Prenez soin de vous
        </h3>
        <p className="text-gray-600 mb-4">
          Trouvez le praticien bien-être idéal près de chez vous.
        </p>
        <Link href="/repertoire" className="btn-primary inline-block">
          Voir le répertoire
        </Link>
      </div>

      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: postTitle,
            description: String(post.excerpt || ''),
            image: postCoverImage || undefined,
            author: {
              '@type': 'Person',
              name: postAuthor,
            },
            publisher: {
              '@type': 'Organization',
              name: 'Theralib',
              url: 'https://theralib.net',
            },
            datePublished: postPublishedAt
              ? new Date(postPublishedAt._seconds * 1000).toISOString()
              : undefined,
            dateModified: post.updatedAt
              ? new Date(
                  (post.updatedAt as { _seconds: number })._seconds * 1000
                ).toISOString()
              : undefined,
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://theralib.net/blog/${slug}`,
            },
          }),
        }}
      />
    </article>
  );
}
