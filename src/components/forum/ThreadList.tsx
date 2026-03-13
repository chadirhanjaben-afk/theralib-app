'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ForumCategoryBadge } from './ForumCategoryBadge';

interface ThreadItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  authorName: string;
  authorRole: string;
  isPinned: boolean;
  isLocked: boolean;
  replyCount: number;
  viewCount: number;
  lastReplyAt?: { _seconds: number };
  lastReplyByName?: string;
  createdAt: { _seconds: number };
}

interface ThreadListProps {
  basePath?: string; // default: /forum
  selectedCategory?: string;
}

export default function ThreadList({
  basePath = '/forum',
  selectedCategory = 'all',
}: ThreadListProps) {
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    params.set('page', String(page));

    fetch(`/api/forum/threads?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setThreads(data.threads || []);
        setHasMore(data.hasMore || false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedCategory, page]);

  function formatTimeAgo(ts?: { _seconds: number }) {
    if (!ts?._seconds) return '';
    const diff = Date.now() / 1000 - ts._seconds;
    if (diff < 60) return "à l'instant";
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `il y a ${Math.floor(diff / 86400)}j`;
    return new Date(ts._seconds * 1000).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
    });
  }

  const roleBadge = (role: string) => {
    if (role === 'professional') return <span className="text-xs bg-brand-teal/10 text-brand-teal px-1.5 py-0.5 rounded-full ml-1">Pro</span>;
    if (role === 'admin') return <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full ml-1">Admin</span>;
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal"></div>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-4xl mb-3">💬</p>
        <p>Aucune discussion dans cette catégorie.</p>
        <p className="text-sm mt-1">Soyez le premier à lancer le sujet !</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {threads.map((t) => (
          <Link
            key={t.id}
            href={`${basePath}/${t.slug}`}
            className="block card-hover group"
          >
            <div className="flex items-start gap-3">
              {/* Pin / Lock indicators */}
              <div className="flex flex-col items-center gap-0.5 pt-1 w-6 shrink-0">
                {t.isPinned && <span title="Épinglé">📌</span>}
                {t.isLocked && <span title="Verrouillé">🔒</span>}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-brand-petrol group-hover:text-brand-teal transition-colors truncate">
                    {t.title}
                  </h3>
                  <ForumCategoryBadge category={t.category} />
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    {t.authorName}
                    {roleBadge(t.authorRole)}
                  </span>
                  <span>·</span>
                  <span>{formatTimeAgo(t.createdAt)}</span>
                  {t.lastReplyByName && t.replyCount > 0 && (
                    <>
                      <span>·</span>
                      <span>
                        Dernier : {t.lastReplyByName} {formatTimeAgo(t.lastReplyAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-4 text-xs text-gray-400 shrink-0">
                <div className="text-center">
                  <p className="font-semibold text-brand-petrol">{t.replyCount}</p>
                  <p>réponses</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-brand-petrol">{t.viewCount}</p>
                  <p>vues</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-3 mt-6">
        {page > 1 && (
          <button
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            ← Précédent
          </button>
        )}
        {hasMore && (
          <button
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 text-sm rounded-lg bg-brand-teal text-white hover:bg-brand-teal/90 transition-colors"
          >
            Suivant →
          </button>
        )}
      </div>
    </div>
  );
}
