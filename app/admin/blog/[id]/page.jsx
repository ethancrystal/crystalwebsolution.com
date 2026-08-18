import Link from 'next/link';
import { notFound } from 'next/navigation';

import { requireRole } from '@/lib/auth/require-role';
import { ROLES } from '@/lib/auth/roles.mjs';
import { getPostById } from '@/lib/crm/blog';
import { updatePostAction } from '@/app/actions/blog-actions';
import PostForm from '../PostForm';

export const metadata = {
  title: 'Edit post',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function EditPostPage({ params }) {
  await requireRole([ROLES.ADMIN], '/login/admin');

  const { id } = await params;
  const post = await getPostById(id);

  if (!post) notFound();

  return (
    <main className="crm-page admin-blog-editor">
      <header className="crm-page-header">
        <div>
          <p className="crm-breadcrumb">
            <Link href="/admin/blog">Blog</Link>
          </p>
          <h1>Edit post</h1>
          <p className="crm-page-subtitle">
            {post.status === 'published' ? (
              <>
                Live at <Link href={`/blog/${post.slug}`}>/blog/{post.slug}</Link>
              </>
            ) : (
              <>Draft — not visible publicly.</>
            )}
          </p>
        </div>
      </header>

      <PostForm action={updatePostAction} post={post} submitLabel="Save changes" />
    </main>
  );
}
