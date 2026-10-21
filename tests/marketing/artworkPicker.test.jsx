import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';

// Artwork picker and the two-phase upload (migration 0053), driven through the
// real form. Only the edges are stubbed: the hCaptcha widget (a third-party
// script), the browser Supabase client (storage) and fetch.
vi.mock('@/components/marketing/HCaptcha', async () => {
  const { useEffect } = await import('react');
  return {
    default: function HCaptchaStub({ onToken }) {
      useEffect(() => { onToken('captcha-token'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
      return null;
    },
  };
});

const storage = { uploadToSignedUrl: vi.fn() };
vi.mock('@/lib/supabase/browser', () => ({
  createClient: () => ({
    storage: { from: (bucket) => ({ uploadToSignedUrl: (...args) => storage.uploadToSignedUrl(bucket, ...args) }) },
  }),
}));

import ProductionRequestForm from '@/components/marketing/ProductionRequestForm';
import ContactIntake from '@/components/sections/ContactIntake';
import ContactForm from '@/components/marketing/ContactForm';
import { SITE } from '@/lib/site';

const field = (pattern) => screen.getByLabelText(pattern);

function fillRequiredFields() {
  fireEvent.change(field(/^NAME/), { target: { value: 'Jordan Reyes' } });
  fireEvent.change(field(/^EMAIL/), { target: { value: 'jordan@example.com' } });
  fireEvent.change(field(/^SIZE/), { target: { value: '3.5 in wide' } });
  fireEvent.change(field(/^QUANTITY/), { target: { value: '250' } });
}

function mockFetch(handler) {
  const fetchMock = vi.fn(handler);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function makeFile(name, size = 10) {
  const file = new File(['x'], name);
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

const picker = () => document.querySelector('input[type="file"]');
const pick = (...files) => fireEvent.change(picker(), { target: { files } });
const fileList = () => within(screen.getByRole('list', { name: /attached files/i }));
const sendButton = () => screen.getByRole('button', { name: /send production request/i });

const DEAL = '53000000-0000-0000-0000-000000000001';
const SUBMISSION = '53000000-0000-0000-0000-0000000000aa';

const readySlots = (...names) => ({
  status: 'ready',
  dealId: DEAL,
  submissionId: SUBMISSION,
  uploads: names.map((name, index) => ({
    name,
    path: `${DEAL}/${SUBMISSION}/${index + 1}-${name}`,
    token: `token-${index + 1}`,
    contentType: 'application/octet-stream',
  })),
});

function routeFetch({ artwork, attached, completeOk = true }) {
  return mockFetch(async (url) => {
    if (url === '/api/contact') {
      return { ok: true, json: async () => ({ ok: true, message: 'sent', ...(artwork ? { artwork } : {}) }) };
    }
    return completeOk
      ? { ok: true, json: async () => ({ ok: true, attached, rejected: [] }) }
      : { ok: false, json: async () => ({ ok: false }) };
  });
}

beforeEach(() => {
  storage.uploadToSignedUrl.mockReset();
  storage.uploadToSignedUrl.mockResolvedValue({ data: {}, error: null });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.location.hash = '';
});

describe('artwork picker', () => {
  it('lists the chosen files with their sizes and lets each one be removed', () => {
    render(<ProductionRequestForm />);

    pick(makeFile('logo.ai', 2048), makeFile('stitch.dst', 900));

    expect(fileList().getByText('logo.ai')).toBeInTheDocument();
    expect(fileList().getByText('2 KB')).toBeInTheDocument();
    expect(fileList().getByText('900 B')).toBeInTheDocument();
    expect(screen.getByText(/add more files/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove logo.ai' }));
    expect(fileList().queryByText('logo.ai')).toBeNull();
    expect(fileList().getByText('stitch.dst')).toBeInTheDocument();
  });

  it('keeps the files that fit and explains the first one that does not', () => {
    render(<ProductionRequestForm />);

    pick(makeFile('ok.png', 500), makeFile('virus.exe', 10), makeFile('big.pdf', 11 * 1024 * 1024));

    expect(fileList().getByText('ok.png')).toBeInTheDocument();
    expect(fileList().queryByText('virus.exe')).toBeNull();
    expect(fileList().queryByText('big.pdf')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent(/virus\.exe.*not an accepted file type/i);
    expect(picker()).toHaveAttribute('aria-invalid', 'true');
  });

  it('allows at most three files', () => {
    render(<ProductionRequestForm />);

    pick(makeFile('1.png'), makeFile('2.png'), makeFile('3.png'), makeFile('4.png'));

    expect(fileList().getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('alert')).toHaveTextContent(/up to 3 files/i);
  });

  it('does not add the same file twice', () => {
    render(<ProductionRequestForm />);
    const file = makeFile('logo.ai', 100);

    pick(file);
    pick(file);

    expect(fileList().getAllByRole('listitem')).toHaveLength(1);
  });

  it('accepts files dropped on the artwork box', () => {
    const { container } = render(<ProductionRequestForm />);

    fireEvent.drop(container.querySelector('.pr-artwork'), { dataTransfer: { files: [makeFile('dropped.pdf', 300)] } });

    expect(fileList().getByText('dropped.pdf')).toBeInTheDocument();
  });

  it('sends the declared files, uploads them to the signed slots, completes, and lists what arrived', async () => {
    const fetchMock = routeFetch({
      artwork: readySlots('logo.ai', 'stitch.dst'),
      attached: ['logo.ai', 'stitch.dst'],
    });
    render(<ProductionRequestForm />);

    fillRequiredFields();
    const logo = makeFile('logo.ai', 2048);
    const stitch = makeFile('stitch.dst', 900);
    pick(logo, stitch);
    fireEvent.click(sendButton());

    await screen.findByText('REQUEST RECEIVED / CUSTOM PATCHES');

    // Phase 1: names and sizes only, never bytes.
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body).files).toEqual([
      { name: 'logo.ai', size: 2048 },
      { name: 'stitch.dst', size: 900 },
    ]);

    // Phase 2: each file straight to its own signed slot.
    expect(storage.uploadToSignedUrl.mock.calls).toEqual([
      ['contact-artwork', `${DEAL}/${SUBMISSION}/1-logo.ai`, 'token-1', logo, { contentType: 'application/octet-stream' }],
      ['contact-artwork', `${DEAL}/${SUBMISSION}/2-stitch.dst`, 'token-2', stitch, { contentType: 'application/octet-stream' }],
    ]);

    // Phase 3: the server is asked to check and attach.
    expect(fetchMock.mock.calls[1][0]).toBe('/api/contact/artwork/complete');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ dealId: DEAL, submissionId: SUBMISSION });

    expect(screen.getByText(/artwork received: logo\.ai, stitch\.dst\./i)).toBeInTheDocument();
    expect(screen.queryByText(/did not upload/i)).toBeNull();
    expect(screen.queryByText(/no artwork yet/i)).toBeNull();
  });

  it('names the files that did not arrive and says how to send them', async () => {
    routeFetch({ artwork: readySlots('logo.ai', 'stitch.dst'), attached: ['logo.ai'] });
    render(<ProductionRequestForm />);

    fillRequiredFields();
    pick(makeFile('logo.ai', 2048), makeFile('stitch.dst', 900));
    fireEvent.click(sendButton());

    await screen.findByText('REQUEST RECEIVED / CUSTOM PATCHES');
    expect(screen.getByText(/artwork received: logo\.ai\./i)).toBeInTheDocument();
    expect(screen.getByText(/this file did not upload: stitch\.dst/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: SITE.email }).length).toBeGreaterThan(0);
  });

  it('still confirms the request, and names every file, when uploads are unavailable', async () => {
    routeFetch({ artwork: { status: 'unavailable' } });
    render(<ProductionRequestForm />);

    fillRequiredFields();
    pick(makeFile('logo.ai', 2048), makeFile('stitch.dst', 900));
    fireEvent.click(sendButton());

    await screen.findByText('REQUEST RECEIVED / CUSTOM PATCHES');
    expect(screen.getByText(/these files did not upload: logo\.ai, stitch\.dst/i)).toBeInTheDocument();
    expect(storage.uploadToSignedUrl).not.toHaveBeenCalled();
  });

  it('treats a failed completion check as nothing confirmed', async () => {
    routeFetch({ artwork: readySlots('logo.ai'), completeOk: false });
    render(<ProductionRequestForm />);

    fillRequiredFields();
    pick(makeFile('logo.ai', 2048));
    fireEvent.click(sendButton());

    await screen.findByText('REQUEST RECEIVED / CUSTOM PATCHES');
    expect(screen.getByText(/this file did not upload: logo\.ai/i)).toBeInTheDocument();
    expect(screen.queryByText(/artwork received/i)).toBeNull();
  });

  it('does not upload anything when the request itself is rejected, and keeps the files', async () => {
    mockFetch(async () => ({ ok: false, json: async () => ({ ok: false, message: 'Please complete the security check.' }) }));
    render(<ProductionRequestForm />);

    fillRequiredFields();
    pick(makeFile('logo.ai', 2048));
    fireEvent.click(sendButton());

    expect(await screen.findByText(/please complete the security check\./i)).toBeInTheDocument();
    expect(storage.uploadToSignedUrl).not.toHaveBeenCalled();
    expect(fileList().getByText('logo.ai')).toBeInTheDocument();
  });

  it('shows no "no artwork yet" note when files were sent, and sends an empty link', async () => {
    const fetchMock = routeFetch({ artwork: readySlots('logo.ai'), attached: ['logo.ai'] });
    render(<ProductionRequestForm />);

    fillRequiredFields();
    pick(makeFile('logo.ai', 2048));
    fireEvent.click(sendButton());

    await screen.findByText('REQUEST RECEIVED / CUSTOM PATCHES');
    expect(screen.queryByText(/no artwork yet/i)).toBeNull();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).artworkLink).toBe('');
  });
});

describe('the intake keeps what was typed when the tab changes', { timeout: 30_000 }, () => {
  it('restores the production request, files included, and the web brief', () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ ok: true }) }));
    render(<ContactIntake />);

    fireEvent.change(field(/^NAME/), { target: { value: 'Jordan Reyes' } });
    fireEvent.click(screen.getByLabelText('Vector artwork'));
    pick(makeFile('logo.ai', 2048));

    fireEvent.click(screen.getByRole('tab', { name: 'Web project brief' }));
    expect(screen.queryByLabelText('Custom patches')).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: /project brief/i }), { target: { value: 'We need a launch site.' } });
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Avery Stone' } });

    fireEvent.click(screen.getByRole('tab', { name: 'Production request' }));
    expect(field(/^NAME/)).toHaveValue('Jordan Reyes');
    expect(screen.getByLabelText('Vector artwork')).toBeChecked();
    expect(fileList().getByText('logo.ai')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Web project brief' }));
    expect(screen.getByLabelText(/^Name/)).toHaveValue('Avery Stone');
    expect(screen.getByRole('textbox', { name: /project brief/i })).toHaveValue('We need a launch site.');
  });
});

describe('ContactForm error ids', () => {
  it('points aria-describedby at the error ids it actually renders', () => {
    render(<ContactForm variant="home" />);

    fireEvent.click(screen.getByRole('button', { name: /send project brief/i }));

    const name = screen.getByLabelText(/^Name/);
    expect(name).toHaveAttribute('aria-describedby', 'home-name-error');
    expect(document.getElementById('home-name-error')).toHaveTextContent(/name is required/i);
    expect(name).toHaveAccessibleDescription(/name is required/i);
  });
});
