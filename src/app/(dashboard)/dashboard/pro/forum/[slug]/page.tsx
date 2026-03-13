'use client';

import { use } from 'react';
import Link from 'next/link';
import ThreadConversation from '@/components/forum/ThreadConversation';

export default function ProForumThreadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  return (
    <div>
      <Link
        href="/dashboard/pro/forum"
        className="text-sm text-brand-teal hover:underline mb-6 inline-block"
      >
        ← Retour au forum
      </Link>
      <ThreadConversation threadSlug={slug} />
    </div>
  );
}
