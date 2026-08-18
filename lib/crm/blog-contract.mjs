// The shape of a blog post, shared by the database (0035_blog_posts.sql), the
// server actions that write posts, and the routes that read them. Bounds here
// mirror the CHECK constraints in that migration exactly; when one moves the
// other must move with it, or a post that passes validation will be rejected by
// the database with an opaque error instead of a field-level message.

export const BLOG_STATUSES = Object.freeze(['draft', 'published']);
export const DEFAULT_BLOG_STATUS = 'draft';

// blog_posts_slug_format_check / blog_posts_*_length_check.
export const SLUG_MAX_LENGTH = 80;
export const TITLE_MIN_LENGTH = 1;
export const TITLE_MAX_LENGTH = 200;
export const EXCERPT_MAX_LENGTH = 320;
export const BODY_MIN_LENGTH = 1;
export const BODY_MAX_LENGTH = 100000;
export const SEO_TITLE_MAX_LENGTH = 70;
export const SEO_DESCRIPTION_MAX_LENGTH = 200;

// Mirrors blog_posts_slug_format_check: lowercase alphanumeric words joined by
// single hyphens. Anchored, so it rejects rather than partially matches.
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isBlogStatus(value) {
  return BLOG_STATUSES.includes(value);
}

export function isValidSlug(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= SLUG_MAX_LENGTH &&
    SLUG_PATTERN.test(value)
  );
}

/**
 * Derives a URL-safe slug from arbitrary text.
 *
 * Decomposes accents to their base letters first (NFD + combining-mark strip),
 * so "Café Résumé" becomes "cafe-resume" rather than losing both words to the
 * non-alphanumeric filter. Truncation trims back to a hyphen boundary so a cut
 * slug never ends mid-word with a dangling hyphen, which the format check would
 * reject anyway.
 */
export function slugify(input) {
  if (typeof input !== 'string') return '';

  const base = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (base.length <= SLUG_MAX_LENGTH) return base;

  const cut = base.slice(0, SLUG_MAX_LENGTH);
  const lastHyphen = cut.lastIndexOf('-');
  return (lastHyphen > 0 ? cut.slice(0, lastHyphen) : cut).replace(/-+$/, '');
}

/**
 * Falls back to the opening prose of the body when an author leaves the excerpt
 * blank, so every post still has a meta description and a listing summary.
 * Strips the markdown subset's block markers rather than rendering them, since
 * this text lands in <meta> attributes where "## " would be noise.
 */
export function excerptFrom(body, maxLength = EXCERPT_MAX_LENGTH) {
  if (typeof body !== 'string') return '';

  const flattened = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/^\s{0,3}\d+\.\s+/gm, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (flattened.length <= maxLength) return flattened;

  const cut = flattened.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:]$/, '')}…`;
}

/** Rounded-up reading time at 200 wpm, floored at 1 so no post reads "0 min". */
export function readingTimeMinutes(body) {
  if (typeof body !== 'string') return 1;
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function boundedText(value, min, max) {
  const length = typeof value === 'string' ? value.trim().length : 0;
  return length >= min && length <= max;
}

/**
 * Validates and normalizes untrusted post input from the authoring form.
 *
 * Returns `{ ok, errors, value }`. `errors` is keyed by field so the form can
 * render messages inline; `value` is the normalized row the caller may write.
 * An empty slug is derived from the title rather than rejected, so an author
 * never has to hand-write one, but a slug they *did* supply is validated as
 * given rather than silently rewritten into something else.
 */
export function validateBlogPost(input = {}) {
  const errors = {};

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!boundedText(title, TITLE_MIN_LENGTH, TITLE_MAX_LENGTH)) {
    errors.title = `Title must be between ${TITLE_MIN_LENGTH} and ${TITLE_MAX_LENGTH} characters.`;
  }

  const body = typeof input.body === 'string' ? input.body.trim() : '';
  if (!boundedText(body, BODY_MIN_LENGTH, BODY_MAX_LENGTH)) {
    errors.body = `Post body must be between ${BODY_MIN_LENGTH} and ${BODY_MAX_LENGTH} characters.`;
  }

  const rawSlug = typeof input.slug === 'string' ? input.slug.trim() : '';
  const slug = rawSlug ? rawSlug.toLowerCase() : slugify(title);
  if (!isValidSlug(slug)) {
    errors.slug = rawSlug
      ? 'Slug may contain only lowercase letters, numbers and single hyphens.'
      : 'Could not derive a slug from this title. Enter one manually.';
  }

  const excerptInput = typeof input.excerpt === 'string' ? input.excerpt.trim() : '';
  if (excerptInput.length > EXCERPT_MAX_LENGTH) {
    errors.excerpt = `Excerpt must be ${EXCERPT_MAX_LENGTH} characters or fewer.`;
  }

  const seoTitle = typeof input.seoTitle === 'string' ? input.seoTitle.trim() : '';
  if (seoTitle.length > SEO_TITLE_MAX_LENGTH) {
    errors.seoTitle = `SEO title must be ${SEO_TITLE_MAX_LENGTH} characters or fewer.`;
  }

  const seoDescription =
    typeof input.seoDescription === 'string' ? input.seoDescription.trim() : '';
  if (seoDescription.length > SEO_DESCRIPTION_MAX_LENGTH) {
    errors.seoDescription = `SEO description must be ${SEO_DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  }

  const status = input.status ?? DEFAULT_BLOG_STATUS;
  if (!isBlogStatus(status)) {
    errors.status = 'Status must be draft or published.';
  }

  const coverImageUrl =
    typeof input.coverImageUrl === 'string' ? input.coverImageUrl.trim() : '';
  if (coverImageUrl && !/^https:\/\/[^\s]+$/.test(coverImageUrl)) {
    errors.coverImageUrl = 'Cover image must be an https URL.';
  }

  const ok = Object.keys(errors).length === 0;

  return {
    ok,
    errors,
    value: ok
      ? {
          title,
          slug,
          body,
          // Persist the derived excerpt rather than leaving it null, so the
          // listing and meta description stay stable if the body is later
          // edited in a way that would change a lazily-computed fallback.
          excerpt: excerptInput || excerptFrom(body),
          seo_title: seoTitle || null,
          seo_description: seoDescription || null,
          cover_image_url: coverImageUrl || null,
          status,
        }
      : null,
  };
}
