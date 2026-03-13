'use client';

import { use } from 'react';
import Link from 'next/link';
import ThreadConversation from '@/components/forum/ThreadConversation';

export default function AdminForumThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = use(params);

  return (
    <div>
      <Link
        href="/dashboard/admin/forum"
        className="text-sm text-brand-teal hover:underline mb-6 inline-block"
      >
        ← Retour à la modération
      </Link>
      <ThreadConversation threadSlug={threadId} isAdmin />
    </div>
  );
}
