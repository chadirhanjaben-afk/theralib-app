'use client';

import { useState, useEffect, useCallback } from 'react';

interface PromoCode {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minBookingAmount: number;
  maxUses: number;
  currentUses: number;
  isActive: boolean;
  expiresAt?: { _seconds: number } | null;
  createdAt?: { _seconds: number };
}

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [form, setForm] = useState({
    code: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 10,
    minBookingAmount: 0,
    maxUses: -1,
    expiresAt: '',
  });

  const fetchPromos = useCallback(async () => {
    try {
      const res = await fetch('/api/promos');
      if (!res.ok) throw new Error('Erreur chargement');
      const data = await res.json();
      setPromos(data.promos || []);
    } catch {
      setError('Erreur lors du chargement des codes promos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          expiresAt: form.expiresAt || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur création');
      }

      setSuccess('Code promo créé avec succès');
      setShowForm(false);
      setForm({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: 10,
        minBookingAmount: 0,
        maxUses: -1,
        expiresAt: '',
      });
      fetchPromos();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (promoId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/promos/${promoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (!res.ok) throw new Error('Erreur');
      fetchPromos();
    } catch {
      setError('Erreur lors de la mise à jour');
    }
  };

  const deletePromo = async (promoId: string) => {
    if (!confirm('Supprimer ce code promo ?')) return;
    try {
      const res = await fetch(`/api/promos/${promoId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erreur');
      fetchPromos();
    } catch {
      setError('Erreur lors de la suppression');
    }
  };

  const formatDate = (ts?: { _seconds: number } | null) => {
    if (!ts || !ts._seconds) return '—';
    return new Date(ts._seconds * 1000).toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-teal border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-petrol">Codes Promos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {promos.length} code{promos.length !== 1 ? 's' : ''} promo
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-brand-teal/90 transition-colors"
        >
          {showForm ? 'Annuler' : '+ Nouveau code'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4"
        >
          <h2 className="font-semibold text-brand-petrol">Nouveau code promo</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="BIENVENUE20"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                required
              />
              <p className="text-xs text-gray-400 mt-1">3 à 20 caractères alphanumériques</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Réduction de bienvenue"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de réduction</label>
              <select
                value={form.discountType}
                onChange={(e) =>
                  setForm({ ...form, discountType: e.target.value as 'percentage' | 'fixed' })
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
              >
                <option value="percentage">Pourcentage (%)</option>
                <option value="fixed">Montant fixe (€)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valeur ({form.discountType === 'percentage' ? '%' : '€'})
              </label>
              <input
                type="number"
                min={1}
                max={form.discountType === 'percentage' ? 100 : 9999}
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant minimum (€)
              </label>
              <input
                type="number"
                min={0}
                value={form.minBookingAmount}
                onChange={(e) => setForm({ ...form, minBookingAmount: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
              />
              <p className="text-xs text-gray-400 mt-1">0 = pas de minimum</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Utilisations max
              </label>
              <input
                type="number"
                min={-1}
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
              />
              <p className="text-xs text-gray-400 mt-1">-1 = illimité</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date d&apos;expiration
              </label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
              />
              <p className="text-xs text-gray-400 mt-1">Laisser vide = pas d&apos;expiration</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-teal px-6 py-2 text-sm font-medium text-white hover:bg-brand-teal/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Création...' : 'Créer le code'}
            </button>
          </div>
        </form>
      )}

      {/* Promos Table */}
      {promos.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-gray-100">
          <p className="text-4xl mb-3">🏷️</p>
          <p className="text-gray-500">Aucun code promo pour le moment</p>
          <p className="text-sm text-gray-400 mt-1">Créez votre premier code promo</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 font-medium text-gray-500">Code</th>
                <th className="px-4 py-3 font-medium text-gray-500">Réduction</th>
                <th className="px-4 py-3 font-medium text-gray-500">Min.</th>
                <th className="px-4 py-3 font-medium text-gray-500">Utilisations</th>
                <th className="px-4 py-3 font-medium text-gray-500">Expire</th>
                <th className="px-4 py-3 font-medium text-gray-500">Statut</th>
                <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promos.map((promo) => (
                <tr key={promo.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-mono font-semibold text-brand-petrol">
                        {promo.code}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">{promo.description}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {promo.discountType === 'percentage'
                      ? `${promo.discountValue}%`
                      : `${promo.discountValue}€`}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {promo.minBookingAmount > 0 ? `${promo.minBookingAmount}€` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {promo.currentUses}/{promo.maxUses === -1 ? '∞' : promo.maxUses}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(promo.expiresAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        promo.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {promo.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(promo.id, promo.isActive)}
                        className="text-xs text-brand-teal hover:underline"
                      >
                        {promo.isActive ? 'Désactiver' : 'Activer'}
                      </button>
                      <button
                        onClick={() => deletePromo(promo.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
