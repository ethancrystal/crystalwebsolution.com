'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';

import {
  EXCERPT_MAX_LENGTH,
  SEO_DESCRIPTION_MAX_LENGTH,
  SEO_TITLE_MAX_LENGTH,
  SLUG_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from '@/lib/crm/blog-contract.mjs';

// Shared create/edit form. The parent passes the matching server action, so the
// only difference between "new" and "edit" is the hidden id and the defaults.

function SubmitButton({ label }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="crm-button crm-button-primary" disabled={pending}>
      {pending ? 'Saving…' : label}
    </button>
  );
}

function FieldError({ message, id }) {
  if (!message) return null;
  return (
    <p className="crm-field-error" id={id} role="alert">
      {message}
    </p>
  );
}

export default function PostForm({ action, post, submitLabel }) {
  const [state, formAction] = useActionState(
    async (_previous, formData) => action(formData),
    null,
  );

  const fieldErrors = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="crm-form blog-form">
      {post?.id ? <input type="hidden" name="id" value={post.id} /> : null}

      {state && !state.ok && state.error ? (
        <p className="crm-form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="crm-form-success" role="status">
          Saved.
        </p>
      ) : null}

      <div className="crm-field">
        <label htmlFor="post-title">Title</label>
        <input
          id="post-title"
          name="title"
          type="text"
          required
          maxLength={TITLE_MAX_LENGTH}
          defaultValue={post?.title ?? ''}
          aria-describedby={fieldErrors.title ? 'post-title-error' : undefined}
          aria-invalid={fieldErrors.title ? 'true' : undefined}
        />
        <FieldError message={fieldErrors.title} id="post-title-error" />
      </div>

      <div className="crm-field">
        <label htmlFor="post-slug">Slug</label>
        <input
          id="post-slug"
          name="slug"
          type="text"
          maxLength={SLUG_MAX_LENGTH}
          defaultValue={post?.slug ?? ''}
          placeholder="Leave blank to generate from the title"
          aria-describedby={
            fieldErrors.slug ? 'post-slug-error post-slug-hint' : 'post-slug-hint'
          }
          aria-invalid={fieldErrors.slug ? 'true' : undefined}
        />
        <p className="crm-field-hint" id="post-slug-hint">
          The public URL: /blog/your-slug. Changing it on a published post breaks
          existing links.
        </p>
        <FieldError message={fieldErrors.slug} id="post-slug-error" />
      </div>

      <div className="crm-field">
        <label htmlFor="post-excerpt">Excerpt</label>
        <textarea
          id="post-excerpt"
          name="excerpt"
          rows={3}
          maxLength={EXCERPT_MAX_LENGTH}
          defaultValue={post?.excerpt ?? ''}
          placeholder="Leave blank to use the opening of the post"
          aria-describedby={
            fieldErrors.excerpt ? 'post-excerpt-error post-excerpt-hint' : 'post-excerpt-hint'
          }
          aria-invalid={fieldErrors.excerpt ? 'true' : undefined}
        />
        <p className="crm-field-hint" id="post-excerpt-hint">
          Shown on the blog listing and used as the meta description when no SEO
          description is set. Max {EXCERPT_MAX_LENGTH} characters.
        </p>
        <FieldError message={fieldErrors.excerpt} id="post-excerpt-error" />
      </div>

      <div className="crm-field">
        <label htmlFor="post-body">Body</label>
        <textarea
          id="post-body"
          name="body"
          rows={20}
          required
          defaultValue={post?.body ?? ''}
          aria-describedby={
            fieldErrors.body ? 'post-body-error post-body-hint' : 'post-body-hint'
          }
          aria-invalid={fieldErrors.body ? 'true' : undefined}
        />
        <p className="crm-field-hint" id="post-body-hint">
          Markdown: ## and ### headings, **bold**, *italic*, `code`, [links](/path),
          - lists, &gt; quotes, ``` fenced code. The post title is the page&rsquo;s
          only H1, so start headings at ##.
        </p>
        <FieldError message={fieldErrors.body} id="post-body-error" />
      </div>

      <fieldset className="crm-fieldset">
        <legend>Search and social</legend>

        <div className="crm-field">
          <label htmlFor="post-seo-title">SEO title</label>
          <input
            id="post-seo-title"
            name="seoTitle"
            type="text"
            maxLength={SEO_TITLE_MAX_LENGTH}
            defaultValue={post?.seo_title ?? ''}
            placeholder="Defaults to the post title"
            aria-invalid={fieldErrors.seoTitle ? 'true' : undefined}
          />
          <FieldError message={fieldErrors.seoTitle} id="post-seo-title-error" />
        </div>

        <div className="crm-field">
          <label htmlFor="post-seo-description">SEO description</label>
          <textarea
            id="post-seo-description"
            name="seoDescription"
            rows={2}
            maxLength={SEO_DESCRIPTION_MAX_LENGTH}
            defaultValue={post?.seo_description ?? ''}
            placeholder="Defaults to the excerpt"
            aria-invalid={fieldErrors.seoDescription ? 'true' : undefined}
          />
          <FieldError
            message={fieldErrors.seoDescription}
            id="post-seo-description-error"
          />
        </div>

        <div className="crm-field">
          <label htmlFor="post-cover">Cover image URL</label>
          <input
            id="post-cover"
            name="coverImageUrl"
            type="url"
            defaultValue={post?.cover_image_url ?? ''}
            placeholder="https://…"
            aria-describedby={
              fieldErrors.coverImageUrl
                ? 'post-cover-error post-cover-hint'
                : 'post-cover-hint'
            }
            aria-invalid={fieldErrors.coverImageUrl ? 'true' : undefined}
          />
          <p className="crm-field-hint" id="post-cover-hint">
            Optional. Used as the social share image; falls back to the site card.
          </p>
          <FieldError message={fieldErrors.coverImageUrl} id="post-cover-error" />
        </div>
      </fieldset>

      <div className="crm-field">
        <label htmlFor="post-status">Status</label>
        <select
          id="post-status"
          name="status"
          defaultValue={post?.status ?? 'draft'}
          aria-describedby="post-status-hint"
        >
          <option value="draft">Draft — not visible publicly</option>
          <option value="published">Published — live on /blog</option>
        </select>
        <p className="crm-field-hint" id="post-status-hint">
          Publishing takes effect immediately; no redeploy required.
        </p>
      </div>

      <div className="crm-form-actions">
        <SubmitButton label={submitLabel} />
        <Link className="crm-button crm-button-ghost" href="/admin/blog">
          Cancel
        </Link>
      </div>
    </form>
  );
}
