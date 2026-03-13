'use client';

import TicketList from '@/components/support/TicketList';

export default function AdminSupportPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-petrol">Gestion du support</h1>
        <p className="text-gray-500 mt-1">Tous les tickets des utilisateurs</p>
      </div>

      <TicketList basePath="/dashboard/admin/support" showUserInfo />
    </div>
  );
}
