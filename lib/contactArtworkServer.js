// Server side of the production-request artwork upload (migration 0053).
// Service-role only: every function here is called from a route handler after
// that route's own guards, and none is reachable from the browser.
//
//   reserveArtworkSlots     after the lead exists: reserve paths, mint one
//                           signed upload URL per file
//   completeArtwork         after the browser has uploaded: check the stored
//                           objects, attach the good ones, drop the rest
//   cleanupStaleContactArtwork  daily: expire stale reservations, drain the
//                           object-removal queue

import { randomUUID } from 'node:crypto';
import { createAdminClient } from './supabase/admin';
import {
  ARTWORK_BUCKET,
  ARTWORK_LIMITS,
  artworkExtension,
  sniffArtworkType,
} from './contactArtwork.mjs';

const UNAVAILABLE = Object.freeze({ status: 'unavailable' });

// Never throws: a failure here must not change the visitor-facing outcome of
// the request (the lead is already stored and emailed). The caller tells the
// visitor to email the files instead.
export async function reserveArtworkSlots({ dealId, files }) {
  if (!dealId || !Array.isArray(files) || files.length === 0) return UNAVAILABLE;

  try {
    const supabase = createAdminClient();
    const submissionId = randomUUID();

    const { data: slots, error } = await supabase.rpc('reserve_contact_artwork', {
      p_deal_id: dealId,
      p_submission_id: submissionId,
      p_files: files.map(({ name, size }) => ({ name, size })),
    });
    if (error || !Array.isArray(slots) || slots.length !== files.length) {
      console.error('reserve_contact_artwork failed:', error?.message ?? 'unexpected result');
      return UNAVAILABLE;
    }

    const uploads = [];
    for (const slot of slots) {
      const { data: signed, error: signError } = await supabase.storage
        .from(ARTWORK_BUCKET)
        .createSignedUploadUrl(slot.path);
      if (signError || !signed?.token) {
        // The reserved rows stay pending and are swept after 24 h.
        console.error('createSignedUploadUrl failed:', signError?.message ?? 'no token');
        return UNAVAILABLE;
      }
      uploads.push({ name: slot.name, path: slot.path, token: signed.token, contentType: slot.content_type });
    }

    return { status: 'ready', dealId, submissionId, uploads };
  } catch (error) {
    console.error('Artwork upload unavailable:', error.message);
    return UNAVAILABLE;
  }
}

const HEAD_BYTES = 1024;

// First bytes of a stored object, read through a short-lived signed URL with a
// Range request. Reads at most HEAD_BYTES even if the origin ignores Range.
async function readObjectHead(supabase, path) {
  const { data, error } = await supabase.storage.from(ARTWORK_BUCKET).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) return null;

  const response = await fetch(data.signedUrl, {
    headers: { Range: `bytes=0-${HEAD_BYTES - 1}` },
    cache: 'no-store',
  });
  if (!response.ok && response.status !== 206) return null;

  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array(await response.arrayBuffer()).subarray(0, HEAD_BYTES);

  const chunks = [];
  let length = 0;
  try {
    while (length < HEAD_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      length += value.length;
    }
  } finally {
    reader.cancel().catch(() => {});
  }

  const head = new Uint8Array(Math.min(length, HEAD_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    if (offset >= head.length) break;
    const slice = chunk.subarray(0, head.length - offset);
    head.set(slice, offset);
    offset += slice.length;
  }
  return head;
}

