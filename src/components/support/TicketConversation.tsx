'use client';

import { useEffect, useState, useRef } from 'react';
import type { TicketStatus, TicketPriority, TicketCategory } from '@/types';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  createdAt: { _seconds: number };
}

interface Ticket {
  id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  userName: string;
  userEmail: string;
  userRole: string;
  createdAt: { _seconds: number };
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

const categoryLabels: Record<TicketCategory, string> = {
  booking: 'Réservation',
  payment: 'Paiement',
  account: 'Compte',
  technical: 'Technique',
  other: 'Autre',
};

interface TicketConversationProps {
  ticketId: string;
  currentUserId: string;
  isAdmin?: boolean;
  backPath: string;
}

export default function TicketConversation({
  ticketId,
  currentUserId,
  isAdmin = false,
  backPath,
}: TicketConversationProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchTicket() {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`);
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      setTicket(data.ticket);
      setMessages(data.messages || []);
    } catch {
      console.error('Erreur chargement ticket');
    } finally {
      setLoading(false);
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }
      setNewMessage('');
      // Refresh messages
      await fetchTicket();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur envoi message');
    } finally {
      setSending(false);
    }
  }

  async function updateStatus(status: TicketStatus) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Erreur');
      await fetchTicket();
    } catch {
      alert('Erreur mise à jour statut');
    } finally {
      setUpdating(false);
    }
  }

  function formatDate(ts: { _seconds: number }) {
    if (!ts?._seconds) return '—';
    return new Date(ts._seconds * 1000).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal"></div>
      </div>
    );
  }

  if (!ticket) {
    return <p className="text-center text-gray-500 py-12">Ticket introuvable</p>;
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <a href={backPath} className="text-brand-teal hover:underline text-sm">
        ← Retour aux tickets
      </a>

      {/* Ticket header */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-brand-petrol">{ticket.subject}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`badge ${statusColors[ticket.status]}`}>
                {statusLabels[ticket.status]}
              </span>
              <span className="badge bg-gray-50 text-gray-500">
                {categoryLabels[ticket.category]}
              </span>
              <span className="text-xs text-gray-400">
                Créé le {formatDate(ticket.createdAt)}
              </span>
            </div>
            {isAdmin && (
              <p className="text-sm text-gray-500 mt-2">
                De : {ticket.userName} ({ticket.userEmail}) — {ticket.userRole}
              </p>
            )}
          </div>

          {/* Status actions */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {isAdmin && ticket.status !== 'closed' && (
              <>
                {ticket.status !== 'in_progress' && (
                  <button
                    onClick={() => updateStatus('in_progress')}
                    disabled={updating}
                    className="px-3 py-1.5 text-xs rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors disabled:opacity-50"
                  >
                    En cours
                  </button>
                )}
                {ticket.status !== 'resolved' && (
                  <button
                    onClick={() => updateStatus('resolved')}
                    disabled={updating}
                    className="px-3 py-1.5 text-xs rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
                  >
                    Résolu
                  </button>
                )}
                <button
                  onClick={() => updateStatus('closed')}
                  disabled={updating}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Fermer
                </button>
              </>
            )}
            {!isAdmin && ticket.status !== 'closed' && (
              <button
                onClick={() => updateStatus('closed')}
                disabled={updating}
                className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Fermer le ticket
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto p-1">
        {messages.map((msg) => {
          const isOwnMessage = msg.senderId === currentUserId;
          const isAdminMessage = msg.senderRole === 'admin';

          return (
            <div
              key={msg.id}
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  isOwnMessage
                    ? 'bg-brand-teal text-white'
                    : isAdminMessage
                    ? 'bg-brand-teal-bg text-brand-petrol border border-brand-teal/20'
                    : 'bg-gray-100 text-brand-petrol'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold ${isOwnMessage ? 'text-white/80' : 'text-gray-500'}`}>
                    {msg.senderName}
                    {isAdminMessage && !isOwnMessage && ' (Support)'}
                  </span>
                  <span className={`text-xs ${isOwnMessage ? 'text-white/60' : 'text-gray-400'}`}>
                    {formatDate(msg.createdAt)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply form */}
      {ticket.status !== 'closed' ? (
        <form onSubmit={sendReply} className="flex gap-3">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrivez votre réponse..."
            rows={2}
            className="input-field flex-1 resize-none"
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="btn-primary self-end disabled:opacity-50"
          >
            {sending ? '...' : 'Envoyer'}
          </button>
        </form>
      ) : (
        <div className="text-center py-4 text-gray-400 text-sm">
          Ce ticket est fermé. Vous pouvez ouvrir un nouveau ticket si besoin.
        </div>
      )}
    </div>
  );
}
