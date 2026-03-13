'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ForumCategoryBadge } from '@/components/forum/ForumCategoryBadge';

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
  createdAt: { _seconds: number };
}

export default function AdminForumPage() {
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/forum/threads?page=1')
      .then((r) => r.json())
      .then((data) => setThreads(data.threads || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function deleteThread(threadId: string, title: string) {
    if (!confirm(`Supprimer "${title}" et toutes ses réponses ? Irréversible.`)) return;

    const res = await fetch(`/api/forum/threads/${threadId}`, { method: 'DELETE' });
    if (res.ok) {
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
    }
  }

  async function togglePin(threadId: string, currentPinned: boolean) {
    const res = await fetch(`/api/forum/threads/${threadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPinned: !currentPinned }),
    });
    if (res.ok) {
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, isPinned: !currentPinned } : t))
      );
    }
  }

  async function toggleLock(threadId: string, currentLocked: boolean) {
    const res = await fetch(`/api/forum/threads/${threadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isLocked: !currentLocked }),
    });
    if (res.ok) {
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, isLocked: !currentLocked } : t))
      );
    }
  }

  function formatDate(ts: { _seconds: number }) {
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
          <h1 className="text-2xl font-bold text-brand-petrol">Forum – Modération</h1>
          <p className="text-gray-500 mt-1">Gérez les discussions du forum</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal"></div>
        </div>
      ) : threads.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">💬</p>
          <p>Aucune discussion sur le forum.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((t) => (
            <div key={t.id} className="card-hover flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {t.isPinned && <span>📌</span>}
                  {t.isLocked && <span>🔒</span>}
                  <h3 className="font-semibold text-brand-petrol truncate">{t.title}</h3>
                  <ForumCategoryBadge category={t.category} />
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{t.authorName}</span>
                  <span>·</span>
                  <span>{formatDate(t.createdAt)}</span>
                  <span>·</span>
                  <span>{t.replyCount} réponses</span>
                  <span>·</span>
                  <span>{t.viewCount} vues</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href={`/dashboard/admin/forum/${t.id}`}
                  className="px-3 py-1.5 text-xs rounded-lg bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20 transition-colors"
                >
                  Voir
                </Link>
                <button
                  onClick={() => togglePin(t.id, t.isPinned)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                >
                  {t.isPinned ? 'Désépingler' : 'Épingler'}
                </button>
                <button
                  onClick={() => toggleLock(t.id, t.isLocked)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  {t.isLocked ? 'Déverrouiller' : 'Verrouiller'}
                </button>
                <button
                  onClick={() => deleteThread(t.id, t.title)}
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
