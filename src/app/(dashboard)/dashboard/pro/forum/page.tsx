'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThreadList from '@/components/forum/ThreadList';
import { categoryLabels } from '@/components/forum/ForumCategoryBadge';

const categories = [
  { key: 'all', label: 'Toutes' },
  ...Object.entries(categoryLabels).map(([key, label]) => ({ key, label })),
];

export default function ProForumPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-petrol">Forum communautaire</h1>
          <p className="text-gray-500 mt-1">
            Échangez entre professionnels, partagez vos expériences
          </p>
        </div>
        <Link href="/dashboard/pro/forum/new" className="btn-primary shrink-0">
          + Nouvelle discussion
        </Link>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
              selectedCategory === cat.key
                ? 'bg-brand-teal text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Thread list */}
      <ThreadList basePath="/dashboard/pro/forum" selectedCategory={selectedCategory} />
    </div>
  );
}
