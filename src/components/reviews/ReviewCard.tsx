'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ReviewProps {
  id: string;
  clientName: string;
  rating: number;
  comment: string;
  photos?: string[];
  isVerified: boolean;
  response?: string | null;
  helpfulCount: number;
  createdAt: { _seconds: number } | null;
  showActions?: boolean;
  onHelpful?: (id: string) => void;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} sur 5 étoiles`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-4 w-4 ${star <= rating ? 'text-brand-warm' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function ReviewCard({
  id,
  clientName,
  rating,
  comment,
  photos,
  isVerified,
  response,
  helpfulCount,
  createdAt,
  showActions = true,
  onHelpful,
}: ReviewProps) {
  const [showPhotos, setShowPhotos] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const dateStr = createdAt?._seconds
    ? new Date(createdAt._seconds * 1000).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-brand-teal/10 flex items-center justify-center text-brand-teal font-bold text-sm">
            {clientName[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-brand-petrol">{clientName}</span>
              {isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                  Vérifié
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <StarRating rating={rating} />
              {dateStr && <span className="text-xs text-gray-400">{dateStr}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Comment */}
      <p className="text-sm text-brand-petrol leading-relaxed">{comment}</p>

      {/* Photos */}
      {photos && photos.length > 0 && (
        <div className="flex gap-2">
          {photos.map((photo, i) => (
            <button
              key={i}
              onClick={() => { setSelectedPhoto(photo); setShowPhotos(true); }}
              className="relative h-16 w-16 rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-brand-teal transition-all"
            >
              <Image
                src={photo}
                alt={`Photo ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Pro response */}
      {response && (
        <div className="rounded-lg bg-gray-50 p-3 ml-4 border-l-2 border-brand-teal">
          <p className="text-xs font-semibold text-brand-teal mb-1">Réponse du professionnel</p>
          <p className="text-sm text-brand-petrol">{response}</p>
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-4 pt-1">
          <button
            onClick={() => onHelpful?.(id)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-teal transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
            </svg>
            Utile {helpfulCount > 0 && `(${helpfulCount})`}
          </button>
        </div>
      )}

      {/* Photo lightbox */}
      {showPhotos && selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowPhotos(false)}
        >
          <div className="relative max-w-2xl max-h-[80vh]">
            <Image
              src={selectedPhoto}
              alt="Photo avis"
              width={800}
              height={600}
              className="rounded-xl object-contain max-h-[80vh]"
            />
            <button
              onClick={() => setShowPhotos(false)}
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
