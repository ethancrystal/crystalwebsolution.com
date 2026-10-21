import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/auth/require-role';
import { ARTWORK_BUCKET, isUuid } from '@/lib/contactArtwork.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Admin-only download of one attached production-request artwork file. The
// bucket is private; this mints a 60 second signed URL and redirects to it, so
// no long-lived link to a visitor's file ever exists. Anyone who is not the
// signed-in admin gets the same 404 as an unknown id.
export async function GET(_request, { params }) {
  const { id } = await params;
  const notFound = () => new Response('Not found', { status: 404 });

  if (!isUuid(id)) return notFound();

  const authenticated = await getAuthenticatedProfile();
  if (authenticated?.profile?.role !== 'admin') return notFound();

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return new Response('Storage is not configured.', { status: 503 });
  }

  const { data: row, error } = await supabase
    .from('contact_artwork')
    .select('storage_path, original_name')
    .eq('id', id)
    .eq('status', 'attached')
    .maybeSingle();
  if (error || !row) return notFound();

  const { data: signed, error: signError } = await supabase.storage
    .from(ARTWORK_BUCKET)
    .createSignedUrl(row.storage_path, 60, { download: row.original_name });
  if (signError || !signed?.signedUrl) return new Response('Could not prepare the download.', { status: 502 });

  return NextResponse.redirect(signed.signedUrl, { status: 302, headers: { 'Cache-Control': 'no-store' } });
}
