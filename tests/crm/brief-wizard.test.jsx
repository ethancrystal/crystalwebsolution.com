// Behaviour of components/crm/BriefWizard.jsx with the brief server actions
// mocked: autosave debouncing, required-field gating on the review step,
// and the new-project vs existing-project submit payloads.

import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const saveBriefDraft = vi.fn();
const submitBrief = vi.fn();
vi.mock('@/app/actions/brief-actions', () => ({
  saveBriefDraft: (...args) => saveBriefDraft(...args),
  submitBrief: (...args) => submitBrief(...args),
}));

import BriefWizard from '@/components/crm/BriefWizard';

const BRIEF_ID = '11111111-1111-4111-8111-111111111111';
const PROJECT_ID = '22222222-2222-4222-8222-222222222222';

function brief(overrides = {}) {
  return {
    id: BRIEF_ID,
    brief_type: 'seo',
    status: 'draft',
    project_id: null,
    answers: { business_name: 'Acme', site_url: 'https://acme.test' },
    updated_at: '2026-09-25T10:00:00.000Z',
    ...overrides,
  };
}

function formEntries(call) {
  return Object.fromEntries(call[0].entries());
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  saveBriefDraft.mockResolvedValue({ ok: true, data: { savedAt: '2026-09-25T10:01:00.000Z' } });
  submitBrief.mockResolvedValue({ ok: true, data: { projectId: PROJECT_ID } });
  window.requestAnimationFrame = (callback) => setTimeout(callback, 0);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('BriefWizard', () => {
  it('renders the first step with pre-filled answers', () => {
    render(<BriefWizard brief={brief()} />);
    expect(screen.getByRole('heading', { name: /Your website/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/Website address/)).toHaveValue('https://acme.test');
    expect(screen.getByLabelText(/Business name/)).toHaveValue('Acme');
  });

  it('debounces autosave and sends sanitized answers', async () => {
    render(<BriefWizard brief={brief()} />);
    const description = screen.getByLabelText(/What does your business do/);

    fireEvent.change(description, { target: { value: 'We print' } });
    fireEvent.change(description, { target: { value: 'We print team uniforms' } });
    expect(saveBriefDraft).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Saving…');

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => expect(saveBriefDraft).toHaveBeenCalledTimes(1));
    const sent = formEntries(saveBriefDraft.mock.calls[0]);
    expect(sent.briefId).toBe(BRIEF_ID);
    expect(JSON.parse(sent.answers).description).toBe('We print team uniforms');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/^Saved/));
  });

  it('lists missing required questions on review and blocks submit', async () => {
    render(<BriefWizard brief={brief()} />);
    fireEvent.click(screen.getByRole('button', { name: /Review & submit/ }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/What do you want from SEO\?/);

    fireEvent.click(screen.getByRole('button', { name: 'Submit brief' }));
    await waitFor(() =>
      expect(screen.getAllByRole('alert').some((node) => /still need an answer/.test(node.textContent))).toBe(true),
    );
    expect(submitBrief).not.toHaveBeenCalled();
  });

  it('submits a complete brief as a new project and opens it', async () => {
    const complete = brief({
      answers: {
        site_url: 'https://acme.test',
        business_name: 'Acme',
        description: 'Uniforms',
        goals: ['leads'],
        service_area: 'local',
        priority_services: 'Embroidery',
        history: 'never',
        monthly_budget: 'unsure',
        start_date: '2026-11-01',
      },
    });
    render(<BriefWizard brief={complete} />);
    fireEvent.click(screen.getByRole('button', { name: /Review & submit/ }));
    fireEvent.change(await screen.findByLabelText('Project name'), { target: { value: 'Acme SEO' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit brief' }));

    await waitFor(() => expect(submitBrief).toHaveBeenCalledTimes(1));
    const sent = formEntries(submitBrief.mock.calls[0]);
    expect(sent).toMatchObject({ briefId: BRIEF_ID, projectTitle: 'Acme SEO', targetDate: '2026-11-01' });
    expect(sent.projectId).toBeUndefined();
    // The latest answers are saved before submitting.
    expect(saveBriefDraft).toHaveBeenCalled();
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/dashboard/projects/${PROJECT_ID}?brief=submitted`));
  });

  it('attaches to an existing project when chosen', async () => {
    const complete = brief({
      answers: {
        site_url: 'https://acme.test',
        business_name: 'Acme',
        description: 'Uniforms',
        goals: ['leads'],
        service_area: 'local',
        priority_services: 'Embroidery',
        history: 'never',
        monthly_budget: 'unsure',
      },
    });
    const projects = [
      { id: PROJECT_ID, title: 'Acme rebrand', status: 'in_progress' },
      { id: '33333333-3333-4333-8333-333333333333', title: 'Old', status: 'cancelled' },
    ];
    render(<BriefWizard brief={complete} projects={projects} />);
    fireEvent.click(screen.getByRole('button', { name: /Review & submit/ }));
    fireEvent.click(await screen.findByLabelText('Add to an existing project'));

    const select = screen.getByLabelText('Project');
    expect([...select.options].map((option) => option.textContent)).toEqual(['Acme rebrand']);

    fireEvent.click(screen.getByRole('button', { name: 'Submit brief' }));
    await waitFor(() => expect(submitBrief).toHaveBeenCalledTimes(1));
    expect(formEntries(submitBrief.mock.calls[0])).toMatchObject({ briefId: BRIEF_ID, projectId: PROJECT_ID });
  });

  it('surfaces a server-side rejection without navigating', async () => {
    submitBrief.mockResolvedValueOnce({ ok: false, error: 'Unable to submit the brief.' });
    const complete = brief({
      brief_type: 'ppc',
      answers: {
        business_name: 'Acme',
        offer: 'Uniforms',
        platforms: ['meta'],
        conversion: 'leads',
        locations: 'Austin',
        audience: 'Coaches',
        ad_spend: 'under_1k',
        history: 'never',
      },
    });
    render(<BriefWizard brief={complete} />);
    fireEvent.click(screen.getByRole('button', { name: /Review & submit/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Submit brief' }));

    expect(await screen.findByText('Unable to submit the brief.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
