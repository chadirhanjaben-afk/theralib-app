'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  getBookingsForProByDateRange,
  getServiceById,
  getUserById,
  updateBookingStatus,
} from '@/lib/firebase/firestore';
import type { Booking, BookingStatus } from '@/types';

// ─── Helpers ───

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; border: string; text: string }> = {
  pending: { label: 'En attente', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800' },
  confirmed: { label: 'Confirmé', bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800' },
  cancelled: { label: 'Annulé', bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
  completed: { label: 'Terminé', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600' },
  no_show: { label: 'Absent', bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-600' },
};

// ─── Types ───

interface EnrichedBooking extends Booking {
  clientName: string;
  clientEmail: string;
  serviceName: string;
}

type ViewMode = 'week' | 'day';

// ─── Constants ───

const HOUR_START = 8;
const HOUR_END = 20;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const SLOT_HEIGHT = 64; // px per hour

// ─── Component ───

export default function ProAgendaPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedBooking, setSelectedBooking] = useState<EnrichedBooking | null>(null);

  const weekStart = useMemo(() => getMonday(currentDate), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const loadBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const start = viewMode === 'week' ? weekStart : new Date(currentDate.setHours(0, 0, 0, 0));
      const end = viewMode === 'week' ? addDays(weekStart, 7) : new Date(currentDate.setHours(23, 59, 59, 999));

      const raw = await getBookingsForProByDateRange(user.uid, start, end);

      const enriched: EnrichedBooking[] = await Promise.all(
        raw.map(async (b) => {
          let clientName = 'Client';
          let clientEmail = '';
          let serviceName = 'Service';
          try {
            const [client, svc] = await Promise.all([getUserById(b.clientId), getServiceById(b.serviceId)]);
            clientName = client?.displayName || b.clientId;
            clientEmail = client?.email || '';
            serviceName = svc?.name || 'Service';
          } catch { /* ignore */ }
          return { ...b, clientName, clientEmail, serviceName };
        }),
      );

      setBookings(enriched);
    } catch (err) {
      console.error('Error loading agenda:', err);
    } finally {
      setLoading(false);
    }
  }, [user, weekStart, currentDate, viewMode]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // ─── Navigation ───

  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => setCurrentDate((d) => addDays(d, viewMode === 'week' ? -7 : -1));
  const goNext = () => setCurrentDate((d) => addDays(d, viewMode === 'week' ? 7 : 1));

  // ─── Actions ───

  const handleStatusChange = async (bookingId: string, newStatus: BookingStatus) => {
    try {
      await updateBookingStatus(bookingId, newStatus);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b)));
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking((prev) => prev ? { ...prev, status: newStatus } : null);
      }
      // Send status change email (fire-and-forget)
      if (['confirmed', 'cancelled', 'completed'].includes(newStatus)) {
        fetch('/api/email/booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'status_change', bookingId, status: newStatus }),
        }).catch((err) => console.error('Email send failed:', err));
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // ─── Week label ───

  const weekLabel = useMemo(() => {
    if (viewMode === 'day') {
      return `${DAYS_FR[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1]} ${currentDate.getDate()} ${MONTHS_FR[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    const end = addDays(weekStart, 6);
    if (weekStart.getMonth() === end.getMonth()) {
      return `${weekStart.getDate()} — ${end.getDate()} ${MONTHS_FR[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
    }
    return `${weekStart.getDate()} ${MONTHS_FR[weekStart.getMonth()]} — ${end.getDate()} ${MONTHS_FR[end.getMonth()]} ${end.getFullYear()}`;
  }, [weekStart, currentDate, viewMode]);

  // ─── Helpers for rendering ───

  function getBookingsForDay(day: Date) {
    return bookings.filter((b) => {
      try {
        const bDate = b.date?.toDate ? b.date.toDate() : new Date(0);
        return isSameDay(bDate, day);
      } catch {
        return false;
      }
    });
  }

  function bookingStyle(b: EnrichedBooking) {
    const startMin = timeToMinutes(b.startTime) - HOUR_START * 60;
    const endMin = timeToMinutes(b.endTime) - HOUR_START * 60;
    const top = (startMin / 60) * SLOT_HEIGHT;
    const height = Math.max(((endMin - startMin) / 60) * SLOT_HEIGHT - 2, 24);
    return { top: `${top}px`, height: `${height}px` };
  }

  // ─── Stats for header ───

  const todayBookings = bookings.filter((b) => {
    try {
      return isSameDay(b.date?.toDate ? b.date.toDate() : new Date(0), new Date());
    } catch { return false; }
  });
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  // ─── Render ───

  return (
    <div className="max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-brand-blue-gray text-sm mt-1">
            {todayBookings.length > 0
              ? `${todayBookings.length} rendez-vous aujourd'hui`
              : "Aucun rendez-vous aujourd'hui"}
            {pendingCount > 0 && ` · ${pendingCount} en attente`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'week' ? 'bg-white shadow-sm text-brand-petrol' : 'text-brand-blue-gray'
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'day' ? 'bg-white shadow-sm text-brand-petrol' : 'text-brand-blue-gray'
              }`}
            >
              Jour
            </button>
          </div>
        </div>
      </div>

      {/* Navigation bar */}
      <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 mb-4">
        <button
          onClick={goPrev}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Semaine précédente"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold capitalize">{weekLabel}</h2>
          <button
            onClick={goToday}
            className="text-xs font-medium px-3 py-1 rounded-full border border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white transition-colors"
          >
            Aujourd&apos;hui
          </button>
        </div>
        <button
          onClick={goNext}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Semaine suivante"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === 'week' ? (
        /* ─── WEEK VIEW ─── */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-100">
            <div className="p-2" />
            {weekDays.map((day, i) => {
              const isToday = isSameDay(day, new Date());
              const dayBookings = getBookingsForDay(day);
              return (
                <div
                  key={i}
                  className={`p-3 text-center border-l border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isToday ? 'bg-brand-teal-bg' : ''
                  }`}
                  onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                >
                  <div className="text-xs text-brand-blue-gray">{DAYS_SHORT[i]}</div>
                  <div className={`text-lg font-bold mt-0.5 ${isToday ? 'text-brand-teal' : ''}`}>
                    {day.getDate()}
                  </div>
                  {dayBookings.length > 0 && (
                    <div className="flex justify-center gap-0.5 mt-1">
                      {dayBookings.slice(0, 3).map((b) => (
                        <span
                          key={b.id}
                          className={`w-1.5 h-1.5 rounded-full ${
                            b.status === 'confirmed' ? 'bg-emerald-400' :
                            b.status === 'pending' ? 'bg-amber-400' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                      {dayBookings.length > 3 && (
                        <span className="text-[9px] text-brand-blue-gray ml-0.5">+{dayBookings.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{ height: `${HOURS.length * SLOT_HEIGHT}px` }}>
            {/* Hour labels */}
            <div className="relative">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute right-2 text-xs text-brand-blue-gray"
                  style={{ top: `${(h - HOUR_START) * SLOT_HEIGHT - 6}px` }}
                >
                  {h}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIdx) => {
              const dayBookings = getBookingsForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div key={dayIdx} className={`relative border-l border-gray-100 ${isToday ? 'bg-brand-teal-bg/30' : ''}`}>
                  {/* Hour lines */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute w-full border-t border-gray-50"
                      style={{ top: `${(h - HOUR_START) * SLOT_HEIGHT}px` }}
                    />
                  ))}

                  {/* Bookings */}
                  {dayBookings
                    .filter((b) => b.status !== 'cancelled')
                    .map((b) => {
                      const style = bookingStyle(b);
                      const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
                      return (
                        <button
                          key={b.id}
                          onClick={() => setSelectedBooking(b)}
                          className={`absolute left-1 right-1 rounded-lg border-l-3 px-2 py-1 overflow-hidden cursor-pointer hover:shadow-md transition-shadow text-left ${cfg.bg} ${cfg.border}`}
                          style={style}
                        >
                          <div className={`text-xs font-semibold truncate ${cfg.text}`}>{b.startTime}</div>
                          <div className="text-xs truncate font-medium">{b.clientName}</div>
                          <div className="text-[10px] truncate text-brand-blue-gray">{b.serviceName}</div>
                        </button>
                      );
                    })}

                  {/* Current time indicator */}
                  {isToday && (() => {
                    const now = new Date();
                    const min = now.getHours() * 60 + now.getMinutes() - HOUR_START * 60;
                    if (min < 0 || min > (HOUR_END - HOUR_START) * 60) return null;
                    const top = (min / 60) * SLOT_HEIGHT;
                    return (
                      <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: `${top}px` }}>
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                          <div className="flex-1 h-px bg-red-500" />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ─── DAY VIEW ─── */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-[60px_1fr] relative" style={{ height: `${HOURS.length * SLOT_HEIGHT}px` }}>
            {/* Hour labels */}
            <div className="relative">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute right-2 text-xs text-brand-blue-gray"
                  style={{ top: `${(h - HOUR_START) * SLOT_HEIGHT - 6}px` }}
                >
                  {h}:00
                </div>
              ))}
            </div>

            {/* Single day column */}
            <div className="relative border-l border-gray-100">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute w-full border-t border-gray-50"
                  style={{ top: `${(h - HOUR_START) * SLOT_HEIGHT}px` }}
                />
              ))}

              {getBookingsForDay(currentDate)
                .filter((b) => b.status !== 'cancelled')
                .map((b) => {
                  const style = bookingStyle(b);
                  const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBooking(b)}
                      className={`absolute left-2 right-2 rounded-xl border-l-4 px-4 py-2 overflow-hidden cursor-pointer hover:shadow-md transition-shadow text-left ${cfg.bg} ${cfg.border}`}
                      style={style}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${cfg.text}`}>
                          {b.startTime} — {b.endTime}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="text-sm font-semibold mt-1">{b.clientName}</div>
                      <div className="text-xs text-brand-blue-gray">{b.serviceName} · {b.price} €</div>
                    </button>
                  );
                })}

              {/* Current time indicator */}
              {isSameDay(currentDate, new Date()) && (() => {
                const now = new Date();
                const min = now.getHours() * 60 + now.getMinutes() - HOUR_START * 60;
                if (min < 0 || min > (HOUR_END - HOUR_START) * 60) return null;
                const top = (min / 60) * SLOT_HEIGHT;
                return (
                  <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: `${top}px` }}>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5" />
                      <div className="flex-1 h-0.5 bg-red-500" />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ─── Booking detail modal ─── */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedBooking(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-4">
              <span className={`text-xs font-medium px-3 py-1 rounded-full border ${STATUS_CONFIG[selectedBooking.status]?.bg} ${STATUS_CONFIG[selectedBooking.status]?.text} ${STATUS_CONFIG[selectedBooking.status]?.border}`}>
                {STATUS_CONFIG[selectedBooking.status]?.label}
              </span>
            </div>

            <h3 className="text-xl font-bold mb-1">{selectedBooking.clientName}</h3>
            {selectedBooking.clientEmail && (
              <p className="text-sm text-brand-blue-gray mb-4">{selectedBooking.clientEmail}</p>
            )}

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-lg">🛠️</span>
                <span className="font-medium">{selectedBooking.serviceName}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-lg">📅</span>
                <span>
                  {(() => {
                    try {
                      const d = selectedBooking.date?.toDate ? selectedBooking.date.toDate() : new Date();
                      return `${DAYS_FR[d.getDay() === 0 ? 6 : d.getDay() - 1]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;
                    } catch { return 'Date inconnue'; }
                  })()}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-lg">🕐</span>
                <span>{selectedBooking.startTime} — {selectedBooking.endTime}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-lg">💰</span>
                <span className="font-bold text-brand-petrol">{selectedBooking.price} €</span>
              </div>
            </div>

            {selectedBooking.notes && (
              <div className="bg-gray-50 rounded-xl p-3 mb-6">
                <p className="text-xs font-medium text-brand-blue-gray mb-1">Note du client</p>
                <p className="text-sm">{selectedBooking.notes}</p>
              </div>
            )}

            {/* Actions */}
            {selectedBooking.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusChange(selectedBooking.id, 'confirmed')}
                  className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors"
                >
                  Confirmer
                </button>
                <button
                  onClick={() => handleStatusChange(selectedBooking.id, 'cancelled')}
                  className="flex-1 px-4 py-2.5 text-red-500 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  Refuser
                </button>
              </div>
            )}

            {selectedBooking.status === 'confirmed' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusChange(selectedBooking.id, 'completed')}
                  className="flex-1 px-4 py-2.5 bg-brand-teal text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Terminé
                </button>
                <button
                  onClick={() => handleStatusChange(selectedBooking.id, 'no_show')}
                  className="px-4 py-2.5 text-red-500 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  Absent
                </button>
                <button
                  onClick={() => handleStatusChange(selectedBooking.id, 'cancelled')}
                  className="px-4 py-2.5 text-brand-blue-gray border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
