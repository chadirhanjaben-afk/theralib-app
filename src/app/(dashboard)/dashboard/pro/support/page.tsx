'use client';

import Link from 'next/link';
import TicketList from '@/components/support/TicketList';

export default function ProSupportPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-petrol">Support</h1>
          <p className="text-gray-500 mt-1">Un problème ? Contactez-nous.</p>
        </div>
        <Link href="/dashboard/pro/support/new" className="btn-primary">
          + Nouveau ticket
        </Link>
      </div>

      <TicketList basePath="/dashboard/pro/support" />
    </div>
  );
}
