'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { formatBytes } from '@/lib/contactArtwork.mjs';

// Artwork a visitor uploaded with a homepage production request (migration
// 0053), listed on the admin deal page. Rows are read under RLS (admin only,
// attached files only). Each link goes through /api/admin/contact-artwork/<id>,
// which checks the admin session and redirects to a 60 second signed URL, so
// no long-lived link to a visitor's file exists. Renders nothing for a deal
// with no uploaded artwork.
export default function ContactArtworkPanel({ dealId }) {
  const [files, setFiles] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('contact_artwork')
          .select('id, original_name, size_bytes, attached_at')
          .eq('deal_id', dealId)
          .eq('status', 'attached')
          .order('attached_at', { ascending: true });
        if (!cancelled) setFiles(error ? [] : data ?? []);
      } catch {
        if (!cancelled) setFiles([]);
      }
    }

    if (dealId) load();
    return () => { cancelled = true; };
  }, [dealId]);

  if (!files || files.length === 0) return null;

  return (
    <section className="crm-artwork" aria-labelledby="crm-artwork-title">
      <h2 id="crm-artwork-title">Artwork from the production request</h2>
      <ul>
        {files.map((file) => (
          <li key={file.id}>
            <a href={`/api/admin/contact-artwork/${file.id}`}>{file.original_name}</a>
            <span className="crm-artwork-size">{formatBytes(file.size_bytes)}</span>
          </li>
        ))}
      </ul>
      <p className="crm-artwork-note">Download links expire after 60 seconds. Open them from here each time.</p>

      <style jsx>{`
        .crm-artwork {
          max-width: 800px;
          margin: 1.5rem auto 0;
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 12px;
          padding: 1.5rem 2rem;
          backdrop-filter: blur(10px);
        }
        h2 {
          font-size: 1rem;
          color: #64c8ff;
          margin-bottom: 1rem;
        }
        ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        li {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: baseline;
        }
        a {
          color: #e0e0e0;
          text-decoration: underline;
          text-underline-offset: 3px;
          word-break: break-all;
        }
        a:hover {
          color: #64c8ff;
        }
        .crm-artwork-size {
          color: #999;
          font-size: 0.85rem;
          white-space: nowrap;
        }
        .crm-artwork-note {
          margin-top: 1rem;
          color: #999;
          font-size: 0.8rem;
        }
      `}</style>
    </section>
  );
}
