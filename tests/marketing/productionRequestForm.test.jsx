import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';

// The hCaptcha widget loads a third-party script; the form only needs the
// token it reports, so a stub that solves instantly stands in for it.
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
  createClient: () => ({ storage: { from: (bucket) => ({ uploadToSignedUrl: (...args) => storage.uploadToSignedUrl(bucket, ...args) }) } }),
}));

import ProductionRequestForm from '@/components/marketing/ProductionRequestForm';
import ContactIntake from '@/components/sections/ContactIntake';
import { PRODUCTION_CATEGORIES } from '@/lib/contactForm.mjs';
import { SITE } from '@/lib/site';
import ContactForm from '@/components/marketing/ContactForm';

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

const okResponse = () => ({
  ok: true,
  json: async () => ({ ok: true, message: 'Your production request was sent.' }),
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.location.hash = '';
});

describe('ProductionRequestForm', () => {
  beforeEach(() => {
    mockFetch(async () => okResponse());
  });

  it('offers the six categories as one radio group, starting on Custom patches', () => {
    render(<ProductionRequestForm />);

    const group = screen.getByRole('group', { name: /what are we making/i });
    const radios = Array.from(group.querySelectorAll('input[type="radio"]'));
    expect(radios.map((radio) => radio.value)).toEqual([...PRODUCTION_CATEGORIES]);
    expect(screen.getByLabelText('Custom patches')).toBeChecked();

    fireEvent.click(screen.getByLabelText('Embroidery digitizing'));
    expect(screen.getByLabelText('Embroidery digitizing')).toBeChecked();
    expect(screen.getByLabelText('Custom patches')).not.toBeChecked();
  });

  it('gives every visible control a label, including a real multi-file picker for the six formats', () => {
    const { container } = render(<ProductionRequestForm />);

    for (const pattern of [/^NAME/, /^EMAIL/, /^SIZE/, /^QUANTITY/, /^NOTES/, /paste a link/i, /attach artwork/i]) {
      expect(field(pattern)).toBeInTheDocument();
    }
    const picker = container.querySelector('input[type="file"]');
    expect(picker).toHaveAttribute('multiple');
    expect(picker).toHaveAttribute('accept', '.ai,.eps,.pdf,.png,.jpg,.jpeg,.dst');
    expect(picker).toHaveAccessibleDescription(/up to 3 files, 10 MB each \(25 MB together\)/i);
    expect(screen.getByText('AI · EPS · PDF · PNG · JPG · DST')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: SITE.email })).toHaveAttribute('href', `mailto:${SITE.email}`);
  });

  it('keeps the honeypot hidden from assistive tech and out of the tab order', () => {
    const { container } = render(<ProductionRequestForm />);
    const honeypot = container.querySelector('input[name="website"]');

    expect(honeypot.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(honeypot).toHaveAttribute('tabindex', '-1');
  });

  it('blocks an empty submit, marks each missing field and moves focus to the first', async () => {
    render(<ProductionRequestForm />);

    fireEvent.click(screen.getByRole('button', { name: /send production request/i }));

    for (const pattern of [/^NAME/, /^EMAIL/, /^SIZE/, /^QUANTITY/]) {
      expect(field(pattern)).toHaveAttribute('aria-invalid', 'true');
    }
    expect(field(/^NAME/)).toHaveAccessibleDescription(/name is required/i);
    expect(field(/paste a link/i)).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByRole('alert')).toHaveTextContent(/some details need attention/i);
    expect(fetch).not.toHaveBeenCalled();
    await waitFor(() => expect(field(/^NAME/)).toHaveFocus());
  });

  it('flags a malformed artwork link on blur', () => {
    render(<ProductionRequestForm />);

    const link = field(/paste a link/i);
    fireEvent.change(link, { target: { value: 'javascript:alert(1)' } });
    fireEvent.blur(link);

    expect(link).toHaveAttribute('aria-invalid', 'true');
    expect(link).toHaveAccessibleDescription(/not valid/i);
  });

  it('posts a production payload to /api/contact and shows REQUEST RECEIVED / <category>', async () => {
    render(<ProductionRequestForm />);

    fireEvent.click(screen.getByLabelText('Vector artwork'));
    fillRequiredFields();
    fireEvent.change(field(/^NOTES/), { target: { value: 'Separate into three colours.' } });
    fireEvent.click(screen.getByRole('button', { name: /send production request/i }));

    await screen.findByText('REQUEST RECEIVED / VECTOR ARTWORK');

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/api/contact');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      kind: 'production',
      name: 'Jordan Reyes',
      email: 'jordan@example.com',
      category: 'Vector artwork',
      size: '3.5 in wide',
      quantity: '250',
      artworkLink: '',
      files: [],
      notes: 'Separate into three colours.',
      website: '',
      hcaptchaToken: 'captcha-token',
    });

    expect(screen.getByText(/a specialist will review your artwork and reply with a mockup/i)).toBeInTheDocument();
    // No link was given, so the buyer is told how the file reaches us.
    expect(screen.getByText(/no artwork yet/i)).toBeInTheDocument();
    await waitFor(() => expect(document.getElementById('production-success')).toHaveFocus());
  });

  it('omits the "how to send the file" note when a link was given, and can start another request', async () => {
    render(<ProductionRequestForm />);

    fillRequiredFields();
    fireEvent.change(field(/paste a link/i), { target: { value: 'drive.google.com/file/d/abc/view' } });
    fireEvent.click(screen.getByRole('button', { name: /send production request/i }));

    await screen.findByText('REQUEST RECEIVED / CUSTOM PATCHES');
    expect(JSON.parse(fetch.mock.calls[0][1].body).artworkLink).toBe('https://drive.google.com/file/d/abc/view');
    expect(screen.queryByText(/no artwork yet/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /send another request/i }));
    expect(screen.getByRole('button', { name: /send production request/i })).toBeInTheDocument();
    expect(field(/^NAME/)).toHaveValue('');
  });

  it('shows the server message and field errors when the API rejects the request', async () => {
    mockFetch(async () => ({
      ok: false,
      json: async () => ({
        ok: false,
        message: 'Some details could not be validated. Review the marked fields and submit again.',
        errors: { size: 'Size is too long.' },
      }),
    }));
    render(<ProductionRequestForm />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /send production request/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be validated/i);
    expect(field(/^SIZE/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText(/REQUEST RECEIVED/)).toBeNull();
  });

  it('keeps the visitor on the form with a retry message when the network fails', async () => {
    mockFetch(async () => { throw new TypeError('Failed to fetch'); });
    render(<ProductionRequestForm />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /send production request/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach us/i);
    expect(field(/^NAME/)).toHaveValue('Jordan Reyes');
  });
});