// Verifies what the browser uploaded and attaches the good files. Throws on an
// infrastructure failure (the route answers 503 and the visitor can retry);
// returns per-file outcomes otherwise. Idempotent: a repeat call reports the
// same attached files and does no new work.
export async function completeArtwork({ dealId, submissionId }) {
  const supabase = createAdminClient();
  const folder = `${dealId}/${submissionId}`;

  const { data: pending, error: pendingError } = await supabase
    .from('contact_artwork')
    .select('storage_path, original_name')
    .eq('deal_id', dealId)
    .eq('submission_id', submissionId)
    .eq('status', 'pending');
  if (pendingError) throw new Error(`Reading reservations failed: ${pendingError.message}`);

  const verified = [];
  const rejected = [];
  const toRemove = [];

  if (pending.length > 0) {
    const { data: objects, error: listError } = await supabase.storage
      .from(ARTWORK_BUCKET)
      .list(folder, { limit: ARTWORK_LIMITS.maxFiles * 4 });
    if (listError) throw new Error(`Listing uploads failed: ${listError.message}`);

    const sizes = new Map((objects ?? []).map((object) => [object.name, object.metadata?.size]));
    let total = 0;

    // An object that exists but fails a check is removed from storage; a
    // reservation that was never uploaded has nothing to remove (the RPC drops
    // its row and returns the path anyway).
    const reject = (row, reason) => {
      rejected.push({ name: row.original_name, reason });
      toRemove.push(row.storage_path);
    };

    for (const row of pending) {
      const size = sizes.get(row.storage_path.slice(folder.length + 1));

      if (!Number.isFinite(size)) {
        rejected.push({ name: row.original_name, reason: 'not_uploaded' });
        continue;
      }
      if (size < 1 || size > ARTWORK_LIMITS.maxFileBytes || total + size > ARTWORK_LIMITS.maxTotalBytes) {
        reject(row, 'too_large');
        continue;
      }

      let head = null;
      try {
        head = await readObjectHead(supabase, row.storage_path);
      } catch (error) {
        console.error('Reading an uploaded file header failed:', error.message);
      }
      if (!head || !sniffArtworkType(artworkExtension(row.original_name), head)) {
        reject(row, 'type_mismatch');
        continue;
      }

      total += size;
      verified.push({ storage_path: row.storage_path, size_bytes: size });
    }
  }

  const { data: result, error: attachError } = await supabase.rpc('attach_contact_artwork', {
    p_deal_id: dealId,
    p_submission_id: submissionId,
    p_verified: verified,
  });
  if (attachError) throw new Error(`attach_contact_artwork failed: ${attachError.message}`);

  // Objects that failed a check, plus reservations that were never uploaded
  // (the RPC deleted their rows and returned their paths).
  const removePaths = [...new Set([...toRemove, ...(result?.removed_paths ?? [])])];
  if (removePaths.length > 0) {
    const { error: removeError } = await supabase.storage.from(ARTWORK_BUCKET).remove(removePaths);
    if (removeError) console.error('Removing rejected artwork failed:', removeError.message);
  }

  return { attached: result?.attached_names ?? [], rejected };
}

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const REMOVAL_BATCH = 50;

// Daily housekeeping for visitor artwork. Never throws.
//
//   1. Reservations still pending after 24 h (the visitor closed the tab before
//      the upload finished) are deleted.
//   2. Every deleted contact_artwork row, whatever deleted it (this sweep, an
//      admin deleting the deal, a deleted company cascading to its deals), has
//      queued its storage path in contact_artwork_removals via a database
//      trigger (migration 0053). This drains that queue: remove the objects,
//      and forget an entry only after storage confirms. Storage treats an
//      already-gone key as a no-op, so a retry after a half-finished run is
//      harmless, and a storage outage leaves the queue for the next run.
//
// Returns the number of objects removed in this run.
export async function cleanupStaleContactArtwork(supabase, now = Date.now()) {
  try {
    const cutoff = new Date(now - STALE_AFTER_MS).toISOString();
    const { error: expireError } = await supabase
      .from('contact_artwork')
      .delete()
      .eq('status', 'pending')
      .lt('created_at', cutoff);
    // Not fatal: the queue below may still have work from earlier deletes.
    if (expireError) console.error('Expiring stale contact artwork failed:', expireError.message);

    const { data: queued, error: queueError } = await supabase
      .from('contact_artwork_removals')
      .select('storage_path')
      .limit(REMOVAL_BATCH);
    if (queueError) {
      console.error('Reading the contact artwork removal queue failed:', queueError.message);
      return 0;
    }
    if (!queued?.length) return 0;

    const paths = queued.map((row) => row.storage_path);
    const { error: removeError } = await supabase.storage.from(ARTWORK_BUCKET).remove(paths);
    if (removeError) {
      console.error('Removing contact artwork objects failed; will retry:', removeError.message);
      return 0;
    }

    const { error: forgetError } = await supabase
      .from('contact_artwork_removals')
      .delete()
      .in('storage_path', paths);
    // The objects are gone; the entries are removed again (a no-op) next run.
    if (forgetError) console.error('Clearing the artwork removal queue failed:', forgetError.message);
    return paths.length;
  } catch (error) {
    console.error('Contact artwork cleanup failed:', error.message);
    return 0;
  }
}
