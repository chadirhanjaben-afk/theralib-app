'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  phone?: string;
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'client' | 'professional' | 'admin'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    fetchUsers();
  }, [user, router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) return;
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId: string, action: string, data?: any) => {
    setActionLoading(userId + action);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, data }),
      });
      if (res.ok) {
        await fetchUsers(); // Refresh
      } else {
        const err = await res.json();
        alert(err.error || 'Erreur');
      }
    } catch (err) {
      console.error('Action error:', err);
      alert('Erreur réseau');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users
    .filter((u) => filter === 'all' || u.role === filter)
    .filter((u) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        u.displayName?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s)
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const ROLE_LABELS: Record<string, string> = {
    client: 'Client',
    professional: 'Professionnel',
    admin: 'Admin',
  };

  const ROLE_COLORS: Record<string, string> = {
    client: 'bg-blue-50 text-blue-700',
    professional: 'bg-teal-50 text-teal-700',
    admin: 'bg-red-50 text-red-600',
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
          <p className="text-brand-blue-gray text-sm mt-1">{users.length} utilisateurs inscrits</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field flex-1"
          />
          <div className="flex gap-2">
            {(['all', 'client', 'professional', 'admin'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-brand-teal text-white'
                    : 'bg-gray-100 text-brand-blue-gray hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? 'Tous' : ROLE_LABELS[f]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users list */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-3xl mb-3">🔍</p>
            <p className="font-medium">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.uid} className={`card flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${!user.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-brand-teal/20 flex items-center justify-center text-brand-teal font-bold text-sm shrink-0">
                  {(user.displayName || user.email || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{user.displayName || 'Sans nom'}</p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role] || 'bg-gray-100'}`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                    {!user.isActive && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">Désactivé</span>
                    )}
                  </div>
                  <p className="text-xs text-brand-blue-gray truncate">{user.email}</p>
                  <p className="text-xs text-brand-blue-gray">
                    Inscrit le {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '?'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleAction(user.uid, 'toggleActive')}
                  disabled={actionLoading === user.uid + 'toggleActive'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    user.isActive
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  } disabled:opacity-50`}
                >
                  {actionLoading === user.uid + 'toggleActive' ? '...' : user.isActive ? 'Désactiver' : 'Activer'}
                </button>
                {user.role === 'client' && (
                  <button
                    onClick={() => handleAction(user.uid, 'changeRole', { role: 'professional' })}
                    disabled={actionLoading === user.uid + 'changeRole'}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === user.uid + 'changeRole' ? '...' : 'Passer Pro'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
