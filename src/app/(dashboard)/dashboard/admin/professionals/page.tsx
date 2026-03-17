'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface ProData {
  uid: string;
  userId: string;
  businessName: string;
  specialties: string[];
  description: string;
  address: { city: string; postalCode: string };
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isActive: boolean;
  stripeOnboarded: boolean;
  subscriptionTier: string;
  createdAt: string;
}

export default function AdminProfessionalsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [professionals, setProfessionals] = useState<ProData[]>([]);
  const [users, setUsers] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('all');

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
      setProfessionals(data.professionals || []);
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getUserEmail = (userId: string) => {
    const user = users.find((u: unknown) => (u as { uid: string }).uid === userId);
    return (user as { email?: string } | undefined)?.email || '?';
  };

  const handleVerify = async (pro: ProData) => {
    const userId = pro.userId || pro.uid;
    setActionLoading(userId + 'verify');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'verifyPro' }),
      });
      if (res.ok) {
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erreur');
      }
    } catch (err) {
      alert('Erreur réseau');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (pro: ProData) => {
    const userId = pro.userId || pro.uid;
    setActionLoading(userId + 'active');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'toggleProActive' }),
      });
      if (res.ok) {
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erreur');
      }
    } catch (err) {
      alert('Erreur réseau');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredPros = professionals
    .filter((p) => {
      if (filter === 'verified') return p.isVerified;
      if (filter === 'unverified') return !p.isVerified;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const TIER_LABELS: Record<string, string> = {
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise',
  };

  const TIER_COLORS: Record<string, string> = {
    starter: 'bg-gray-100 text-gray-600',
    professional: 'bg-blue-50 text-blue-600',
    enterprise: 'bg-purple-50 text-purple-600',
  };

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
        <h1 className="text-2xl font-bold">Gestion des professionnels</h1>
        <p className="text-brand-blue-gray text-sm mt-1">{professionals.length} professionnels inscrits</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'verified', 'unverified'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-brand-teal text-white'
                : 'bg-gray-100 text-brand-blue-gray hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? `Tous (${professionals.length})`
              : f === 'verified' ? `Vérifiés (${professionals.filter(p => p.isVerified).length})`
              : `Non vérifiés (${professionals.filter(p => !p.isVerified).length})`
            }
          </button>
        ))}
      </div>

      {/* Professionals list */}
      <div className="space-y-4">
        {filteredPros.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-3xl mb-3">🩺</p>
            <p className="font-medium">Aucun professionnel dans cette catégorie</p>
          </div>
        ) : (
          filteredPros.map((pro) => (
            <div key={pro.uid} className={`card ${!pro.isActive ? 'opacity-60' : ''}`}>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-semibold">{pro.businessName || 'Sans nom'}</h3>
                    {pro.isVerified ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600">Vérifié</span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Non vérifié</span>
                    )}
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${TIER_COLORS[pro.subscriptionTier] || 'bg-gray-100'}`}>
                      {TIER_LABELS[pro.subscriptionTier] || pro.subscriptionTier}
                    </span>
                    {pro.stripeOnboarded && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">Stripe</span>
                    )}
                    {!pro.isActive && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">Désactivé</span>
                    )}
                  </div>

                  <p className="text-xs text-brand-blue-gray mb-1">{getUserEmail(pro.userId || pro.uid)}</p>

                  {pro.specialties?.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-2">
                      {pro.specialties.map((s) => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-teal-bg text-brand-teal">{s}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-brand-blue-gray">
                    {pro.address?.city && <span>{pro.address.city} {pro.address.postalCode}</span>}
                    <span>{pro.rating || 0}/5 ({pro.reviewCount || 0} avis)</span>
                    <span>Inscrit le {pro.createdAt ? new Date(pro.createdAt).toLocaleDateString('fr-FR') : '?'}</span>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleVerify(pro)}
                    disabled={actionLoading === (pro.userId || pro.uid) + 'verify'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                      pro.isVerified
                        ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {actionLoading === (pro.userId || pro.uid) + 'verify'
                      ? '...'
                      : pro.isVerified ? 'Retirer vérification' : 'Vérifier'
                    }
                  </button>
                  <button
                    onClick={() => handleToggleActive(pro)}
                    disabled={actionLoading === (pro.userId || pro.uid) + 'active'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                      pro.isActive
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {actionLoading === (pro.userId || pro.uid) + 'active'
                      ? '...'
                      : pro.isActive ? 'Désactiver' : 'Activer'
                    }
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
