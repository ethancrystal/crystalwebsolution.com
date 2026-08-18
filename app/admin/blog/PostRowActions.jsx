'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

import { deletePostAction, setPostStatusAction } from '@/app/actions/blog-actions';

// Per-row publish/unpublish/delete. Kept as a client island so the listing page
// itself stays a server component and never ships the post data twice.

export default function PostRowActions({ post }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const nextStatus = post.status === 'published' ? 'draft' : 'published';

  const run = (action, formData) => {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (!result?.ok) setError(result?.error ?? 'Something went wrong.');
      // On success the server action revalidates /admin/blog, so the row
      // re-renders from the server rather than from optimistic local state.
    });
  };

  const toggleStatus = () => {
    const formData = new FormData();
    formData.set('id', post.id);
    formData.set('status', nextStatus);
    run(setPostStatusAction, formData);
  };

  const remove = () => {
    const formData = new FormData();
    formData.set('id', post.id);
    run(deletePostAction, formData);
  };

  return (
    <div className="crm-row-actions">
      {post.status === 'published' ? (
        <Link
          className="crm-button crm-button-ghost crm-button-small"
          href={`/blog/${post.slug}`}
        >
          View
        </Link>
      ) : null}

      <Link
        className="crm-button crm-button-ghost crm-button-small"
        href={`/admin/blog/${post.id}`}
      >
        Edit
      </Link>

      <button
        type="button"
        className="crm-button crm-button-ghost crm-button-small"
        onClick={toggleStatus}
        disabled={isPending}
      >
        {post.status === 'published' ? 'Unpublish' : 'Publish'}
      </button>

      {confirmingDelete ? (
        <>
          <button
            type="button"
            className="crm-button crm-button-danger crm-button-small"
            onClick={remove}
            disabled={isPending}
          >
            Confirm delete
          </button>
          <button
            type="button"
            className="crm-button crm-button-ghost crm-button-small"
            onClick={() => setConfirmingDelete(false)}
            disabled={isPending}
          >
            Keep
          </button>
        </>
      ) : (
        <button
          type="button"
          className="crm-button crm-button-ghost crm-button-small"
          onClick={() => setConfirmingDelete(true)}
          disabled={isPending}
        >
          Delete
        </button>
      )}

      {error ? (
        <p className="crm-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
