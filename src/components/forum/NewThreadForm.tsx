'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { categoryLabels } from './ForumCategoryBadge';

interface NewThreadFormProps {
  redirectPath?: string; // e.g. /forum
}

export default function NewThreadForm({ redirectPath = '/forum' }: NewThreadFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Titre et contenu requis');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/forum/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), category }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur lors de la création');
        return;
      }

      const data = await res.json();
      router.push(`${redirectPath}/${data.slug}`);
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Catégorie
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal transition-colors"
        >
          {Object.entries(categoryLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Titre
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={150}
          placeholder="Votre question ou sujet de discussion..."
          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal transition-colors"
        />
        <p className="text-xs text-gray-400 mt-1">{title.length}/150</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contenu
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          maxLength={5000}
          placeholder="Décrivez votre sujet en détail..."
          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal transition-colors resize-y"
        />
        <p className="text-xs text-gray-400 mt-1">{content.length}/5000</p>
      </div>

      <button
        type="submit"
        disabled={loading || !title.trim() || !content.trim()}
        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Publication...' : 'Publier la discussion'}
      </button>
    </form>
  );
}
