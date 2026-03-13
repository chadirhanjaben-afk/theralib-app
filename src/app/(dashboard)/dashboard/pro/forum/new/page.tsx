'use client';

import Link from 'next/link';
import NewThreadForm from '@/components/forum/NewThreadForm';

export default function ProNewForumThreadPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/dashboard/pro/forum"
        className="text-sm text-brand-teal hover:underline mb-4 inline-block"
      >
        ← Retour au forum
      </Link>
      <h1 className="text-2xl font-bold text-brand-petrol mb-6">
        Nouvelle discussion
      </h1>
      <NewThreadForm redirectPath="/dashboard/pro/forum" />
    </div>
  );
}
