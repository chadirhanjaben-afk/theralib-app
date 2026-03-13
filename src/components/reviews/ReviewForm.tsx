'use client';

import { useState } from 'react';

interface ReviewFormProps {
  bookingId: string;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function ReviewForm({ bookingId, onSubmit, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Veuillez sélectionner une note');
      return;
    }
    if (!comment.trim()) {
      setError('Veuillez écrire un commentaire');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bookingId,
          rating,
          comment: comment.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur lors de l\'envoi');
        return;
      }

      onSubmit();
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Star rating */}
      <div>
        <label className="block text-sm font-medium text-brand-petrol mb-2">
          Votre note
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <svg
                className={`h-8 w-8 ${
                  star <= (hoverRating || rating) ? 'text-brand-warm' : 'text-gray-200'
                } transition-colors`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div>
        <label htmlFor="review-comment" className="block text-sm font-medium text-brand-petrol mb-1">
          Votre avis
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Partagez votre expérience..."
          rows={4}
          maxLength={2000}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">{comment.length}/2000</p>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-brand-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-teal/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Envoi...' : 'Publier mon avis'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-5 py-2.5 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
