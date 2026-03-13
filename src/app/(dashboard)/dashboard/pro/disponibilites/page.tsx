'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import type { WeeklySchedule, TimeSlot, DateOverride } from '@/types';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function formatTime(t: string) {
  return t; // already "HH:mm"
}

export default function ProDisponibilitesPage() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null);
  const [overrides, setOverrides] = useState<DateOverride[]>([]);
  const [slotInterval, setSlotInterval] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // New override form
  const [newOverrideDate, setNewOverrideDate] = useState('');
  const [newOverrideType, setNewOverrideType] = useState<'off' | 'custom'>('off');
  const [newOverrideLabel, setNewOverrideLabel] = useState('');
  const [newOverrideSlots, setNewOverrideSlots] = useState<TimeSlot[]>([{ start: '09:00', end: '17:00' }]);

  const fetchAvailability = useCallback(async () => {
    try {
      const res = await fetch('/api/pro/availability', { credentials: 'same-origin' });
      const data = await res.json();
      if (data.availability) {
        setSchedule(data.availability.weeklySchedule);
        setOverrides(data.availability.dateOverrides || []);
        setSlotInterval(data.availability.slotInterval || 30);
      }
    } catch (err) {
      console.error('Error loading availability:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchAvailability();
  }, [user, fetchAvailability]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/pro/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ weeklySchedule: schedule, dateOverrides: overrides, slotInterval }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Schedule helpers ──

  const toggleDay = (day: string) => {
    if (!schedule) return;
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        enabled: !schedule[day].enabled,
      },
    });
  };

  const updateSlot = (day: string, slotIdx: number, field: 'start' | 'end', value: string) => {
    if (!schedule) return;
    const slots = [...schedule[day].slots];
    slots[slotIdx] = { ...slots[slotIdx], [field]: value };
    setSchedule({ ...schedule, [day]: { ...schedule[day], slots } });
  };

  const addSlot = (day: string) => {
    if (!schedule) return;
    const slots = [...schedule[day].slots, { start: '14:00', end: '18:00' }];
    setSchedule({ ...schedule, [day]: { ...schedule[day], slots } });
  };

  const removeSlot = (day: string, slotIdx: number) => {
    if (!schedule) return;
    const slots = schedule[day].slots.filter((_, i) => i !== slotIdx);
    setSchedule({ ...schedule, [day]: { ...schedule[day], slots } });
  };

  // ── Override helpers ──

  const addOverride = () => {
    if (!newOverrideDate) return;
    const override: DateOverride = {
      date: newOverrideDate,
      type: newOverrideType,
      label: newOverrideLabel || undefined,
      slots: newOverrideType === 'custom' ? newOverrideSlots : undefined,
    };
    setOverrides([...overrides, override]);
    setNewOverrideDate('');
    setNewOverrideLabel('');
    setNewOverrideType('off');
    setNewOverrideSlots([{ start: '09:00', end: '17:00' }]);
  };

  const removeOverride = (idx: number) => {
    setOverrides(overrides.filter((_, i) => i !== idx));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!schedule) return null;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Disponibilités</h1>
          <p className="text-brand-blue-gray text-sm mt-1">
            Définissez vos horaires d&apos;ouverture et vos jours de repos
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-brand-teal text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : saved ? 'Enregistré !' : 'Enregistrer'}
        </button>
      </div>

      {/* ── Weekly schedule ── */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4">Horaires hebdomadaires</h2>
        <div className="space-y-4">
          {DAYS.map((day) => {
            const daySchedule = schedule[day];
            return (
              <div key={day} className={`p-4 rounded-xl border transition-colors ${daySchedule.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleDay(day)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${daySchedule.enabled ? 'bg-brand-teal' : 'bg-gray-300'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${daySchedule.enabled ? 'translate-x-5' : ''}`}
                      />
                    </button>
                    <span className={`font-medium ${daySchedule.enabled ? 'text-brand-petrol' : 'text-gray-400'}`}>
                      {day}
                    </span>
                  </div>
                  {daySchedule.enabled && (
                    <button
                      onClick={() => addSlot(day)}
                      className="text-xs text-brand-teal font-medium hover:underline"
                    >
                      + Ajouter un créneau
                    </button>
                  )}
                </div>

                {daySchedule.enabled && (
                  <div className="space-y-2 ml-14">
                    {daySchedule.slots.map((slot, slotIdx) => (
                      <div key={slotIdx} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) => updateSlot(day, slotIdx, 'start', e.target.value)}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
                        />
                        <span className="text-brand-blue-gray text-sm">à</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) => updateSlot(day, slotIdx, 'end', e.target.value)}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
                        />
                        {daySchedule.slots.length > 1 && (
                          <button
                            onClick={() => removeSlot(day, slotIdx)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer ce créneau"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!daySchedule.enabled && (
                  <p className="text-xs text-gray-400 ml-14">Fermé</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Slot interval ── */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-3">Intervalle entre les créneaux</h2>
        <p className="text-sm text-brand-blue-gray mb-3">
          Durée entre chaque créneau proposé aux clients lors de la réservation.
        </p>
        <div className="flex gap-2">
          {[15, 30, 45, 60].map((mins) => (
            <button
              key={mins}
              onClick={() => setSlotInterval(mins)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                slotInterval === mins
                  ? 'bg-brand-teal text-white'
                  : 'bg-gray-100 text-brand-blue-gray hover:bg-gray-200'
              }`}
            >
              {mins} min
            </button>
          ))}
        </div>
      </div>

      {/* ── Date overrides ── */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-3">Exceptions de dates</h2>
        <p className="text-sm text-brand-blue-gray mb-4">
          Jours fériés, vacances ou horaires exceptionnels pour des dates spécifiques.
        </p>

        {/* Existing overrides */}
        {overrides.length > 0 && (
          <div className="space-y-2 mb-4">
            {overrides
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((ov, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      ov.type === 'off' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {ov.type === 'off' ? 'Fermé' : 'Horaires spéciaux'}
                    </span>
                    <span className="text-sm font-medium">
                      {new Date(ov.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                    {ov.label && <span className="text-xs text-brand-blue-gray">({ov.label})</span>}
                    {ov.type === 'custom' && ov.slots && (
                      <span className="text-xs text-brand-blue-gray">
                        {ov.slots.map((s) => `${formatTime(s.start)}–${formatTime(s.end)}`).join(', ')}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeOverride(idx)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
          </div>
        )}

        {/* Add override form */}
        <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl">
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-brand-blue-gray mb-1">Date</label>
              <input
                type="date"
                value={newOverrideDate}
                onChange={(e) => setNewOverrideDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-blue-gray mb-1">Type</label>
              <select
                value={newOverrideType}
                onChange={(e) => setNewOverrideType(e.target.value as 'off' | 'custom')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
              >
                <option value="off">Jour fermé</option>
                <option value="custom">Horaires spéciaux</option>
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-brand-blue-gray mb-1">Motif (optionnel)</label>
            <input
              type="text"
              value={newOverrideLabel}
              onChange={(e) => setNewOverrideLabel(e.target.value)}
              placeholder="ex: Vacances, Jour férié, Formation..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
            />
          </div>

          {newOverrideType === 'custom' && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-brand-blue-gray mb-1">Horaires ce jour-là</label>
              {newOverrideSlots.map((slot, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <input
                    type="time"
                    value={slot.start}
                    onChange={(e) => {
                      const s = [...newOverrideSlots];
                      s[idx] = { ...s[idx], start: e.target.value };
                      setNewOverrideSlots(s);
                    }}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                  />
                  <span className="text-brand-blue-gray text-sm">à</span>
                  <input
                    type="time"
                    value={slot.end}
                    onChange={(e) => {
                      const s = [...newOverrideSlots];
                      s[idx] = { ...s[idx], end: e.target.value };
                      setNewOverrideSlots(s);
                    }}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addOverride}
            disabled={!newOverrideDate}
            className="px-4 py-2 bg-brand-petrol text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            Ajouter cette exception
          </button>
        </div>
      </div>

      {/* Bottom save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-brand-teal text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : saved ? 'Enregistré !' : 'Enregistrer les modifications'}
        </button>
      </div>
    </div>
  );
}
