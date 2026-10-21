// Pending states on the auth screens: the portal sign-in form
// (components/auth/PortalLoginForm.jsx) and the portal chooser
// (app/login/page.jsx). signIn is mocked; next/link is a plain anchor that
// records navigations unless the click was prevented, as Next's Link does.

import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const signIn = vi.fn();
vi.mock('@/app/auth/actions', () => ({ signIn: (...args) => signIn(...args) }));
vi.mock('@/components/ui/dark-page-background', () => ({ default: () => null }));

const navigations = [];
vi.mock('next/link', () => ({
  default: ({ href, onClick, children, ...rest }) => (
    <a
      href={href}
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        // Like Next's Link: navigate unless the page's handler prevented it.
        if (!event.isDefaultPrevented()) navigations.push(href);
        event.preventDefault(); // jsdom cannot navigate
      }}
    >
      {children}
    </a>
  ),
}));

import PortalLoginForm from '@/components/auth/PortalLoginForm';
import LoginPage from '@/app/login/page';

const PORTAL = { login: '/login/client', label: 'Client', role: 'client' };

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
}

beforeEach(() => {
  navigations.length = 0;
  signIn.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('PortalLoginForm pending state', () => {
  it('starts idle and accessible', () => {
    render(<PortalLoginForm portal={PORTAL} />);
    const button = screen.getByRole('button', { name: 'Sign In' });
    expect(button.disabled).toBe(false);
    expect(screen.getByRole('status').textContent).toBe('');
    expect(document.querySelector('form').getAttribute('aria-busy')).toBe('false');
    expect(document.querySelector('[data-spinner]')).toBeNull();
    expect(document.querySelector('.crm-login-secondary').hasAttribute('inert')).toBe(false);
  });

  it('disables the form and announces while signing in', async () => {
    signIn.mockReturnValue(new Promise(() => {}));
    render(<PortalLoginForm portal={PORTAL} />);
    fillAndSubmit();

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Signing in. Please wait.'));
    const button = screen.getByRole('button', { name: /Signing in…/ });
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(document.querySelector('form').getAttribute('aria-busy')).toBe('true');
    expect(document.querySelector('.crm-login-card').getAttribute('aria-busy')).toBe('true');
    expect(document.querySelector('[data-spinner]').getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByLabelText('Email').disabled).toBe(true);
    expect(screen.getByLabelText('Password').disabled).toBe(true);
    expect(document.querySelector('.crm-login-secondary').hasAttribute('inert')).toBe(true);
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(signIn.mock.calls[0][0].get('email')).toBe('jane@example.test');
  });

  it('restores the form, clears the status and focuses the error when sign-in fails', async () => {
    signIn.mockResolvedValue({ error: 'Invalid login credentials' });
    render(<PortalLoginForm portal={PORTAL} />);
    fillAndSubmit();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Invalid login credentials');
    await waitFor(() => expect(document.activeElement).toBe(alert));
    expect(screen.getByRole('button', { name: 'Sign In' }).disabled).toBe(false);
    expect(screen.getByRole('status').textContent).toBe('');
    expect(screen.getByLabelText('Email').disabled).toBe(false);
    expect(screen.getByLabelText('Email').value).toBe('jane@example.test');
    expect(document.querySelector('.crm-login-secondary').hasAttribute('inert')).toBe(false);
  });

  it('shows readable copy, not the raw code, when sign-in reports a configuration failure', async () => {
    signIn.mockResolvedValue({ error: 'configuration' });
    render(<PortalLoginForm portal={PORTAL} />);
    fillAndSubmit();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/Sign-in is temporarily unavailable/);
    expect(screen.getByLabelText('Email').value).toBe('jane@example.test');
  });

  it('keeps the pending UI through the redirect that ends a successful sign-in', async () => {
    const redirect = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;replace;/dashboard;307;' });
    signIn.mockRejectedValue(redirect);
    const onError = vi.fn();
    window.addEventListener('error', onError);
    render(<PortalLoginForm portal={PORTAL} />);
    fillAndSubmit();

    await waitFor(() => expect(signIn).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('status').textContent).toBe('Signing in. Please wait.');
    expect(screen.getByRole('button', { name: /Signing in…/ }).disabled).toBe(true);
    expect(screen.queryByRole('alert')).toBeNull();
    window.removeEventListener('error', onError);
  });

  it('is usable again when Back restores it from the bfcache after sign-in', async () => {
    const redirect = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;replace;/dashboard;307;' });
    signIn.mockRejectedValue(redirect);
    render(<PortalLoginForm portal={PORTAL} />);
    fillAndSubmit();
    await waitFor(() => expect(signIn).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('button', { name: /Signing in…/ }).disabled).toBe(true);

    // A normal load (not from the bfcache) leaves it alone.
    act(() => { window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: false })); });
    expect(screen.getByRole('button', { name: /Signing in…/ }).disabled).toBe(true);

    act(() => { window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true })); });
    expect(screen.getByRole('button', { name: 'Sign In' }).disabled).toBe(false);
    expect(screen.getByLabelText('Email').disabled).toBe(false);
    expect(screen.getByLabelText('Email').value).toBe('jane@example.test');
    expect(screen.queryByRole('status')?.textContent ?? '').toBe('');
  });
});

describe('LoginPage portal selection', () => {
  it('opens one portal, announces it, and ignores further clicks', async () => {
    render(<LoginPage />);
    const client = screen.getByRole('link', { name: 'Client Portal' });
    const admin = screen.getByRole('link', { name: 'Admin Portal' });

    fireEvent.click(client);
    fireEvent.click(client);
    fireEvent.click(admin);

    expect(navigations).toEqual(['/login/client']);
    expect(screen.getByRole('status').textContent).toBe('Opening Client Portal. Please wait.');
    const opening = screen.getByRole('link', { name: /Opening Client Portal…/ });
    expect(opening.getAttribute('aria-current')).toBe('true');
    expect(opening.className).toMatch(/is-opening/);
    expect(opening.querySelector('[data-spinner]')).not.toBeNull();
    expect(admin.className).toMatch(/is-locked/);
    expect(admin.getAttribute('aria-disabled')).toBe('true');
    expect(admin.getAttribute('tabindex')).toBe('-1');
    expect(document.querySelector('.crm-auth-card').getAttribute('aria-busy')).toBe('true');
  });

  it('lets a new-tab click through without locking the page', () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('link', { name: 'Employee Portal' }), { metaKey: true });
    expect(screen.getByRole('status').textContent).toBe('');
    fireEvent.click(screen.getByRole('link', { name: 'Admin Portal' }));
    expect(navigations).toEqual(['/login/employee', '/login/admin']);
  });

  it('releases the choice if navigation never completes', () => {
    vi.useFakeTimers();
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('link', { name: 'Client Portal' }));
    expect(screen.getByRole('status').textContent).toMatch(/Opening Client Portal/);
    act(() => { vi.advanceTimersByTime(15000); });
    expect(screen.getByRole('status').textContent).toBe('');
    expect(screen.getByRole('link', { name: 'Admin Portal' }).getAttribute('aria-disabled')).toBeNull();
  });
});