describe('ContactIntake', { timeout: 30_000 }, () => {
  beforeEach(() => {
    mockFetch(async () => okResponse());
  });

  it('opens on the production request, with the design heading and the site contact lines', () => {
    render(<ContactIntake />);

    expect(screen.getByRole('tab', { name: 'Production request' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Web project brief' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/have artwork ready\?\s*let's make it production-ready\./i);
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    const lines = within(screen.getByRole('list'));
    expect(lines.getByRole('link', { name: SITE.email })).toHaveAttribute('href', `mailto:${SITE.email}`);
    expect(lines.getByRole('link', { name: SITE.phone })).toHaveAttribute('href', `tel:${SITE.phone.replace(/[^+\d]/g, '')}`);
    expect(lines.getByText(SITE.city)).toBeInTheDocument();
    // The web brief's budget tiers are not part of this form.
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('keeps the web project brief one tab away, and mounts only one form at a time', () => {
    const { container } = render(<ContactIntake />);

    fireEvent.click(screen.getByRole('tab', { name: 'Web project brief' }));

    expect(screen.getByRole('tab', { name: 'Web project brief' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/budget/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /project brief/i })).toBeInTheDocument();
    expect(screen.getByText(/something worth the scroll/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Custom patches')).toBeNull();

    // One form, one hCaptcha, no duplicate ids.
    expect(container.querySelectorAll('form')).toHaveLength(1);
    const ids = Array.from(container.querySelectorAll('[id]')).map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);

    fireEvent.click(screen.getByRole('tab', { name: 'Production request' }));
    expect(screen.getByLabelText('Custom patches')).toBeChecked();
    expect(screen.queryByLabelText(/budget/i)).toBeNull();
  });

  it('opens the web brief from /#contact-brief so a link from the Digital Studio can land on it', () => {
    window.location.hash = '#contact-brief';
    render(<ContactIntake />);

    expect(screen.getByRole('tab', { name: 'Web project brief' })).toHaveAttribute('aria-selected', 'true');
    // The hash target is an anchor above the tabs, not the tab itself, so the
    // fixed nav does not cover the switcher after the jump.
    const anchor = document.getElementById('contact-brief');
    expect(anchor).not.toBeNull();
    expect(anchor.getAttribute('role')).toBeNull();
    expect(document.getElementById('contact-production')).not.toBeNull();
  });

  it('opens the matching panel when an in-page link is clicked, even though SmoothScroll cancels hash navigation', () => {
    render(
      <>
        <a href="/#contact-brief">Send a web brief</a>
        <a href="/#contact">Start a project</a>
        <a href="https://example.com/#contact-brief">Elsewhere</a>
        <ContactIntake />
      </>,
    );
    const link = screen.getByRole('link', { name: 'Send a web brief' });
    link.addEventListener('click', (event) => event.preventDefault());

    fireEvent.click(screen.getByRole('link', { name: 'Elsewhere' }));
    expect(screen.getByRole('tab', { name: 'Production request' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(link);
    expect(screen.getByRole('tab', { name: 'Web project brief' })).toHaveAttribute('aria-selected', 'true');

    // A plain /#contact link leaves whichever panel is open alone.
    fireEvent.click(screen.getByRole('link', { name: 'Start a project' }));
    expect(screen.getByRole('tab', { name: 'Web project brief' })).toHaveAttribute('aria-selected', 'true');
  });

  it('follows a later hash change', async () => {
    render(<ContactIntake />);

    window.location.hash = '#contact-brief';
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Web project brief' })).toHaveAttribute('aria-selected', 'true'));
  });

  it('supports arrow-key navigation between the tabs with a roving tabindex', () => {
    render(<ContactIntake />);

    const production = screen.getByRole('tab', { name: 'Production request' });
    const brief = screen.getByRole('tab', { name: 'Web project brief' });
    expect(production).toHaveAttribute('tabindex', '0');
    expect(brief).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(production, { key: 'ArrowRight' });
    expect(brief).toHaveAttribute('aria-selected', 'true');
    expect(brief).toHaveFocus();
    expect(brief).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(brief, { key: 'Home' });
    expect(production).toHaveAttribute('aria-selected', 'true');
    expect(production).toHaveFocus();
  });
});
