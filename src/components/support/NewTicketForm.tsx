'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TicketCategory } from '@/types';

const categories: { value: TicketCategory; label: string }[] = [
  { value: 'booking', label: 'Réservation' },
  { value: 'payment', label: 'Paiement' },
  { value: 'account', label: 'Mon compte' },
  { value: 'technical', label: 'Problème technique' },
  { value: 'other', label: 'Autre' },
];

interface NewTicketFormProps {
  redirectPath: string; // e.g. "/dashboard/client/support"
}

export default function NewTicketForm({ redirectPath }: NewTicketFormProps) {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('other');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!subject.trim() || !message.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, category, message }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }

      const data = await res.json();
      router.push(`${redirectPath}/${data.ticketId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du ticket');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-brand-petrol mb-1">
          Sujet
        </label>
        <input
          id="subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Décrivez brièvement votre problème"
          className="input-field"
          maxLength={120}
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-brand-petrol mb-1">
          Catégorie
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as TicketCategory)}
          className="input-field"
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-brand-petrol mb-1">
          Message
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Expliquez votre problème en détail..."
          rows={5}
          className="input-field resize-none"
          maxLength={2000}
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/2000</p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full disabled:opacity-50"
      >
        {submitting ? 'Envoi en cours...' : 'Envoyer le ticket'}
      </button>
    </form>
  );
}
