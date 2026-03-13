'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { BlogStatus } from '@/types';

interface BlogPostItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: BlogStatus;
  viewCount: number;
  publishedAt?: { _seconds: number };
  updatedAt: { _seconds: number };
}

const statusLabels: Record<BlogStatus, string> = {
  draft: 'Brouillon',
  published: 'Publié',
};

const statusColors: Record<BlogStatus, string> = {
  draft: 'bg-amber-100 text-amber-700',
  published: 'bg-green-100 text-green-700',
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPostItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/blog/posts')
      .then((r) => r.json())
      .then((data) => setPosts(data.posts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function deletePost(postId: string, title: string) {
    if (!confirm(`Supprimer "${title}" ? Cette action est irréversible.`)) return;

    const res = await fetch(`/api/blog/posts/${postId}`, { method: 'DELETE' });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } else {
      alert('Erreur lors de la suppression');
    }
  }

  function formatDate(ts?: { _seconds: number }) {
    if (!ts?._seconds) return '—';
    return new Date(ts._seconds * 1000).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-petrol">Blog</h1>
          <p className="text-gray-500 mt-1">Gérez vos articles</p>
        </div>
        <Link href="/dashboard/admin/blog/new" className="btn-primary">
          + Nouvel article
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">📝</p>
          <p>Aucun article. Créez le premier !</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="card-hover flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-brand-petrol truncate">
                    {post.title}
                  </h3>
                  <span className={`badge ${statusColors[post.status]}`}>
                    {statusLabels[post.status]}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>/{post.slug}</span>
                  <span>·</span>
                  <span>{post.category}</span>
                  <span>·</span>
                  <span>{post.viewCount || 0} vues</span>
                  <span>·</span>
                  <span>MAJ {formatDate(post.updatedAt)}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href={`/dashboard/admin/blog/${post.id}`}
                  className="px-3 py-1.5 text-xs rounded-lg bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20 transition-colors"
                >
                  Modifier
                </Link>
                {post.status === 'published' && (
                  <a
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    Voir
                  </a>
                )}
                <button
                  onClick={() => deletePost(post.id, post.title)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
