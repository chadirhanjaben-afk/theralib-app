'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function AdminReviewsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<unknown[]>([]);
  const [users, setUsers] = useState<unknown[]>([]);
  const [professionals, setProfessionals] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    fetchData();
  }, [user, router]);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) return;
      const data = await res.json();
      setReviews(data.reviews || []);
      setUsers(data.users || []);
      setProfessionals(data.professionals || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (id: string) => {
    const u = users.find((u: unknown) => (u as { uid: string }).uid === id);
    return (u as { displayName?: string; email?: string } | undefined)?.displayName || (u as { displayName?: string; email?: string } | undefined)?.email || '?';
  };

  const getProName = (id: string) => {
    const p = professionals.find((p: unknown) => (p as { uid?: string; userId?: string }).uid === id || (p as { uid?: string; userId?: string }).userId === id);
    return (p as { businessName?: string } | undefined)?.businessName || '?';
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet avis ? Cette action est irréversible.')) return;

    setDeletingId(reviewId);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId }),
      });

      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      } else {
        const data = await res.json();
        alert(`Erreur : ${data.error || 'Impossible de supprimer l\'avis'}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredReviews = reviews
    .filter((r) => ratingFilter === null || r.rating === ratingFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s: number, r: unknown) => s + (r as { rating: number }).rating, 0) / reviews.length).toFixed(1)
    : '0';

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Modération des avis</h1>
        <p className="text-brand-blue-gray text-sm mt-1">
          {reviews.length} avis · Note moyenne : {avgRating}/5
        </p>
      </div>

      {/* Rating filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setRatingFilter(null)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            ratingFilter === null ? 'bg-brand-teal text-white' : 'bg-gray-100 text-brand-blue-gray hover:bg-gray-200'
          }`}
        >
          Tous ({reviews.length})
        </button>
        {[5, 4, 3, 2, 1].map((star) => (
          <button
            key={star}
            onClick={() => setRatingFilter(star)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              ratingFilter === star ? 'bg-brand-teal text-white' : 'bg-gray-100 text-brand-blue-gray hover:bg-gray-200'
            }`}
          >
            {'★'.repeat(star)}{'☆'.repeat(5 - star)} ({reviews.filter(r => r.rating === star).length})
          </button>
        ))}
      </div>

      {/* Reviews list */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-3xl mb-3">⭐</p>
            <p className="font-medium">Aucun avis dans cette catégorie</p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div key={review.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-lg ${star <= review.rating ? 'text-amber-400' : 'text-gray-200'}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-sm font-bold">{review.rating}/5</span>
                    </div>
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      disabled={deletingId === review.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {deletingId === review.id ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>

                  <p className="text-sm mb-3">{review.comment || 'Pas de commentaire'}</p>

                  {review.response && (
                    <div className="bg-gray-50 rounded-xl p-3 mb-3">
                      <p className="text-xs font-medium text-brand-blue-gray mb-1">Réponse du professionnel :</p>
                      <p className="text-sm">{review.response}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-brand-blue-gray">
                    <span>Par : <span className="font-medium">{getUserName(review.clientId)}</span></span>
                    <span>Pour : <span className="font-medium">{getProName(review.professionalId)}</span></span>
                    <span>{review.createdAt ? new Date(review.createdAt).toLocaleDateString('fr-FR') : '?'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
