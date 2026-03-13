'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { getProfessional, createOrUpdateProfessional } from '@/lib/firebase/firestore';
import {
  uploadProfilePhoto,
  uploadGalleryImage,
  validateImageFile,
} from '@/lib/firebase/storage';
import AddressAutocomplete from '@/components/maps/AddressAutocomplete';
import GoogleMap from '@/components/maps/GoogleMap';
import type { Certification } from '@/types';

const SPECIALTIES = [
  'Massage', 'Ostéopathie', 'Naturopathie', 'Sophrologie', 'Yoga',
  'Acupuncture', 'Réflexologie', 'Hypnothérapie', 'Kinésithérapie',
  'Diététique', 'Psychologie', 'Coaching bien-être', 'Méditation',
  'Aromathérapie', 'Chiropractie', 'Shiatsu', 'Reiki', 'Ayurveda',
];

export default function ProProfilePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Stripe Connect state
  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean;
    onboarded: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
  } | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  const profilePhotoRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [photoURL, setPhotoURL] = useState('');
  const [gallery, setGallery] = useState<string[]>([]);
  const [existingRating, setExistingRating] = useState(0);
  const [existingReviewCount, setExistingReviewCount] = useState(0);
  const [existingStripeOnboarded, setExistingStripeOnboarded] = useState(false);

  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  const [form, setForm] = useState({
    businessName: '',
    shortBio: '',
    description: '',
    specialties: [] as string[],
    phone: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'France',
    availableOnline: false,
    acceptsOnsitePayment: true, // par défaut le pro accepte le paiement sur place
    certifications: [] as Certification[],
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const pro = await getProfessional(user.uid);
        if (pro) {
          setForm({
            businessName: pro.businessName || '',
            shortBio: pro.shortBio || '',
            description: pro.description || '',
            specialties: pro.specialties || [],
            phone: user?.phone || '',
            street: pro.address?.street || '',
            city: pro.address?.city || '',
            postalCode: pro.address?.postalCode || '',
            country: pro.address?.country || 'France',
            availableOnline: pro.availableOnline || false,
            acceptsOnsitePayment: pro.acceptsOnsitePayment !== false, // default true si pas défini
            certifications: pro.certifications || [],
          });
          setPhotoURL(pro.photoURL || '');
          setGallery(pro.gallery || []);
          setExistingRating(pro.rating || 0);
          setExistingReviewCount(pro.reviewCount || 0);
          setExistingStripeOnboarded(pro.stripeOnboarded || false);
          if (pro.coordinates?.latitude && pro.coordinates?.longitude) {
            setCoordinates({ latitude: pro.coordinates.latitude, longitude: pro.coordinates.longitude });
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // ─── Stripe Connect ───

  const checkStripeStatus = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/stripe/connect/status?proId=${user.uid}`);
      const data = await res.json();
      if (res.ok) setStripeStatus(data);
    } catch (err) {
      console.error('Error checking Stripe status:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) checkStripeStatus();
  }, [user, checkStripeStatus]);

  // Check Stripe status on return from onboarding
  useEffect(() => {
    const stripeParam = searchParams.get('stripe');
    if (stripeParam === 'success' || stripeParam === 'refresh') {
      checkStripeStatus();
    }
  }, [searchParams, checkStripeStatus]);

  const handleStripeConnect = async () => {
    if (!user) return;
    setStripeLoading(true);
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proId: user.uid }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Erreur lors de la connexion Stripe');
      }
    } catch (err) {
      console.error('Stripe connect error:', err);
      alert('Erreur lors de la connexion à Stripe');
    } finally {
      setStripeLoading(false);
    }
  };

  // ─── Photo upload handlers ───

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validation = validateImageFile(file, 5);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setUploadingPhoto(true);
    try {
      const url = await uploadProfilePhoto(user.uid, file);
      setPhotoURL(url);
    } catch (err) {
      console.error('Error uploading profile photo:', err);
      alert('Erreur lors de l\'upload de la photo.');
    } finally {
      setUploadingPhoto(false);
      if (profilePhotoRef.current) profilePhotoRef.current.value = '';
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploadingGallery(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const validation = validateImageFile(file, 5);
        if (!validation.valid) {
          alert(`${file.name}: ${validation.error}`);
          continue;
        }
        const url = await uploadGalleryImage(user.uid, file);
        newUrls.push(url);
      }
      setGallery((prev) => [...prev, ...newUrls]);
    } catch (err) {
      console.error('Error uploading gallery images:', err);
      alert('Erreur lors de l\'upload des images.');
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const removeGalleryImage = (index: number) => {
    setGallery((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Form helpers ───

  const toggleSpecialty = (spec: string) => {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(spec)
        ? prev.specialties.filter((s) => s !== spec)
        : [...prev.specialties, spec],
    }));
  };

  const addCertification = () => {
    setForm((prev) => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        { title: '', institution: '', year: new Date().getFullYear() },
      ],
    }));
  };

  const updateCertification = (index: number, field: keyof Certification, value: string | number) => {
    setForm((prev) => {
      const certs = [...prev.certifications];
      certs[index] = { ...certs[index], [field]: value };
      return { ...prev, certifications: certs };
    });
  };

  const removeCertification = (index: number) => {
    setForm((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // ─── Save ───

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);

    try {
      await createOrUpdateProfessional(user.uid, {
        userId: user.uid,
        businessName: form.businessName,
        slug: generateSlug(form.businessName || user?.displayName || ''),
        shortBio: form.shortBio,
        description: form.description,
        specialties: form.specialties,
        certifications: form.certifications,
        address: {
          street: form.street,
          city: form.city,
          postalCode: form.postalCode,
          country: form.country,
        },
        ...(coordinates ? { coordinates } : {}),
        availableOnline: form.availableOnline,
        acceptsOnsitePayment: form.acceptsOnsitePayment,
        photoURL,
        gallery,
        stripeOnboarded: existingStripeOnboarded,
        subscriptionTier: 'starter',
        rating: existingRating,
        reviewCount: existingReviewCount,
        isVerified: false,
        isActive: true,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Save error:', err);
      alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ───

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const initials = (form.businessName || user?.displayName || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Mon profil professionnel</h1>
          <p className="text-brand-blue-gray text-sm mt-1">
            Complétez votre profil pour apparaître dans le répertoire
          </p>
        </div>
        {saved && (
          <span className="text-green-600 text-sm font-medium bg-green-50 px-4 py-2 rounded-xl">
            Profil sauvegardé !
          </span>
        )}
      </div>

      <div className="space-y-8">

        {/* ═══ PROFILE PHOTO ═══ */}
        <section className="card">
          <h2 className="text-lg font-bold mb-4">Photo de profil</h2>
          <div className="flex items-center gap-6">
            <div className="relative group">
              {photoURL ? (
                <div className="w-28 h-28 rounded-2xl overflow-hidden relative">
                  <Image
                    src={photoURL}
                    alt="Photo de profil"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-brand-teal to-teal-600 flex items-center justify-center text-white text-3xl font-bold">
                  {initials}
                </div>
              )}
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => profilePhotoRef.current?.click()}
                disabled={uploadingPhoto}
                className="btn-primary text-sm px-5 py-2.5 disabled:opacity-50"
              >
                {uploadingPhoto ? 'Upload...' : photoURL ? 'Changer la photo' : 'Ajouter une photo'}
              </button>
              <p className="text-xs text-gray-400 mt-2">JPG, PNG ou WebP. Max 5 Mo.</p>
              <input
                ref={profilePhotoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleProfilePhotoChange}
                className="hidden"
              />
            </div>
          </div>
        </section>

        {/* ═══ GALLERY ═══ */}
        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Galerie photos</h2>
              <p className="text-sm text-brand-blue-gray mt-0.5">
                Montrez votre cabinet, vos équipements, votre ambiance ({gallery.length}/8)
              </p>
            </div>
            {gallery.length < 8 && (
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={uploadingGallery}
                className="text-sm text-brand-teal font-medium hover:underline disabled:opacity-50"
              >
                {uploadingGallery ? 'Upload...' : '+ Ajouter'}
              </button>
            )}
          </div>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleGalleryUpload}
            className="hidden"
          />

          {gallery.length === 0 ? (
            <div
              onClick={() => galleryInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-brand-teal/30 hover:bg-brand-teal/5 transition-colors"
            >
              <p className="text-3xl mb-2">📷</p>
              <p className="text-sm font-medium text-gray-500">Cliquez pour ajouter des photos</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG ou WebP. Max 5 Mo par image.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {gallery.map((url, i) => (
                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden">
                  <Image
                    src={url}
                    alt={`Galerie ${i + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(i)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 hover:bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {gallery.length < 8 && (
                <div
                  onClick={() => galleryInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-brand-teal/30 hover:bg-brand-teal/5 transition-colors"
                >
                  <span className="text-2xl text-gray-300">+</span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ═══ BUSINESS INFO ═══ */}
        <section className="card">
          <h2 className="text-lg font-bold mb-4">Informations générales</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nom de votre activité</label>
              <input
                type="text"
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                className="input-field"
                placeholder="Cabinet de Naturopathie Dupont"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Bio courte</label>
              <input
                type="text"
                value={form.shortBio}
                onChange={(e) => setForm({ ...form, shortBio: e.target.value })}
                className="input-field"
                placeholder="Naturopathe certifiée, spécialisée en gestion du stress"
                maxLength={150}
              />
              <p className="text-xs text-gray-400 mt-1">{form.shortBio.length}/150 caractères</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Description détaillée</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field min-h-[120px] resize-y"
                placeholder="Décrivez votre parcours, votre approche et ce qui vous distingue..."
                rows={5}
              />
            </div>
          </div>
        </section>

        {/* ═══ SPECIALTIES ═══ */}
        <section className="card">
          <h2 className="text-lg font-bold mb-4">Spécialités</h2>
          <p className="text-sm text-brand-blue-gray mb-4">Sélectionnez vos domaines d&apos;expertise</p>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map((spec) => (
              <button
                key={spec}
                type="button"
                onClick={() => toggleSpecialty(spec)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  form.specialties.includes(spec)
                    ? 'bg-brand-teal text-white'
                    : 'bg-gray-100 text-brand-blue-gray hover:bg-gray-200'
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        </section>

        {/* ═══ ADDRESS ═══ */}
        <section className="card">
          <h2 className="text-lg font-bold mb-4">Adresse du cabinet</h2>
          <div className="space-y-4">
            {/* Address autocomplete search */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Rechercher votre adresse</label>
              <AddressAutocomplete
                defaultValue={[form.street, form.postalCode, form.city].filter(Boolean).join(', ')}
                onAddressSelect={(addr) => {
                  setForm((prev) => ({
                    ...prev,
                    street: addr.street,
                    city: addr.city,
                    postalCode: addr.postalCode,
                    country: addr.country,
                  }));
                  setCoordinates({ latitude: addr.latitude, longitude: addr.longitude });
                }}
                placeholder="Tapez votre adresse pour la rechercher..."
              />
              <p className="text-xs text-gray-400 mt-1">
                Sélectionnez une suggestion pour remplir automatiquement les champs ci-dessous
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Rue</label>
              <input
                type="text"
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                className="input-field"
                placeholder="12 Rue de la Paix"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Code postal</label>
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  className="input-field"
                  placeholder="75001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Ville</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="input-field"
                  placeholder="Paris"
                />
              </div>
            </div>

            {/* Map preview */}
            {coordinates && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Aperçu de la localisation</label>
                <GoogleMap
                  latitude={coordinates.latitude}
                  longitude={coordinates.longitude}
                  markerTitle={form.businessName || 'Mon cabinet'}
                  height="200px"
                  zoom={16}
                  interactive={true}
                />
              </div>
            )}

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.availableOnline}
                onChange={(e) => setForm({ ...form, availableOnline: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-brand-teal focus:ring-brand-teal"
              />
              <span className="text-sm font-medium">Je propose aussi des consultations en ligne</span>
            </label>
          </div>
        </section>

        {/* ═══ CERTIFICATIONS ═══ */}
        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Certifications & Diplômes</h2>
            <button
              type="button"
              onClick={addCertification}
              className="text-sm text-brand-teal font-medium hover:underline"
            >
              + Ajouter
            </button>
          </div>
          {form.certifications.length === 0 ? (
            <p className="text-sm text-brand-blue-gray text-center py-4">
              Aucune certification ajoutée. Vos diplômes rassurent les clients.
            </p>
          ) : (
            <div className="space-y-4">
              {form.certifications.map((cert, i) => (
                <div key={i} className="flex gap-3 items-start bg-gray-50 rounded-xl p-4">
                  <div className="flex-1 space-y-3">
                    <input
                      type="text"
                      value={cert.title}
                      onChange={(e) => updateCertification(i, 'title', e.target.value)}
                      className="input-field text-sm"
                      placeholder="Titre du diplôme"
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={cert.institution}
                        onChange={(e) => updateCertification(i, 'institution', e.target.value)}
                        className="input-field text-sm col-span-2"
                        placeholder="Établissement"
                      />
                      <input
                        type="number"
                        value={cert.year}
                        onChange={(e) => updateCertification(i, 'year', parseInt(e.target.value))}
                        className="input-field text-sm"
                        placeholder="Année"
                        min={1970}
                        max={2030}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCertification(i)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ═══ STRIPE CONNECT ═══ */}
        <section className="card">
          <h2 className="text-lg font-bold mb-2">Paiement en ligne</h2>
          <p className="text-sm text-brand-blue-gray mb-4">
            Connectez votre compte Stripe pour recevoir les paiements de vos clients directement sur votre compte bancaire.
          </p>

          {stripeStatus === null ? (
            <div className="flex items-center gap-2 text-sm text-brand-blue-gray">
              <div className="w-4 h-4 border-2 border-brand-teal border-t-transparent rounded-full animate-spin" />
              Vérification du statut...
            </div>
          ) : stripeStatus.onboarded ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium text-green-800 text-sm">Compte Stripe connecté</p>
                  <p className="text-xs text-green-600">
                    Vous pouvez recevoir les paiements en ligne de vos clients.
                  </p>
                </div>
              </div>
              <button
                onClick={handleStripeConnect}
                disabled={stripeLoading}
                className="text-sm text-brand-teal hover:underline font-medium"
              >
                Mettre à jour mes informations Stripe
              </button>
            </div>
          ) : stripeStatus.connected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <svg className="w-6 h-6 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="font-medium text-amber-800 text-sm">Configuration incomplète</p>
                  <p className="text-xs text-amber-600">
                    Votre compte Stripe est créé mais la vérification n&apos;est pas terminée.
                  </p>
                </div>
              </div>
              <button
                onClick={handleStripeConnect}
                disabled={stripeLoading}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {stripeLoading ? 'Redirection...' : 'Terminer la configuration Stripe'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <svg className="w-6 h-6 text-brand-blue-gray flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <div className="text-sm text-brand-blue-gray">
                  <p className="mb-1">En connectant Stripe, vos clients pourront :</p>
                  <ul className="space-y-1 ml-1">
                    <li>- Payer en ligne lors de la réservation</li>
                    <li>- Payer par carte bancaire en toute sécurité</li>
                    <li>- L&apos;argent est versé directement sur votre compte</li>
                  </ul>
                </div>
              </div>
              <button
                onClick={handleStripeConnect}
                disabled={stripeLoading}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {stripeLoading ? 'Redirection vers Stripe...' : 'Connecter mon compte Stripe'}
              </button>
            </div>
          )}
        </section>

        {/* ═══ PAYMENT SETTINGS ═══ */}
        <section className="card">
          <h2 className="text-lg font-bold mb-2">Options de paiement</h2>
          <p className="text-sm text-brand-blue-gray mb-4">
            Choisissez les modes de paiement que vous acceptez de vos clients.
          </p>

          <div className="space-y-3">
            {/* Online payment status (read-only — depends on Stripe) */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-sm">Paiement en ligne (Stripe)</p>
                <p className="text-xs text-brand-blue-gray">
                  {stripeStatus?.onboarded
                    ? 'Activé — vos clients peuvent payer par carte en ligne'
                    : 'Désactivé — connectez Stripe ci-dessus pour activer'}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${stripeStatus?.onboarded ? 'bg-green-500' : 'bg-gray-300'}`} />
            </div>

            {/* On-site payment toggle */}
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
              <div>
                <p className="font-medium text-sm">Paiement sur place</p>
                <p className="text-xs text-brand-blue-gray">
                  Vos clients peuvent régler au cabinet (espèces, carte, chèque)
                </p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={form.acceptsOnsitePayment}
                  onChange={(e) => setForm({ ...form, acceptsOnsitePayment: e.target.checked })}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${form.acceptsOnsitePayment ? 'bg-brand-teal' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ${form.acceptsOnsitePayment ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </div>
              </div>
            </label>

            {/* Warning if both are off */}
            {!form.acceptsOnsitePayment && !stripeStatus?.onboarded && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                <p className="text-xs text-red-700">
                  <strong>Attention :</strong> Aucun mode de paiement n&apos;est activé.
                  Vos clients ne pourront pas finaliser leur réservation.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ═══ SAVE ═══ */}
        <div className="flex justify-end gap-4 pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-10 disabled:opacity-50"
          >
            {saving ? 'Sauvegarde...' : 'Enregistrer le profil'}
          </button>
        </div>
      </div>
    </div>
  );
}
