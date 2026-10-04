// F8: the resend-confirmation button on /auth/confirm returned to its idle
// "Resend email" state on any failure, with no message, so the person could
// not tell whether anything had been sent. A failure now says so, and the
// button stays available to try again.

import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const resendConfirmationEmail = vi.hoisted(() => vi.fn());
const search = vi.hoisted(() => ({ value: 'email=sam%40example.com' }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search.value),
}));
vi.mock('@/app/auth/actions', () => ({
  resendConfirmationEmail: (...args) => resendConfirmationEmail(...args),
}));
vi.mock('@/components/ui/dark-page-background', () => ({ default: () => null }));

import ConfirmPage from '@/app/auth/confirm/page.jsx';

const FAILURE = "We couldn't resend the email. Check your connection and try again.";

beforeEach(() => {
  search.value = 'email=sam%40example.com';
  resendConfirmationEmail.mockResolvedValue({ success: true });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('confirm page resend', () => {
  it('says the email was sent again on success', async () => {
    render(<ConfirmPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Resend email' }));

    expect(await screen.findByText(/Confirmation email sent again/)).toBeInTheDocument();
    expect(resendConfirmationEmail.mock.calls[0][0].get('email')).toBe('sam@example.com');
    expect(screen.queryByText(FAILURE)).toBeNull();
  });

  it('shows a message, and keeps the button, when the action returns an error', async () => {
    resendConfirmationEmail.mockResolvedValue({ error: 'Email is required' });
    render(<ConfirmPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Resend email' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(FAILURE);
    expect(screen.getByRole('button', { name: 'Resend email' })).not.toBeDisabled();
    expect(screen.queryByText(/Confirmation email sent again/)).toBeNull();
  });

  it('shows a message when the action throws (network failure)', async () => {
    resendConfirmationEmail.mockRejectedValue(new Error('fetch failed'));
    render(<ConfirmPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Resend email' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(FAILURE);
  });

  it('clears the failure message on the next attempt, and a success replaces it', async () => {
    resendConfirmationEmail
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce({ success: true });
    render(<ConfirmPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Resend email' }));
    await screen.findByRole('alert');

    fireEvent.click(screen.getByRole('button', { name: 'Resend email' }));
    await waitFor(() => expect(screen.getByText(/Confirmation email sent again/)).toBeInTheDocument());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('offers no resend (and so no failure message) when the page has no email', async () => {
    search.value = '';
    render(<ConfirmPage />);

    await screen.findByText('Check Your Email');
    expect(screen.queryByRole('button', { name: 'Resend email' })).toBeNull();
  });
});
