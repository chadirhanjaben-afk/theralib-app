'use client';

import NewTicketForm from '@/components/support/NewTicketForm';

export default function NewClientTicketPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-brand-petrol mb-2">Nouveau ticket</h1>
      <p className="text-gray-500 mb-8">
        Décrivez votre problème et notre équipe vous répondra dans les plus brefs délais.
      </p>
      <div className="card">
        <NewTicketForm redirectPath="/dashboard/client/support" />
      </div>
    </div>
  );
}
