'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    try {
      // For now, just simulate sending — integrate with an API route later
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStatus('sent');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      setStatus('error');
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-16">
      <Link href="/" className="text-brand-teal text-sm hover:underline mb-8 inline-block">← Retour à l&apos;accueil</Link>

      <h1 className="text-3xl font-bold mb-3">Contactez-nous</h1>
      <p className="text-brand-blue-gray text-sm mb-8">
        Une question, une suggestion ou un problème ? N&apos;hésitez pas à nous écrire.
      </p>

      {status === 'sent' ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-4">✅</p>
          <h2 className="text-xl font-bold mb-2">Message envoyé !</h2>
          <p className="text-sm text-brand-blue-gray mb-6">
            Nous vous répondrons dans les plus brefs délais.
          </p>
          <button
            onClick={() => setStatus('idle')}
            className="btn-primary text-sm"
          >
            Envoyer un autre message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Nom complet
            </label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border-0 text-sm focus:ring-2 focus:ring-brand-teal/30 focus:bg-white transition-colors"
              placeholder="Jean Dupont"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border-0 text-sm focus:ring-2 focus:ring-brand-teal/30 focus:bg-white transition-colors"
              placeholder="jean@email.com"
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1.5">
              Sujet
            </label>
            <select
              id="subject"
              required
              value={form.subject}
              onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border-0 text-sm focus:ring-2 focus:ring-brand-teal/30 focus:bg-white transition-colors"
            >
              <option value="">Sélectionnez un sujet</option>
              <option value="general">Question générale</option>
              <option value="booking">Problème de réservation</option>
              <option value="account">Mon compte</option>
              <option value="payment">Paiement / Remboursement</option>
              <option value="pro">Je suis praticien</option>
              <option value="bug">Signaler un bug</option>
              <option value="other">Autre</option>
            </select>
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">
              Message
            </label>
            <textarea
              id="message"
              required
              rows={5}
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border-0 text-sm focus:ring-2 focus:ring-brand-teal/30 focus:bg-white transition-colors resize-none"
              placeholder="Décrivez votre demande..."
            />
          </div>

          {status === 'error' && (
            <p className="text-sm text-red-500">Une erreur est survenue. Veuillez réessayer.</p>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="btn-primary w-full text-sm disabled:opacity-50"
          >
            {status === 'sending' ? 'Envoi en cours...' : 'Envoyer le message'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Vous pouvez aussi nous écrire directement à{' '}
            <a href="mailto:contact@theralib.net" className="text-brand-teal hover:underline">
              contact@theralib.net
            </a>
          </p>
        </form>
      )}
    </main>
  );
}
