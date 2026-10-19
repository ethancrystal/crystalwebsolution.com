import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

const query = { rows: [], error: null, filters: [], throwOnCreate: false };
vi.mock('@/lib/supabase/browser', () => ({
  createClient: () => {
    if (query.throwOnCreate) throw new Error('not configured');
    const chain = {
      select: () => chain,
      eq: (column, value) => { query.filters.push([column, value]); return chain; },
      order: async () => ({ data: query.rows, error: query.error }),
    };
    return { from: () => chain };
  },
}));

import ContactArtworkPanel from '@/components/crm/ContactArtworkPanel';

const DEAL = '53000000-0000-0000-0000-000000000001';

afterEach(() => {
  cleanup();
  Object.assign(query, { rows: [], error: null, filters: [], throwOnCreate: false });
});

describe('ContactArtworkPanel', { timeout: 30_000 }, () => {
  it('lists attached artwork for the deal, each linking through the admin-only download route', async () => {
    query.rows = [
      { id: '99000000-0000-0000-0000-000000000001', original_name: 'Logo Final.ai', size_bytes: 2048, attached_at: '2026-10-18T00:00:00Z' },
      { id: '99000000-0000-0000-0000-000000000002', original_name: 'stitch.dst', size_bytes: 900, attached_at: '2026-10-18T00:00:01Z' },
    ];
    render(<ContactArtworkPanel dealId={DEAL} />);

    const first = await screen.findByRole('link', { name: 'Logo Final.ai' });
    expect(first).toHaveAttribute('href', '/api/admin/contact-artwork/99000000-0000-0000-0000-000000000001');
    expect(screen.getByRole('link', { name: 'stitch.dst' })).toBeInTheDocument();
    expect(screen.getByText('2 KB')).toBeInTheDocument();
    expect(screen.getByText(/expire after 60 seconds/i)).toBeInTheDocument();
    expect(query.filters).toEqual([['deal_id', DEAL], ['status', 'attached']]);
  });

  it('renders nothing for a deal without uploaded artwork', async () => {
    const { container } = render(<ContactArtworkPanel dealId={DEAL} />);

    await waitFor(() => expect(query.filters.length).toBe(2));
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing, and never throws, when the lookup fails or the client is not configured', async () => {
    query.error = { message: 'denied' };
    const failed = render(<ContactArtworkPanel dealId={DEAL} />);
    await waitFor(() => expect(query.filters.length).toBe(2));
    expect(failed.container).toBeEmptyDOMElement();
    cleanup();

    query.throwOnCreate = true;
    const unconfigured = render(<ContactArtworkPanel dealId={DEAL} />);
    await waitFor(() => expect(unconfigured.container).toBeEmptyDOMElement());
  });
});
