'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getServicesByPro, createService, updateService, deleteService } from '@/lib/firebase/firestore';
import type { Service } from '@/types';

const CATEGORIES = [
  'Massage', 'Ostéopathie', 'Naturopathie', 'Sophrologie', 'Yoga',
  'Acupuncture', 'Réflexologie', 'Hypnothérapie', 'Coaching',
  'Consultation', 'Bilan', 'Autre',
];

interface ServiceForm {
  name: string;
  description: string;
  duration: number;
  price: number;
  category: string;
  isOnline: boolean;
}

const emptyForm: ServiceForm = {
  name: '',
  description: '',
  duration: 60,
  price: 0,
  category: '',
  isOnline: false,
};

export default function ProServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadServices = async () => {
    if (!user) return;
    try {
      const data = await getServicesByPro(user.uid);
      setServices(data);
    } catch (err) {
      console.error('Error loading services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [user]);

  const openNewForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (service: Service) => {
    setForm({
      name: service.name,
      description: service.description,
      duration: service.duration,
      price: service.price,
      category: service.category,
      isOnline: service.isOnline,
    });
    setEditingId(service.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user || !form.name || !form.category || form.price <= 0) return;
    setSaving(true);

    try {
      if (editingId) {
        await updateService(editingId, form);
      } else {
        await createService({
          ...form,
          professionalId: user.uid,
          isActive: true,
        });
      }
      await loadServices();
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      console.error('Error saving service:', err);
      alert('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (serviceId: string) => {
    try {
      await deleteService(serviceId);
      await loadServices();
    } catch (err) {
      console.error('Error deleting service:', err);
    } finally {
      setDeleteConfirm(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Mes services</h1>
          <p className="text-brand-blue-gray text-sm mt-1">
            Configurez les prestations que vous proposez
          </p>
        </div>
        {!showForm && (
          <button onClick={openNewForm} className="btn-primary text-sm">
            + Nouveau service
          </button>
        )}
      </div>

      {/* Service form */}
      {showForm && (
        <div className="card mb-8">
          <h2 className="text-lg font-bold mb-4">
            {editingId ? 'Modifier le service' : 'Nouveau service'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nom du service</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
                placeholder="Massage relaxant corps complet"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Catégorie</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input-field"
              >
                <option value="">Sélectionner une catégorie</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field min-h-[80px] resize-y"
                placeholder="Décrivez ce que comprend cette prestation..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Durée (minutes)</label>
                <select
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) })}
                  className="input-field"
                >
                  {[15, 30, 45, 60, 75, 90, 120].map((d) => (
                    <option key={d} value={d}>{d} min</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Prix (€)</label>
                <input
                  type="number"
                  value={form.price || ''}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                  placeholder="60"
                  min={0}
                  step={5}
                />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isOnline}
                onChange={(e) => setForm({ ...form, isOnline: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-brand-teal focus:ring-brand-teal"
              />
              <span className="text-sm font-medium">Disponible en ligne (visioconférence)</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.category || form.price <= 0}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {saving ? 'Sauvegarde...' : editingId ? 'Mettre à jour' : 'Créer le service'}
              </button>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="btn-secondary text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Services list */}
      {services.length === 0 && !showForm ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-4">🛠️</p>
          <p className="font-semibold text-lg mb-2">Aucun service configuré</p>
          <p className="text-sm text-brand-blue-gray mb-6">
            Ajoutez vos prestations pour que les clients puissent les réserver
          </p>
          <button onClick={openNewForm} className="btn-primary text-sm">
            Créer mon premier service
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {services.map((service) => (
            <div key={service.id} className="card flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold">{service.name}</h3>
                  <span className="badge-teal text-[10px]">{service.category}</span>
                  {service.isOnline && (
                    <span className="badge bg-blue-50 text-blue-600 text-[10px]">En ligne</span>
                  )}
                </div>
                <p className="text-sm text-brand-blue-gray mb-2">{service.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-bold text-brand-petrol">{service.price} €</span>
                  <span className="text-brand-blue-gray">{service.duration} min</span>
                </div>
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <button
                  onClick={() => openEditForm(service)}
                  className="p-2 text-brand-blue-gray hover:text-brand-teal hover:bg-brand-teal-bg rounded-lg transition-colors text-sm"
                >
                  Modifier
                </button>
                <button
                  onClick={() => setDeleteConfirm(service.id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-lg mb-2">Supprimer ce service ?</h3>
            <p className="text-sm text-brand-blue-gray mb-6">
              Cette action est irréversible. Le service ne sera plus visible par les clients.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary text-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
