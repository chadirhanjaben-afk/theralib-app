'use client';

import BlogEditor from '@/components/blog/BlogEditor';

export default function NewBlogPostPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-brand-petrol mb-8">Nouvel article</h1>
      <BlogEditor />
    </div>
  );
}
