'use client';

import { use } from 'react';
import BlogEditor from '@/components/blog/BlogEditor';

export default function EditBlogPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = use(params);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-brand-petrol mb-8">Modifier l&apos;article</h1>
      <BlogEditor postId={postId} />
    </div>
  );
}
