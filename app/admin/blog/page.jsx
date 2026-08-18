import Link from 'next/link';

import { requireRole } from '@/lib/auth/require-role';
import { ROLES } from '@/lib/auth/roles.mjs';
import { listAllPosts } from '@/lib/crm/blog';
import PostRowActions from './PostRowActions';

export const metadata = {
  title: 'Blog',
  robots: { index: false, follow: false },
};

// Drafts must never be served from a cache shared with the public listing.
export const dynamic = 'force-dynamic';

function formatDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function AdminBlogPage() {
  // middleware.js already bounces non-admins off /admin/*, but this route also
  // reads drafts, so it re-checks rather than trusting the edge to be the only
  // thing standing between a client session and unpublished content.
  await requireRole([ROLES.ADMIN], '/login/admin');

  const posts = await listAllPosts({ limit: 100 });

  return (
    <main className="crm-page admin-blog">
      <header className="crm-page-header">
        <div>
          <h1>Blog</h1>
          <p className="crm-page-subtitle">
            {posts.length} {posts.length === 1 ? 'post' : 'posts'}. Publishing is live
            immediately — no redeploy.
          </p>
        </div>
        <div className="crm-page-actions">
          <Link className="crm-button crm-button-primary" href="/admin/blog/new">
            New post
          </Link>
          <Link className="crm-button crm-button-ghost" href="/admin">
            Back to admin
          </Link>
        </div>
      </header>

      {posts.length === 0 ? (
        <p className="crm-empty">
          No posts yet. <Link href="/admin/blog/new">Write the first one.</Link>
        </p>
      ) : (
        <table className="crm-table">
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Status</th>
              <th scope="col">Published</th>
              <th scope="col">Updated</th>
              <th scope="col">
                <span className="crm-visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <th scope="row">
                  <Link href={`/admin/blog/${post.id}`}>{post.title}</Link>
                  <span className="crm-table-sub">/blog/{post.slug}</span>
                </th>
                <td>
                  <span className={`crm-badge crm-badge-${post.status}`}>
                    {post.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td>{formatDate(post.published_at)}</td>
                <td>{formatDate(post.updated_at)}</td>
                <td>
                  <PostRowActions post={post} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
