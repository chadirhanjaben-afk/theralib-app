'use client';

const categoryLabels: Record<string, string> = {
  'bien-etre': 'Bien-être',
  meditation: 'Méditation',
  nutrition: 'Nutrition',
  yoga: 'Yoga',
  massage: 'Massage',
  naturopathie: 'Naturopathie',
  sophrologie: 'Sophrologie',
  psychologie: 'Psychologie',
  'pratique-pro': 'Pratique pro',
  general: 'Général',
};

const categoryColors: Record<string, string> = {
  'bien-etre': 'bg-teal-100 text-teal-700',
  meditation: 'bg-purple-100 text-purple-700',
  nutrition: 'bg-green-100 text-green-700',
  yoga: 'bg-amber-100 text-amber-700',
  massage: 'bg-blue-100 text-blue-700',
  naturopathie: 'bg-emerald-100 text-emerald-700',
  sophrologie: 'bg-indigo-100 text-indigo-700',
  psychologie: 'bg-rose-100 text-rose-700',
  'pratique-pro': 'bg-orange-100 text-orange-700',
  general: 'bg-gray-100 text-gray-600',
};

export function ForumCategoryBadge({ category }: { category: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
        categoryColors[category] || categoryColors.general
      }`}
    >
      {categoryLabels[category] || category}
    </span>
  );
}

export { categoryLabels };
