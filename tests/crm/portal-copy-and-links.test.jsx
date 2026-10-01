// F9: portal copy names the business as CD Sportswear INC, never the repo's
// old name. F11: ProjectOverview's back link goes to the viewer's own portal
// home; it used to send staff to the client-only /dashboard.

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/app/actions/onboarding-actions', () => ({ onboardClientCompany: vi.fn() }));

import ClientOnboardingForm from '@/components/crm/ClientOnboardingForm';
import ProjectOverview from '@/components/crm/ProjectOverview';

afterEach(() => cleanup());

describe('client onboarding copy', () => {
  it('names CD Sportswear INC, not Crystal Web Solution', () => {
    const { container } = render(<ClientOnboardingForm />);

    expect(screen.getByText('Keep conversations with the CD Sportswear INC team in one place.')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/crystal\s*web\s*solution/i);
  });
});

describe('ProjectOverview back link', () => {
  const project = {
    id: 'p1',
    title: 'Brand site',
    status: 'planned',
    category: 'web_design',
    target_date: null,
    created_at: '2026-09-01T10:00:00.000Z',
  };
  const backLink = () => screen.getByRole('link', { name: 'Back to Dashboard' });

  it.each([
    ['admin', '/admin'],
    ['project_manager', '/team'],
    ['client', '/dashboard'],
  ])('sends a %s to %s', (role, href) => {
    render(<ProjectOverview project={project} role={role} />);
    expect(backLink()).toHaveAttribute('href', href);
  });

  it('keeps the client home when no role is given, and for an unknown role', () => {
    const { unmount } = render(<ProjectOverview project={project} />);
    expect(backLink()).toHaveAttribute('href', '/dashboard');
    unmount();

    render(<ProjectOverview project={project} role="visitor" />);
    expect(backLink()).toHaveAttribute('href', '/dashboard');
  });

  it('shows no back link when the page turns it off (the client page)', () => {
    render(<ProjectOverview project={project} role="client" showBackLink={false} />);
    expect(screen.queryByRole('link', { name: 'Back to Dashboard' })).toBeNull();
  });
});
