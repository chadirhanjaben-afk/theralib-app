'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';

interface ReferralData {
  referralCode: string | null;
  referredBy: { name: string; code: string } | null;
  stats: {
    totalReferrals: number;
    pendingCount: number;
    activeCount: number;
    paidCount: number;
    totalCommission: number;
  };
  referrals: {
    id: string;
    referredName: string;
    referredEmail: string;
    status: string;
    commission: number;
    createdAt: string;
  }[];
}

export default function AffiliationPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/affiliation/my-referrals', { credentials: 'same-origin' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch referral data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const generateCode = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/affiliation/generate-code', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (res.ok) {
        const { code } = await res.json();
        setData((prev) => prev ? { ...prev, referralCode: code } : null);
      }
    } catch (err) {
      console.error('Failed to generate code:', err);
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = () => {
    if (!data?.referralCode) return;
    navigator.clipboard.writeText(data.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    if (!data?.referralCode) return;
    const link = `${window.location.origin}/register?ref=${data.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending': return { text: 'En attente', color: 'bg-yellow-100 text-yellow-700' };
      case 'active': return { text: 'Actif', color: 'bg-green-100 text-green-700' };
      case 'paid': return { text: 'Payé', color: 'bg-blue-100 text-blue-700' };
      default: return { text: status, color: 'bg-gray-100 text-gray-700' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-brand-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Parrainage</h1>
        <p className="text-brand-blue-gray mt-1">
          Invitez vos proches et gagnez des récompenses pour chaque inscription.
        </p>
      </div>

      {/* Referral Code Card */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Votre code de parrainage</h2>

        {data?.referralCode ? (
          <div className="space-y-4">
            {/* Code display */}
            <div className="flex items-center gap-4">
              <div className="bg-brand-teal-bg border-2 border-dashed border-brand-teal rounded-xl px-6 py-3">
                <span className="text-2xl font-bold tracking-widest text-brand-teal">
                  {data.referralCode}
                </span>
              </div>
              <button
                onClick={copyCode}
                className="btn-secondary text-sm"
              >
                {copied ? 'Copié !' : 'Copier le code'}
              </button>
            </div>

            {/* Referral link */}
            <div>
              <p className="text-sm text-brand-blue-gray mb-2">Ou partagez votre lien d&apos;inscription :</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${data.referralCode}` : ''}
                  className="input-field text-sm flex-1 bg-gray-50"
                />
                <button
                  onClick={copyLink}
                  className="btn-primary text-sm whitespace-nowrap"
                >
                  {copiedLink ? 'Lien copié !' : 'Copier le lien'}
                </button>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-gray-50 rounded-xl p-4 mt-4">
              <h3 className="text-sm font-semibold mb-2">Comment ça marche ?</h3>
              <ol className="text-sm text-brand-blue-gray space-y-1.5 list-decimal list-inside">
                <li>Partagez votre code ou lien avec vos proches</li>
                <li>Ils s&apos;inscrivent en utilisant votre code</li>
                <li>Quand ils effectuent leur première réservation payée, vous êtes récompensé</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-brand-blue-gray mb-4">
              Vous n&apos;avez pas encore de code de parrainage. Générez-en un pour commencer à inviter vos proches.
            </p>
            <button
              onClick={generateCode}
              disabled={generating}
              className="btn-primary disabled:opacity-50"
            >
              {generating ? 'Génération...' : 'Générer mon code'}
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      {data && data.stats.totalReferrals > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-brand-teal">{data.stats.totalReferrals}</p>
            <p className="text-xs text-brand-blue-gray mt-1">Total filleuls</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-yellow-600">{data.stats.pendingCount}</p>
            <p className="text-xs text-brand-blue-gray mt-1">En attente</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-green-600">{data.stats.activeCount}</p>
            <p className="text-xs text-brand-blue-gray mt-1">Actifs</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-blue-600">{data.stats.totalCommission} €</p>
            <p className="text-xs text-brand-blue-gray mt-1">Gains totaux</p>
          </div>
        </div>
      )}

      {/* Referrals list */}
      {data && data.referrals.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Mes filleuls</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-brand-blue-gray">Nom</th>
                  <th className="text-left py-3 px-2 font-medium text-brand-blue-gray">Date</th>
                  <th className="text-left py-3 px-2 font-medium text-brand-blue-gray">Statut</th>
                  <th className="text-right py-3 px-2 font-medium text-brand-blue-gray">Commission</th>
                </tr>
              </thead>
              <tbody>
                {data.referrals.map((ref) => {
                  const sl = statusLabel(ref.status);
                  return (
                    <tr key={ref.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 px-2">
                        <p className="font-medium">{ref.referredName}</p>
                        <p className="text-xs text-brand-blue-gray">{ref.referredEmail}</p>
                      </td>
                      <td className="py-3 px-2 text-brand-blue-gray">
                        {new Date(ref.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${sl.color}`}>
                          {sl.text}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-medium">
                        {ref.commission > 0 ? `${ref.commission} €` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {data && data.referrals.length === 0 && data.referralCode && (
        <div className="card text-center py-8">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-brand-blue-gray">
            Vous n&apos;avez pas encore de filleuls. Partagez votre code pour commencer !
          </p>
        </div>
      )}

      {/* Referred by section */}
      {data?.referredBy && (
        <div className="card bg-brand-teal-bg border border-brand-teal/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-teal/20 flex items-center justify-center">
              <span className="text-brand-teal text-lg">🎁</span>
            </div>
            <div>
              <p className="text-sm font-medium">
                Vous avez été parrainé par <strong>{data.referredBy.name}</strong>
              </p>
              <p className="text-xs text-brand-blue-gray">
                Code utilisé : {data.referredBy.code}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
