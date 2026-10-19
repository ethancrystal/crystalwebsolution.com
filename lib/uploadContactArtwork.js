// Browser side of the production-request artwork upload (migration 0053).
// Step 2 and 3 of the flow: PUT each file to the signed URL /api/contact handed
// back, then ask /api/contact/artwork/complete to check and attach them.
//
// Never throws: every failure becomes "these files did not arrive", and the
// form tells the visitor to email them. The request itself was already
// delivered by /api/contact before this runs.

import { ARTWORK_BUCKET, cleanArtworkName } from './contactArtwork.mjs';

// Which of the picked files the server reports as attached. `attachedNames` is
// the server's list of display names; consume it as a multiset so two files
// with the same name are not both counted from one attached copy.
export function splitByOutcome(files, attachedNames) {
  const remaining = [...(Array.isArray(attachedNames) ? attachedNames : [])];
  const attached = [];
  const failed = [];

  for (const file of files) {
    const index = remaining.indexOf(cleanArtworkName(file.name));
    if (index === -1) {
      failed.push(file.name);
    } else {
      remaining.splice(index, 1);
      attached.push(file.name);
    }
  }
  return { attached, failed };
}

export async function uploadContactArtwork({
  artwork,
  files,
  onProgress = () => {},
  fetchImpl = (...args) => fetch(...args),
  loadClient = async () => (await import('./supabase/browser')).createClient,
}) {
  const allFailed = { attached: [], failed: files.map((file) => file.name) };

  if (artwork?.status !== 'ready' || !Array.isArray(artwork.uploads) || artwork.uploads.length !== files.length) {
    return allFailed;
  }

  try {
    const createClient = await loadClient();
    const bucket = createClient().storage.from(ARTWORK_BUCKET);

    for (let index = 0; index < files.length; index += 1) {
      onProgress(index + 1, files.length);
      const slot = artwork.uploads[index];
      // A failed PUT leaves that file out; the server's completion check is the
      // source of truth for what actually arrived.
      await bucket
        .uploadToSignedUrl(slot.path, slot.token, files[index], { contentType: slot.contentType })
        .catch(() => null);
    }

    const response = await fetchImpl('/api/contact/artwork/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId: artwork.dealId, submissionId: artwork.submissionId }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) return allFailed;

    return splitByOutcome(files, body.attached);
  } catch {
    return allFailed;
  }
}
