'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface BlogEditorProps {
  postId?: string; // undefined = create new
}

const CATEGORIES = [
  'bien-etre',
  'meditation',
  'nutrition',
  'yoga',
  'massage',
  'osteopathie',
  'naturopathie',
  'sophrologie',
  'psychologie',
  'conseils',
  'actualites',
];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

export default function BlogEditor({ postId }: BlogEditorProps) {
  const router = useRouter();
  const isEditing = !!postId;

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [category, setCategory] = useState('bien-etre');
  const [tags, setTags] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [autoSlug, setAutoSlug] = useState(!isEditing);

  // Load existing post
  useEffect(() => {
    if (!postId) return;
    fetch(`/api/blog/posts/${postId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.post) {
          const p = data.post;
          setTitle(p.title || '');
          setSlug(p.slug || '');
          setExcerpt(p.excerpt || '');
          setContent(p.content || '');
          setCoverImage(p.coverImage || '');
          setCategory(p.category || 'bien-etre');
          setTags((p.tags || []).join(', '));
          setSeoTitle(p.seoTitle || '');
          setSeoDescription(p.seoDescription || '');
          setStatus(p.status || 'draft');
          setAutoSlug(false);
        }
      })
      .catch(() => setError('Erreur chargement article'))
      .finally(() => setLoading(false));
  }, [postId]);

  // Auto-generate slug from title
  useEffect(() => {
    if (autoSlug && title) {
      setSlug(generateSlug(title));
    }
  }, [title, autoSlug]);

  async function handleSave(publishStatus: 'draft' | 'published') {
    setError('');

    if (!title.trim() || !content.trim()) {
      setError('Le titre et le contenu sont requis');
      return;
    }
    if (!slug.trim()) {
      setError('Le slug est requis');
      return;
    }

    setSaving(true);
    try {
      const body = {
        title,
        slug,
        excerpt,
        content,
        coverImage: coverImage || undefined,
        category,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        status: publishStatus,
        seoTitle: seoTitle || undefined,
        seoDescription: seoDescription || undefined,
      };

      const url = isEditing
        ? `/api/blog/posts/${postId}`
        : '/api/blog/posts';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }

      router.push('/dashboard/admin/blog');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-brand-petrol mb-1">
          Titre
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre de l'article"
          className="input-field text-lg font-semibold"
          maxLength={150}
        />
      </div>

      {/* Slug */}
      <div>
        <label className="block text-sm font-medium text-brand-petrol mb-1">
          Slug (URL)
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">/blog/</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setAutoSlug(false);
            }}
            placeholder="slug-de-larticle"
            className="input-field flex-1"
          />
        </div>
      </div>

      {/* Excerpt */}
      <div>
        <label className="block text-sm font-medium text-brand-petrol mb-1">
          Extrait / description courte
        </label>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Court résumé pour les cartes et le SEO..."
          rows={2}
          className="input-field resize-none"
          maxLength={300}
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{excerpt.length}/300</p>
      </div>

      {/* Content */}
      <div>
        <label className="block text-sm font-medium text-brand-petrol mb-1">
          Contenu (HTML)
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="<h2>Introduction</h2><p>Votre contenu ici...</p>"
          rows={15}
          className="input-field font-mono text-sm resize-y"
        />
        <p className="text-xs text-gray-400 mt-1">
          Utilisez du HTML. Vous pouvez utiliser les balises h2, h3, p, ul, ol, li, strong, em, a, img, blockquote.
        </p>
      </div>

      {/* Cover image URL */}
      <div>
        <label className="block text-sm font-medium text-brand-petrol mb-1">
          Image de couverture (URL)
        </label>
        <input
          type="url"
          value={coverImage}
          onChange={(e) => setCoverImage(e.target.value)}
          placeholder="https://..."
          className="input-field"
        />
      </div>

      {/* Category + Tags */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-brand-petrol mb-1">
            Catégorie
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-petrol mb-1">
            Tags (séparés par des virgules)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="bien-être, santé, relaxation"
            className="input-field"
          />
        </div>
      </div>

      {/* SEO overrides */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-brand-teal hover:underline">
          Options SEO avancées
        </summary>
        <div className="mt-4 space-y-4 pl-2 border-l-2 border-brand-teal/20">
          <div>
            <label className="block text-sm font-medium text-brand-petrol mb-1">
              Titre SEO (override)
            </label>
            <input
              type="text"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="Laissez vide pour utiliser le titre de l'article"
              className="input-field"
              maxLength={70}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-petrol mb-1">
              Meta description (override)
            </label>
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="Laissez vide pour utiliser l'extrait"
              rows={2}
              className="input-field resize-none"
              maxLength={160}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {seoDescription.length}/160
            </p>
          </div>
        </div>
      </details>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
        <button
          onClick={() => handleSave('draft')}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer comme brouillon'}
        </button>
        <button
          onClick={() => handleSave('published')}
          disabled={saving}
          className="btn-primary disabled:opacity-50"
        >
          {saving
            ? 'Publication...'
            : status === 'published'
            ? 'Mettre à jour'
            : 'Publier'}
        </button>
        <button
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
