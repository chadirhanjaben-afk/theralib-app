'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { TicketStatus, TicketPriority, TicketCategory } from '@/types';

interface TicketItem {
  id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  userName?: string;
  userRole?: string;
  createdAt: { _seconds: number };
  updatedAt: { _seconds: number };
}

const statusLabels: Record<TicketStatus, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  resolved: 'Résolu',
  closed: 'Fermé',
};

const statusColors: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

const priorityLabels: Record<TicketPriority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
};

const priorityColors: Record<TicketPriority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-red-100 text-red-600',
};

const categoryLabels: Record<TicketCategory, string> = {
  booking: 'Réservation',
  payment: 'Paiement',
  account: 'Compte',
  technical: 'Technique',
  other: 'Autre',
};

interface TicketListProps {
  basePath: string; // e.g. "/dashboard/client/support"
  showUserInfo?: boolean; // true for admin view
}

export default function TicketList({ basePath, showUserInfo = false }: TicketListProps) {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all');

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    try {
      const res = await fetch('/api/support/tickets');
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {
      console.error('Erreur chargement tickets');
    } finally {
      setLoading(false);
    }
  }

  const filtered =
    filterStatus === 'all'
      ? tickets
      : tickets.filter((t) => t.status === filterStatus);

  function formatDate(ts: { _seconds: number }) {
    if (!ts?._seconds) return '—';
    return new Date(ts._seconds * 1000).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterStatus === s
                ? 'bg-brand-teal text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'all' ? 'Tous' : statusLabels[s]}
            {s !== 'all' && (
              <span className="ml-1 text-xs">
                ({tickets.filter((t) => t.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">📭</p>
          <p>Aucun ticket{filterStatus !== 'all' ? ` avec le statut "${statusLabels[filterStatus]}"` : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <Link
              key={ticket.id}
              href={`${basePath}/${ticket.id}`}
              className="block card-hover"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-brand-petrol truncate">
                    {ticket.subject}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`badge ${statusColors[ticket.status]}`}>
                      {statusLabels[ticket.status]}
                    </span>
                    <span className={`badge ${priorityColors[ticket.priority]}`}>
                      {priorityLabels[ticket.priority]}
                    </span>
                    <span className="badge bg-gray-50 text-gray-500">
                      {categoryLabels[ticket.category]}
                    </span>
                  </div>
                  {showUserInfo && (
                    <p className="text-sm text-gray-500 mt-1">
                      Par {ticket.userName} ({ticket.userRole})
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-gray-400 shrink-0">
                  <p>Créé le {formatDate(ticket.createdAt)}</p>
                  <p>MAJ {formatDate(ticket.updatedAt)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
