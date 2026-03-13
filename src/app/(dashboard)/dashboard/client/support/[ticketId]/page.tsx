'use client';

import { use } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import TicketConversation from '@/components/support/TicketConversation';

export default function ClientTicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = use(params);
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <TicketConversation
        ticketId={ticketId}
        currentUserId={user.uid}
        isAdmin={false}
        backPath="/dashboard/client/support"
      />
    </div>
  );
}
