'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/hooks/useAuth';
import { getProfessionalById, getServicesByPro, createBooking } from '@/lib/firebase/firestore';
import type { Professional, Service, WeeklySchedule, DateOverride, TimeSlot } from '@/types';

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Generate bookable slots from a list of TimeSlot windows */
function generateTimeSlotsFromWindows(windows: TimeSlot[], duration: number, interval: number): string[] {
  const slots: string[] = [];
  for (const w of windows) {
    let current = timeToMinutes(w.start);
    const end = timeToMinutes(w.end);
    while (current + duration <= end) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      current += interval;
    }
  }
  return slots;
}

function dateToString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function generateCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }
  return days;
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const totalMinutes = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMinutes / 60);
  const endM = totalMinutes % 60;
  return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
}

type Step = 'service' | 'datetime' | 'info' | 'confirm';

export default function ReservationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const proId = params.proId as string;

  // Data loading
  const [pro, setPro] = useState<Professional | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Wizard state
  const [step, setStep] = useState<Step>('service');
  const [selectedServiceIdx, setSelectedServiceIdx] = useState<number | null>(null);

  // Calendar state
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Client info (pre-filled if logged in)
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNote, setClientNote] = useState('');

  // Payment mode
  const [paymentMode, setPaymentMode] = useState<'online' | 'onsite'>('onsite'); // will be updated once pro data loads

  // Booking state
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const searchParams = useSearchParams();

  // Pro availability (fetched from API)
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule | null>(null);
  const [dateOverrides, setDateOverrides] = useState<DateOverride[]>([]);
  const [slotInterval, setSlotInterval] = useState(30);

  // Booked slots for the selected date (anti-doublon)
  const [bookedSlots, setBookedSlots] = useState<{ startTime: string; endTime: string }[]>([]);

  // Set default payment mode based on pro's settings
  useEffect(() => {
    if (!pro) return;
    const hasOnline = pro.stripeAccountId && pro.stripeOnboarded;
    const hasOnsite = pro.acceptsOnsitePayment !== false;
    if (hasOnline) setPaymentMode('online');
    else if (hasOnsite) setPaymentMode('onsite');
  }, [pro]);

  // Handle return from cancelled Stripe checkout
  const paymentCancelled = searchParams.get('cancelled') === 'true';

  // Load pro + services + availability from Firestore
  useEffect(() => {
    (async () => {
      try {
        const [proData, servicesData, availRes] = await Promise.all([
          getProfessionalById(proId),
          getServicesByPro(proId),
          fetch(`/api/pro/availability?proId=${proId}`).then((r) => r.json()),
        ]);
        if (!proData) {
          setLoadError('Professionnel introuvable');
          return;
        }
        setPro(proData);
        setServices(servicesData);
        if (availRes.availability) {
          setWeeklySchedule(availRes.availability.weeklySchedule);
          setDateOverrides(availRes.availability.dateOverrides || []);
          setSlotInterval(availRes.availability.slotInterval || 30);
        }
      } catch (err) {
        console.error('Error loading reservation data:', err);
        setLoadError('Erreur lors du chargement des données');
      } finally {
        setLoadingData(false);
      }
    })();
  }, [proId]);

  // Pre-fill client info from auth
  useEffect(() => {
    if (user) {
      setClientName(user.displayName || '');
      setClientEmail(user.email || '');
      setClientPhone(user.phone || '');
    }
  }, [user]);

  // Fetch booked slots when selected date changes
  useEffect(() => {
    if (!selectedDate) {
      setBookedSlots([]);
      return;
    }
    const dateStr = dateToString(selectedDate);
    fetch(`/api/bookings/booked-slots?proId=${proId}&date=${dateStr}`)
      .then((res) => res.json())
      .then((data) => {
        setBookedSlots(data.bookedSlots || []);
      })
      .catch((err) => {
        console.error('Error fetching booked slots:', err);
        setBookedSlots([]);
      });
  }, [selectedDate, proId]);

  const calendarDays = useMemo(() => generateCalendarDays(calYear, calMonth), [calYear, calMonth]);

  const selectedService = selectedServiceIdx !== null ? services[selectedServiceIdx] : null;

  const availableSlots = useMemo(() => {
    if (!selectedDate || !selectedService || !weeklySchedule) return [];

    const dateStr = dateToString(selectedDate);
    const dayName = DAYS_FR[selectedDate.getDay()];

    let slots: string[] = [];

    // Check for date override first
    const override = dateOverrides.find((o) => o.date === dateStr);
    if (override) {
      if (override.type === 'off') return []; // day off
      if (override.type === 'custom' && override.slots) {
        slots = generateTimeSlotsFromWindows(override.slots, selectedService.duration, slotInterval);
      }
    }

    // Use weekly schedule
    if (slots.length === 0) {
      const daySchedule = weeklySchedule[dayName];
      if (!daySchedule || !daySchedule.enabled || daySchedule.slots.length === 0) return [];
      slots = generateTimeSlotsFromWindows(daySchedule.slots, selectedService.duration, slotInterval);
    }

    // Filter out past time slots if the selected date is today
    const now = new Date();
    const isToday =
      selectedDate.getFullYear() === now.getFullYear() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getDate() === now.getDate();

    if (isToday) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      slots = slots.filter((slot) => {
        const [h, m] = slot.split(':').map(Number);
        return h * 60 + m > currentMinutes;
      });
    }

    // Filter out slots that overlap with existing bookings
    if (bookedSlots.length > 0) {
      slots = slots.filter((slot) => {
        const slotStartMin = timeToMinutes(slot);
        const slotEndMin = slotStartMin + selectedService.duration;

        // Check if this slot overlaps with any booked slot
        return !bookedSlots.some((booked) => {
          const bookedStart = timeToMinutes(booked.startTime);
          const bookedEnd = timeToMinutes(booked.endTime);
          // Overlap: slot starts before booked ends AND slot ends after booked starts
          return slotStartMin < bookedEnd && slotEndMin > bookedStart;
        });
      });
    }

    return slots;
  }, [selectedDate, selectedService, weeklySchedule, dateOverrides, slotInterval, bookedSlots]);

  const isDayAvailable = (day: number) => {
    if (!weeklySchedule) return false;
    const date = new Date(calYear, calMonth, day);
    if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return false;

    const dateStr = dateToString(date);
    const override = dateOverrides.find((o) => o.date === dateStr);
    if (override) return override.type === 'custom';

    const dayName = DAYS_FR[date.getDay()];
    const daySchedule = weeklySchedule[dayName];
    return daySchedule?.enabled === true && daySchedule.slots.length > 0;
  };

  const handlePrevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };

  const handleNextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  const proAcceptsOnlinePayment = pro?.stripeAccountId && pro?.stripeOnboarded;
  const proAcceptsOnsitePayment = pro?.acceptsOnsitePayment !== false; // default true si pas défini

  const handleConfirm = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !user) return;
    setSubmitting(true);
    setBookingError(null);

    try {
      const endTime = calculateEndTime(selectedTime, selectedService.duration);
      const dateStr = dateToString(selectedDate);

      // Server-side double-booking check
      const checkRes = await fetch('/api/bookings/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proId,
          date: dateStr,
          startTime: selectedTime,
          endTime,
        }),
      });
      const checkData = await checkRes.json();

      if (!checkData.available) {
        setBookingError(checkData.reason || 'Ce créneau n\'est plus disponible. Veuillez en choisir un autre.');
        setSubmitting(false);
        // Refresh booked slots to update the UI
        fetch(`/api/bookings/booked-slots?proId=${proId}&date=${dateStr}`)
          .then((r) => r.json())
          .then((d) => setBookedSlots(d.bookedSlots || []))
          .catch(() => {});
        return;
      }

      const bookingRef = await createBooking({
        clientId: user.uid,
        professionalId: proId,
        serviceId: selectedService.id,
        date: Timestamp.fromDate(selectedDate),
        startTime: selectedTime,
        endTime,
        status: 'pending',
        price: selectedService.price,
        paymentMethod: paymentMode === 'online' ? 'online' : 'onsite',
        paymentStatus: 'pending',
        notes: clientNote || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Send transactional emails (fire-and-forget — don't block the UI)
      if (bookingRef) {
        fetch('/api/email/booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'new', bookingId: bookingRef }),
        }).catch((err) => console.error('Email send failed:', err));
      }

      // If online payment selected and pro accepts it, redirect to Stripe Checkout
      if (paymentMode === 'online' && proAcceptsOnlinePayment && bookingRef) {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: bookingRef,
            proId,
            serviceId: selectedService.id,
            serviceName: selectedService.name,
            price: selectedService.price,
            clientEmail: clientEmail || user.email,
          }),
        });

        const data = await res.json();

        if (data.url) {
          // Redirect to Stripe Checkout
          window.location.href = data.url;
          return;
        } else {
          // Stripe checkout failed — fall back to on-site payment
          console.error('Stripe checkout error:', data.error);
          setBookingError('Le paiement en ligne a échoué. Votre réservation est enregistrée avec paiement sur place.');
          setConfirmed(true);
        }
      } else {
        // On-site payment — booking confirmed directly
        setConfirmed(true);
      }
    } catch (err) {
      console.error('Error creating booking:', err);
      setBookingError('Erreur lors de la réservation. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading state ───
  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-brand-petrol text-white px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <Link href="/" className="text-xl font-bold">
              <span className="text-gray-300">thera</span>
              <span className="text-white">lib</span>
            </Link>
          </div>
        </nav>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // ─── Error state ───
  if (loadError || !pro) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-brand-petrol text-white px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <Link href="/" className="text-xl font-bold">
              <span className="text-gray-300">thera</span>
              <span className="text-white">lib</span>
            </Link>
          </div>
        </nav>
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <p className="text-5xl mb-4">😕</p>
          <p className="text-lg font-medium mb-2">{loadError || 'Professionnel introuvable'}</p>
          <Link href="/repertoire" className="btn-primary inline-block mt-4">Retour au répertoire</Link>
        </div>
      </div>
    );
  }

  // ─── Auth required notice ───
  if (!user && step === 'confirm') {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-brand-petrol text-white px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <Link href="/" className="text-xl font-bold">
              <span className="text-gray-300">thera</span>
              <span className="text-white">lib</span>
            </Link>
          </div>
        </nav>
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <p className="text-5xl mb-4">🔒</p>
          <p className="text-lg font-medium mb-2">Connexion requise</p>
          <p className="text-sm text-brand-blue-gray mb-6">
            Vous devez être connecté pour confirmer une réservation
          </p>
          <Link href="/login" className="btn-primary inline-block">Se connecter</Link>
        </div>
      </div>
    );
  }

  const proDisplayName = pro.businessName || 'Professionnel';
  const proCity = pro.address?.city || '';
  const proAddress = pro.address
    ? [pro.address.street, [pro.address.postalCode, pro.address.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
    : '';
  const proInitials = proDisplayName.split(' ').map((n) => n[0]).join('').substring(0, 2);
  const proSpecialty = pro.specialties?.length > 0 ? pro.specialties[0] : 'Bien-être';

  // ─── Confirmation success screen ───
  if (confirmed) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-brand-petrol text-white px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              <span className="text-gray-300">thera</span>
              <span className="text-white">lib</span>
            </Link>
          </div>
        </nav>
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-3">Réservation envoyée !</h1>
          <p className="text-brand-blue-gray mb-6">
            Votre demande de rendez-vous avec <strong>{proDisplayName}</strong> a été envoyée.
            Le praticien la confirmera sous peu.
          </p>
          <div className="card text-left mb-8">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-brand-blue-gray">Prestation</span>
                <span className="font-medium">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-blue-gray">Date</span>
                <span className="font-medium">
                  {selectedDate && `${DAYS_FR[selectedDate.getDay()]} ${selectedDate.getDate()} ${MONTHS_FR[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-blue-gray">Heure</span>
                <span className="font-medium">{selectedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-blue-gray">Durée</span>
                <span className="font-medium">{selectedService?.duration} min</span>
              </div>
              {proAddress && (
                <div className="flex justify-between">
                  <span className="text-brand-blue-gray">Lieu</span>
                  <span className="font-medium text-right max-w-[200px]">{proAddress}</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-3 flex justify-between">
                <span className="font-bold">Total</span>
                <span className="font-bold text-brand-teal">{selectedService?.price} €</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard/client" className="btn-primary">
              Mes réservations
            </Link>
            <Link href="/repertoire" className="btn-secondary">
              Retour au répertoire
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main wizard ───
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-brand-petrol text-white px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            <span className="text-gray-300">thera</span>
            <span className="text-white">lib</span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/repertoire" className="hover:text-brand-teal transition-colors">Répertoire</Link>
            {user ? (
              <Link
                href={user.role === 'professional' ? '/dashboard/pro' : user.role === 'admin' ? '/dashboard/admin' : '/dashboard/client'}
                className="hover:text-brand-teal transition-colors"
              >
                Mon compte
              </Link>
            ) : (
              <Link href="/login" className="hover:text-brand-teal transition-colors">Connexion</Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-brand-blue-gray mb-6">
          <Link href="/repertoire" className="hover:text-brand-teal">Répertoire</Link>
          <span>/</span>
          <Link href={`/profil/${proId}`} className="hover:text-brand-teal">{proDisplayName}</Link>
          <span>/</span>
          <span className="text-brand-petrol font-medium">Réservation</span>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { key: 'service' as Step, label: 'Prestation', num: 1 },
            { key: 'datetime' as Step, label: 'Date & heure', num: 2 },
            { key: 'info' as Step, label: 'Vos infos', num: 3 },
            { key: 'confirm' as Step, label: 'Confirmation', num: 4 },
          ].map((s, idx) => {
            const steps: Step[] = ['service', 'datetime', 'info', 'confirm'];
            const currentIdx = steps.indexOf(step);
            const stepIdx = steps.indexOf(s.key);
            const isActive = stepIdx === currentIdx;
            const isDone = stepIdx < currentIdx;

            return (
              <div key={s.key} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  isDone ? 'bg-brand-teal text-white' :
                  isActive ? 'bg-brand-petrol text-white' :
                  'bg-gray-200 text-gray-400'
                }`}>
                  {isDone ? '✓' : s.num}
                </div>
                <span className={`text-xs hidden sm:block ${isActive ? 'text-brand-petrol font-semibold' : 'text-brand-blue-gray'}`}>
                  {s.label}
                </span>
                {idx < 3 && <div className={`flex-1 h-0.5 ${isDone ? 'bg-brand-teal' : 'bg-gray-200'}`} />}
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Step 1: Service selection */}
            {step === 'service' && (
              <div className="card">
                <h2 className="text-xl font-bold mb-2">Choisissez une prestation</h2>
                <p className="text-sm text-brand-blue-gray mb-6">Sélectionnez le soin souhaité chez {proDisplayName}</p>

                {services.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-brand-blue-gray">Ce praticien n&apos;a pas encore configuré de services.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {services.map((svc, idx) => (
                      <button
                        key={svc.id}
                        onClick={() => setSelectedServiceIdx(idx)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          selectedServiceIdx === idx
                            ? 'border-brand-teal bg-brand-teal-bg'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{svc.name}</div>
                            <div className="text-sm text-brand-blue-gray mt-1">
                              {svc.duration} minutes
                              {svc.category && <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-md">{svc.category}</span>}
                            </div>
                            {svc.description && (
                              <div className="text-xs text-brand-blue-gray mt-1 line-clamp-1">{svc.description}</div>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <div className="font-bold text-brand-teal text-lg">{svc.price} €</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  disabled={selectedServiceIdx === null}
                  onClick={() => setStep('datetime')}
                  className="btn-primary w-full mt-6 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continuer
                </button>
              </div>
            )}

            {/* Step 2: Date & time */}
            {step === 'datetime' && (
              <div className="space-y-6">
                <div className="card">
                  <h2 className="text-xl font-bold mb-2">Choisissez une date</h2>
                  <p className="text-sm text-brand-blue-gray mb-6">Les jours disponibles sont en surbrillance</p>

                  {/* Calendar header */}
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="font-bold capitalize">
                      {MONTHS_FR[calMonth]} {calYear}
                    </span>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((d) => (
                      <div key={d} className="text-center text-xs font-medium text-brand-blue-gray py-2">{d}</div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, idx) => {
                      if (day === null) return <div key={idx} />;
                      const available = isDayAvailable(day);
                      const isSelected = selectedDate?.getDate() === day &&
                        selectedDate?.getMonth() === calMonth &&
                        selectedDate?.getFullYear() === calYear;
                      const isToday = day === today.getDate() &&
                        calMonth === today.getMonth() &&
                        calYear === today.getFullYear();

                      return (
                        <button
                          key={idx}
                          disabled={!available}
                          onClick={() => {
                            setSelectedDate(new Date(calYear, calMonth, day));
                            setSelectedTime(null);
                          }}
                          className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-brand-teal text-white'
                              : available
                                ? 'hover:bg-brand-teal/10 text-brand-petrol'
                                : 'text-gray-300 cursor-not-allowed'
                          } ${isToday && !isSelected ? 'ring-2 ring-brand-teal/30' : ''}`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time slots */}
                {selectedDate && (
                  <div className="card">
                    <h2 className="font-bold mb-4">
                      Créneaux disponibles — {DAYS_FR[selectedDate.getDay()]} {selectedDate.getDate()} {MONTHS_FR[selectedDate.getMonth()]}
                    </h2>
                    {availableSlots.length === 0 ? (
                      <p className="text-sm text-brand-blue-gray py-4 text-center">Aucun créneau disponible ce jour</p>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot}
                            onClick={() => setSelectedTime(slot)}
                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                              selectedTime === slot
                                ? 'bg-brand-teal text-white'
                                : 'bg-gray-50 hover:bg-brand-teal/10 text-brand-petrol'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep('service')} className="btn-secondary flex-1">
                    Retour
                  </button>
                  <button
                    disabled={!selectedDate || !selectedTime}
                    onClick={() => setStep('info')}
                    className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continuer
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Client info */}
            {step === 'info' && (
              <div className="card">
                <h2 className="text-xl font-bold mb-2">Vos informations</h2>
                <p className="text-sm text-brand-blue-gray mb-6">Ces informations seront transmises au praticien</p>

                {!user && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <Link href="/login" className="font-bold underline">Connectez-vous</Link> pour pré-remplir vos informations et retrouver vos réservations.
                    </p>
                  </div>
                )}

                <form
                  onSubmit={(e) => { e.preventDefault(); setStep('confirm'); }}
                  className="space-y-4"
                >
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-1.5">Nom complet *</label>
                    <input
                      id="name"
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="input-field"
                      placeholder="Jean Dupont"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email *</label>
                    <input
                      id="email"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="input-field"
                      placeholder="jean@email.com"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium mb-1.5">Téléphone *</label>
                    <input
                      id="phone"
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="input-field"
                      placeholder="06 12 34 56 78"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="note" className="block text-sm font-medium mb-1.5">
                      Note pour le praticien <span className="text-gray-400 font-normal">(optionnel)</span>
                    </label>
                    <textarea
                      id="note"
                      value={clientNote}
                      onChange={(e) => setClientNote(e.target.value)}
                      className="input-field min-h-[100px] resize-none"
                      placeholder="Informations utiles : motif de la consultation, douleurs, antécédents..."
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setStep('datetime')} className="btn-secondary flex-1">
                      Retour
                    </button>
                    <button type="submit" className="btn-primary flex-1">
                      Continuer
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 'confirm' && (
              <div className="card">
                <h2 className="text-xl font-bold mb-2">Récapitulatif</h2>
                <p className="text-sm text-brand-blue-gray mb-6">Vérifiez les détails avant de confirmer</p>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-medium text-sm text-brand-blue-gray mb-3">PRESTATION</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{selectedService?.name}</p>
                        <p className="text-sm text-brand-blue-gray">{selectedService?.duration} min</p>
                      </div>
                      <span className="font-bold text-brand-teal text-lg">{selectedService?.price} €</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-medium text-sm text-brand-blue-gray mb-3">DATE & HEURE</h3>
                    <p className="font-medium">
                      {selectedDate && `${DAYS_FR[selectedDate.getDay()]} ${selectedDate.getDate()} ${MONTHS_FR[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`}
                    </p>
                    <p className="text-sm text-brand-blue-gray">
                      {selectedTime}
                      {proAddress && ` — ${proAddress}`}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-medium text-sm text-brand-blue-gray mb-3">VOS INFORMATIONS</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-brand-blue-gray">Nom :</span> <span className="font-medium">{clientName}</span></p>
                      <p><span className="text-brand-blue-gray">Email :</span> <span className="font-medium">{clientEmail}</span></p>
                      <p><span className="text-brand-blue-gray">Tél :</span> <span className="font-medium">{clientPhone}</span></p>
                      {clientNote && <p><span className="text-brand-blue-gray">Note :</span> <span className="font-medium">{clientNote}</span></p>}
                    </div>
                  </div>
                </div>

                {paymentCancelled && (
                  <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-sm text-amber-800">
                      <strong>Paiement annulé</strong> — Vous pouvez réessayer le paiement en ligne ou choisir de payer sur place.
                    </p>
                  </div>
                )}

                {/* Payment mode selection */}
                <div className="mt-6">
                  <h3 className="font-medium text-sm text-brand-blue-gray mb-3">MODE DE PAIEMENT</h3>
                  <div className="space-y-2">
                    {proAcceptsOnlinePayment && (
                      <label
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          paymentMode === 'online'
                            ? 'border-brand-teal bg-brand-teal/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMode"
                          value="online"
                          checked={paymentMode === 'online'}
                          onChange={() => setPaymentMode('online')}
                          className="accent-brand-teal"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">Payer en ligne</p>
                          <p className="text-xs text-brand-blue-gray">Paiement sécurisé par carte bancaire via Stripe</p>
                        </div>
                        <span className="font-bold text-brand-teal">{selectedService?.price} €</span>
                      </label>
                    )}
                    {proAcceptsOnsitePayment && (
                      <label
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          paymentMode === 'onsite'
                            ? 'border-brand-teal bg-brand-teal/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMode"
                          value="onsite"
                          checked={paymentMode === 'onsite'}
                          onChange={() => setPaymentMode('onsite')}
                          className="accent-brand-teal"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">Payer sur place</p>
                          <p className="text-xs text-brand-blue-gray">Le règlement se fera directement au cabinet</p>
                        </div>
                        <span className="font-bold text-brand-blue-gray">{selectedService?.price} €</span>
                      </label>
                    )}
                  </div>
                </div>

                {bookingError && (
                  <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
                    <p className="text-sm text-red-700">{bookingError}</p>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep('info')} className="btn-secondary flex-1" disabled={submitting}>
                    Modifier
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={submitting || !user}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {submitting
                      ? 'Réservation en cours...'
                      : paymentMode === 'online' && proAcceptsOnlinePayment
                        ? 'Payer et confirmer'
                        : 'Confirmer la réservation'}
                  </button>
                </div>

                {!user && (
                  <p className="text-sm text-red-500 mt-3 text-center">
                    Vous devez être <Link href="/login" className="underline font-medium">connecté</Link> pour réserver.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Sidebar recap */}
          <div className="hidden lg:block">
            <div className="card sticky top-24">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="w-12 h-12 rounded-xl bg-brand-teal/10 flex items-center justify-center text-brand-teal font-bold">
                  {proInitials}
                </div>
                <div>
                  <p className="font-bold text-sm">{proDisplayName}</p>
                  <p className="text-xs text-brand-teal">{proSpecialty}</p>
                  {proCity && <p className="text-xs text-brand-blue-gray">{proCity}</p>}
                </div>
              </div>

              {selectedService ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-brand-blue-gray">Prestation</span>
                    <span className="font-medium text-right max-w-[140px]">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-blue-gray">Durée</span>
                    <span className="font-medium">{selectedService.duration} min</span>
                  </div>
                  {selectedDate && (
                    <div className="flex justify-between">
                      <span className="text-brand-blue-gray">Date</span>
                      <span className="font-medium">
                        {selectedDate.getDate()} {MONTHS_FR[selectedDate.getMonth()]}
                      </span>
                    </div>
                  )}
                  {selectedTime && (
                    <div className="flex justify-between">
                      <span className="text-brand-blue-gray">Heure</span>
                      <span className="font-medium">{selectedTime}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-3 mt-3 flex justify-between">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-brand-teal">{selectedService.price} €</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-brand-blue-gray text-center py-4">
                  Sélectionnez une prestation pour voir le récapitulatif
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
