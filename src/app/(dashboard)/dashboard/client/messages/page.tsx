'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  onConversationsForUser,
  onMessagesForConversation,
  sendMessage,
  markConversationRead,
  getUserById,
} from '@/lib/firebase/firestore';
import type { Conversation, Message } from '@/types';
import type { DocumentData } from 'firebase/firestore';

interface EnrichedConversation extends Conversation {
  otherUser: DocumentData | null;
}

const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function formatTimestamp(ts: { toDate?: () => Date } | null): string {
  if (!ts || !ts.toDate) return '';
  try {
    const date = ts.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24 && date.getDate() === now.getDate())
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diffHours < 48) return 'Hier';
    return `${date.getDate()} ${MONTHS_FR[date.getMonth()]}`;
  } catch { return ''; }
}

function formatMessageTime(ts: { toDate?: () => Date } | null): string {
  if (!ts || !ts.toDate) return '';
  try {
    return ts.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function formatMessageDate(ts: { toDate?: () => Date } | null): string {
  if (!ts || !ts.toDate) return '';
  try {
    const date = ts.toDate();
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return "Aujourd'hui";
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Hier';
    return `${DAYS_FR[date.getDay()]} ${date.getDate()} ${MONTHS_FR[date.getMonth()]}`;
  } catch { return ''; }
}

export default function ClientMessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<EnrichedConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onConversationsForUser(user.uid, async (convs) => {
      const enriched: EnrichedConversation[] = await Promise.all(
        convs.map(async (conv) => {
          const otherId = conv.participants.find((p) => p !== user.uid) || '';
          let otherUser: DocumentData | null = null;
          try { otherUser = await getUserById(otherId); } catch { /* ignore */ }
          return { ...conv, otherUser };
        })
      );
      setConversations(enriched);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!selectedConvId) { setMessages([]); return; }
    const unsub = onMessagesForConversation(selectedConvId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [selectedConvId]);

  useEffect(() => {
    if (!selectedConvId || !user) return;
    markConversationRead(selectedConvId, user.uid).catch(console.error);
  }, [selectedConvId, user]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !selectedConvId || !user || sending) return;
    setSending(true);
    try {
      await sendMessage(selectedConvId, user.uid, newMessage.trim());
      setNewMessage('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  }, [newMessage, selectedConvId, user, sending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedConv = conversations.find((c) => c.id === selectedConvId);
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount?.[user?.uid || ''] || 0), 0);

  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = '';
  messages.forEach((msg) => {
    const dateStr = formatMessageDate(msg.createdAt);
    if (dateStr !== currentDate) {
      currentDate = dateStr;
      groupedMessages.push({ date: dateStr, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-brand-blue-gray text-sm mt-0.5">
            {totalUnread > 0 ? `${totalUnread} message${totalUnread > 1 ? 's' : ''} non lu${totalUnread > 1 ? 's' : ''}` : 'Échangez avec vos praticiens'}
          </p>
        </div>
      </div>

      <div className="flex h-[calc(100%-60px)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Conversation list */}
        <div className={`w-80 border-r border-gray-100 flex flex-col ${selectedConvId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <input type="text" placeholder="Rechercher..." className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm border-0 focus:ring-2 focus:ring-brand-teal/30 focus:bg-white transition-colors" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-sm text-brand-blue-gray font-medium">Aucune conversation</p>
                <p className="text-xs text-gray-400 mt-1">Vos échanges avec les praticiens apparaîtront ici</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const unread = conv.unreadCount?.[user?.uid || ''] || 0;
                const isSelected = conv.id === selectedConvId;
                return (
                  <button key={conv.id} onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors border-b border-gray-50 ${isSelected ? 'bg-brand-teal/5' : 'hover:bg-gray-50'}`}>
                    <div className="w-10 h-10 rounded-full bg-brand-teal/10 flex items-center justify-center text-brand-teal font-bold text-sm shrink-0">
                      {(conv.otherUser?.displayName || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm truncate ${unread > 0 ? 'font-bold' : 'font-medium'}`}>
                          {conv.otherUser?.displayName || 'Praticien'}
                        </span>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">{formatTimestamp(conv.lastMessageAt)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className={`text-xs truncate ${unread > 0 ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                          {conv.lastMessage || 'Nouvelle conversation'}
                        </p>
                        {unread > 0 && (
                          <span className="ml-2 shrink-0 w-5 h-5 rounded-full bg-brand-teal text-white text-[10px] flex items-center justify-center font-bold">{unread}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className={`flex-1 flex flex-col ${!selectedConvId ? 'hidden md:flex' : 'flex'}`}>
          {!selectedConvId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-4">💬</div>
                <p className="text-lg font-medium text-gray-800">Sélectionnez une conversation</p>
                <p className="text-sm text-gray-400 mt-1">Choisissez une conversation pour commencer à discuter</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <button className="md:hidden mr-2 text-gray-400 hover:text-gray-600" onClick={() => setSelectedConvId(null)}>← Retour</button>
                <div className="w-10 h-10 rounded-full bg-brand-teal/10 flex items-center justify-center text-brand-teal font-bold text-sm">
                  {(selectedConv?.otherUser?.displayName || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{selectedConv?.otherUser?.displayName || 'Praticien'}</p>
                  <p className="text-xs text-gray-400">{selectedConv?.otherUser?.email || ''}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-400">Aucun message pour le moment</p>
                    <p className="text-xs text-gray-300 mt-1">Envoyez le premier message !</p>
                  </div>
                ) : (
                  groupedMessages.map((group, gi) => (
                    <div key={gi}>
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-gray-100"></div>
                        <span className="text-xs text-gray-400 font-medium">{group.date}</span>
                        <div className="flex-1 h-px bg-gray-100"></div>
                      </div>
                      {group.messages.map((msg) => {
                        const isMine = msg.senderId === user?.uid;
                        return (
                          <div key={msg.id} className={`flex mb-3 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${isMine ? 'bg-brand-teal text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'}`}>
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                              <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-gray-400'}`}>{formatMessageTime(msg.createdAt)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="px-6 py-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <input ref={inputRef} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder="Tapez votre message..." className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-sm border-0 focus:ring-2 focus:ring-brand-teal/30 focus:bg-white transition-colors" disabled={sending} />
                  <button onClick={handleSend} disabled={!newMessage.trim() || sending}
                    className="px-5 py-3 bg-brand-teal text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-brand-teal/90 transition-colors">
                    {sending ? '...' : 'Envoyer'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
