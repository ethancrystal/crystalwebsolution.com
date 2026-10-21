// Artwork upload rules for the homepage production request, shared by the
// browser form, /api/contact, /api/contact/artwork/complete and the tests.
// .mjs so tests import and run it rather than regex its source.
//
// The same limits are enforced a third and fourth time in the database
// (reserve_contact_artwork, migration 0053) and by the bucket itself
// (file_size_limit, allowed_mime_types), so a client that skips this module
// still cannot store anything outside them.

export const ARTWORK_BUCKET = 'contact-artwork';

export const ARTWORK_LIMITS = Object.freeze({
  maxFiles: 3,
  maxFileBytes: 10 * 1024 * 1024,
  maxTotalBytes: 25 * 1024 * 1024,
  nameMax: 120,
});

// The upload content type comes from the extension, never from the browser
// (which reports '' or a guess for .ai, .eps and .dst). These are exactly the
// bucket's allowed_mime_types.
export const ARTWORK_TYPES = Object.freeze({
  ai: 'application/illustrator',
  eps: 'application/postscript',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  dst: 'application/octet-stream',
});

export const ARTWORK_ACCEPT = Object.keys(ARTWORK_TYPES).map((ext) => `.${ext}`).join(',');
export const ARTWORK_FORMATS_LABEL = 'AI · EPS · PDF · PNG · JPG · DST';
export const ARTWORK_FORMATS_LIST = 'AI, EPS, PDF, PNG, JPG or DST';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function artworkExtension(name) {
  if (typeof name !== 'string') return '';
  const match = /\.([A-Za-z0-9]+)$/.exec(name.trim());
  return match ? match[1].toLowerCase() : '';
}

// Display name: no path segments (some browsers and drag sources include one),
// no control characters, bounded. Mirrors the database's own cleaning.
export function cleanArtworkName(name) {
  if (typeof name !== 'string') return '';
  return name
    .replace(/^.*[\\/]/, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]+/g, '')
    .trim()
    .slice(0, ARTWORK_LIMITS.nameMax);
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_MB = ARTWORK_LIMITS.maxFileBytes / (1024 * 1024);
const MAX_TOTAL_MB = ARTWORK_LIMITS.maxTotalBytes / (1024 * 1024);

export const ARTWORK_ERROR_MESSAGES = Object.freeze({
  tooMany: `Attach up to ${ARTWORK_LIMITS.maxFiles} files, or send the rest by email.`,
  tooLargeTotal: `The files add up to more than ${MAX_TOTAL_MB} MB. Attach fewer or smaller files, or send them by email.`,
  type: (name) => `“${name}” is not an accepted file type. Use ${ARTWORK_FORMATS_LIST}.`,
  empty: (name) => `“${name}” is empty.`,
  tooLarge: (name) => `“${name}” is larger than ${MAX_MB} MB. Send it by email instead.`,
  malformed: 'One of the files could not be read. Remove it and try again.',
});

// Cleans a list of { name, size } and returns it with the first problem found.
// Used on `files` in the request payload (declared sizes) and on the File
// objects the visitor picks. Never throws, never trusts the input shape.
export function normalizeArtworkFiles(input) {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, 20)
    .filter((file) => file && typeof file === 'object' && typeof file.name === 'string' && Number.isFinite(file.size))
    .map((file) => ({ name: cleanArtworkName(file.name), size: Math.max(0, Math.floor(file.size)) }));
}

export function validateArtworkFiles(input) {
  const rawCount = Array.isArray(input) ? input.length : 0;
  const files = normalizeArtworkFiles(input);

  if (rawCount > ARTWORK_LIMITS.maxFiles) return { files, error: ARTWORK_ERROR_MESSAGES.tooMany };
  if (files.length !== rawCount) return { files, error: ARTWORK_ERROR_MESSAGES.malformed };

  let total = 0;
  for (const file of files) {
    const ext = artworkExtension(file.name);
    if (!file.name || !Object.hasOwn(ARTWORK_TYPES, ext)) {
      return { files, error: ARTWORK_ERROR_MESSAGES.type(file.name || 'This file') };
    }
    if (file.size < 1) return { files, error: ARTWORK_ERROR_MESSAGES.empty(file.name) };
    if (file.size > ARTWORK_LIMITS.maxFileBytes) return { files, error: ARTWORK_ERROR_MESSAGES.tooLarge(file.name) };
    total += file.size;
  }
  if (total > ARTWORK_LIMITS.maxTotalBytes) return { files, error: ARTWORK_ERROR_MESSAGES.tooLargeTotal };

  return { files, error: '' };
}

// File signature check on the first bytes of a stored object. The extension
// and MIME type are claims by the uploader; the first bytes are the file. Only
// ever read, never executed or rendered: artwork is served as a download.
const startsWith = (bytes, signature, offset = 0) =>
  signature.every((byte, index) => bytes[offset + index] === byte);

const ascii = (text) => [...text].map((char) => char.charCodeAt(0));

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
const PDF = ascii('%PDF-');
const POSTSCRIPT = ascii('%!PS');
// Binary EPS with a TIFF/WMF preview starts with this DOS EPS header.
const DOS_EPS = [0xc5, 0xd0, 0xd3, 0xc6];
// Tajima .dst files begin with an ASCII "LA:" design label.
const DST_LABEL = ascii('LA:');

export function sniffArtworkType(ext, bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) return false;

  switch (ext) {
    case 'png':
      return startsWith(bytes, PNG);
    case 'jpg':
    case 'jpeg':
      return startsWith(bytes, JPEG);
    case 'pdf': {
      // The PDF header may follow a few bytes of padding.
      const head = bytes.subarray(0, 1024);
      for (let i = 0; i + PDF.length <= head.length && i < 1024; i += 1) {
        if (startsWith(head, PDF, i)) return true;
      }
      return false;
    }
    case 'eps':
      return startsWith(bytes, POSTSCRIPT) || startsWith(bytes, DOS_EPS);
    case 'ai':
      // Illustrator 9+ files are PDF-compatible; older ones are PostScript.
      return startsWith(bytes, PDF) || startsWith(bytes, POSTSCRIPT);
    case 'dst':
      return startsWith(bytes, DST_LABEL);
    default:
      return false;
  }
}
