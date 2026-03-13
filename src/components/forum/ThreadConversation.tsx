'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { ForumCategoryBadge } from './ForumCategoryBadge';

interface ThreadData {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  isPinned: boolean;
  isLocked: boolean;
  replyCount: number;
  viewCount: number;
  createdAt: { _seconds: number };
}

interface ReplyData {
  id: string;
  threadId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  likes: string[];
  createdAt: { _seconds: number };
}

interface ThreadConversationProps {
  threadSlug: string;
  isAdmin?: boolean;
}

export default function ThreadConversation({
  threadSlug,
  isAdmin = false,
}: ThreadConversationProps) {
  const { user } = useAuth();
  const [thread, setThread] = useState<ThreadData | null>(null);
  const [replies, setReplies] = useState<ReplyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const repliesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchThread();
  }, [threadSlug]);

  async function fetchThread() {
    try {
      const res = await fetch(`/api/forum/threads/${threadSlug}`);
      if (!res.ok) {
        setError('Discussion introuvable');
        return;
      }
      const data = await res.json();
      setThread(data.thread);
      setReplies(data.replies || []);
    } catch {
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyContent.trim() || !thread) return;

    setSending(true);
    try {
      const res = await fetch(`/api/forum/threads/${thread.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur');
        return;
      }

      setReplyContent('');
      // Refresh to get the new reply
      await fetchThread();
      setTimeout(() => repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      setError('Erreur réseau');
    } finally {
      setSending(false);
    }
  }

  async function toggleLike(replyId: string) {
    if (!user || !thread) return;

    try {
      const res = await fetch(`/api/forum/threads/${thread.id}/replies/${replyId}/like`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setReplies((prev) =>
          prev.map((r) =>
            r.id === replyId
              ? {
                  ...r,
                  likes: data.liked
                    ? [...r.likes, user.uid]
                    : r.likes.filter((id) => id !== user.uid),
                }
              : r
          )
        );
      }
    } catch {
      // silently fail
    }
  }

  async function togglePin() {
    if (!thread) return;
    await fetch(`/api/forum/threads/${thread.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPinned: !thread.isPinned }),
    });
    setThread((t) => (t ? { ...t, isPinned: !t.isPinned } : t));
  }

  async function toggleLock() {
    if (!thread) return;
    await fetch(`/api/forum/threads/${thread.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isLocked: !thread.isLocked }),
    });
    setThread((t) => (t ? { ...t, isLocked: !t.isLocked } : t));
  }

  function formatDate(ts: { _seconds: number }) {
    return new Date(ts._seconds * 1000).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const roleBadge = (role: string) => {
    if (role === 'professional')
      return <span className="text-xs bg-brand-teal/10 text-brand-teal px-2 py-0.5 rounded-full">Pro</span>;
    if (role === 'admin')
      return <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Admin</span>;
    return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Membre</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal"></div>
      </div>
    );
  }

  if (error && !thread) {
    return <div className="text-center py-12 text-red-500">{error}</div>;
  }

  if (!thread) return null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Thread header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ForumCategoryBadge category={thread.category} />
          {thread.isPinned && <span className="text-xs">📌 Épinglé</span>}
          {thread.isLocked && <span className="text-xs">🔒 Verrouillé</span>}
        </div>
        <h1 className="text-2xl font-bold text-brand-petrol mb-2">{thread.title}</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            {thread.authorName} {roleBadge(thread.authorRole)}
          </span>
          <span>·</span>
          <span>{formatDate(thread.createdAt)}</span>
          <span>·</span>
          <span>{thread.viewCount} vues</span>
          <span>·</span>
          <span>{thread.replyCount} réponses</span>
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={togglePin}
              className="px-3 py-1 text-xs rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
            >
              {thread.isPinned ? 'Désépingler' : 'Épingler'}
            </button>
            <button
              onClick={toggleLock}
              className="px-3 py-1 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              {thread.isLocked ? 'Déverrouiller' : 'Verrouiller'}
            </button>
          </div>
        )}
      </div>

      {/* Original post */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4 shadow-sm">
        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
          {thread.content}
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="space-y-3 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {replies.length} réponse{replies.length > 1 ? 's' : ''}
          </h2>
          {replies.map((reply) => (
            <div
              key={reply.id}
              className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-sm text-brand-petrol">
                  {reply.authorName}
                </span>
                {roleBadge(reply.authorRole)}
                <span className="text-xs text-gray-400 ml-auto">
                  {formatDate(reply.createdAt)}
                </span>
              </div>
              <div className="text-gray-700 text-sm whitespace-pre-wrap mb-3">
                {reply.content}
              </div>
              {user && (
                <button
                  onClick={() => toggleLike(reply.id)}
                  className={`text-xs flex items-center gap-1 transition-colors ${
                    reply.likes.includes(user.uid)
                      ? 'text-red-500'
                      : 'text-gray-400 hover:text-red-400'
                  }`}
                >
                  {reply.likes.includes(user.uid) ? '❤️' : '🤍'} {reply.likes.length}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div ref={repliesEndRef} />

      {/* Reply form */}
      {thread.isLocked && !isAdmin ? (
        <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-xl">
          🔒 Cette discussion est verrouillée. Vous ne pouvez plus répondre.
        </div>
      ) : user ? (
        <form onSubmit={handleReply} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows={4}
            maxLength={5000}
            placeholder="Votre réponse..."
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal transition-colors resize-y text-sm"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">{replyContent.length}/5000</span>
            <button
              type="submit"
              disabled={sending || !replyContent.trim()}
              className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Envoi...' : 'Répondre'}
            </button>
          </div>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </form>
      ) : (
        <div className="text-center py-6 text-gray-500 text-sm bg-gray-50 rounded-xl">
          <a href="/auth/login" className="text-brand-teal hover:underline">
            Connectez-vous
          </a>{' '}
          pour participer à la discussion.
        </div>
      )}
    </div>
  );
}
