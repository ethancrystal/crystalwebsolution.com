import Link from 'next/link';

import { requireRole } from '@/lib/auth/require-role';
import { ROLES } from '@/lib/auth/roles.mjs';
import { createPostAction } from '@/app/actions/blog-actions';
import PostForm from '../PostForm';

export const metadata = {
  title: 'New post',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function NewPostPage() {
  await requireRole([ROLES.ADMIN], '/login/admin');

  return (
    <main className="crm-page admin-blog-editor">
      <header className="crm-page-header">
        <div>
          <p className="crm-breadcrumb">
            <Link href="/admin/blog">Blog</Link>
          </p>
          <h1>New post</h1>
        </div>
      </header>

      <PostForm action={createPostAction} submitLabel="Create post" />
    </main>
  );
}
