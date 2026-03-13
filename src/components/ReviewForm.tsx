'use client';

import { useState } from 'react';

interface ReviewFormProps {
  bookingId: string;
  clientId: string;
  professionalId: string;
  proName: string;
  onClose: () => void;
  onSubmitted: () => void;
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <svg
            className={`w-8 h-8 transition-colors ${
              star <= (hover || value) ? 'text-brand-warm fill-current' : 'text-gray-200 fill-current'
            }`}
            viewBox="0 0 20 20"
          >
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function ReviewForm({
  bookingId,
  proName,
  onClose,
  onSubmitted,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Veuillez sélectionner une note.');
      return;
    }
    if (comment.trim().length < 10) {
      setError('Votre commentaire doit contenir au moins 10 caractères.');
      return;
    }

    setSubmitting(true);
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
        setError(data.error || 'Une erreur est survenue.');
        return;
      }

      onSubmitted();
    } catch (err) {
      console.error('Error submitting review:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Laisser un avis</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-brand-blue-gray mb-5">
          Comment s&apos;est passée votre séance avec <span className="font-medium text-brand-petrol">{proName}</span> ?
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Star Rating */}
          <div>
            <label className="block text-sm font-medium mb-2">Votre note</label>
            <StarInput value={rating} onChange={setRating} />
            {rating > 0 && (
              <p className="text-xs text-brand-blue-gray mt-1">
                {rating === 1 && 'Décevant'}
                {rating === 2 && 'Passable'}
                {rating === 3 && 'Correct'}
                {rating === 4 && 'Très bien'}
                {rating === 5 && 'Excellent !'}
              </p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label htmlFor="review-comment" className="block text-sm font-medium mb-2">
              Votre commentaire
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Décrivez votre expérience..."
              rows={4}
              maxLength={2000}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-brand-teal focus:outline-none transition-colors text-sm resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{comment.length}/2000</p>
          </div>

          {error && (
            <p className="text-sm text-red-500 font-medium">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-sm"
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {submitting ? 'Envoi...' : 'Publier mon avis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
