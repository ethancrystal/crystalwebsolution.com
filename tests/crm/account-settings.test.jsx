// components/crm/AccountSettings.jsx with the account Server Actions mocked:
// the name and password forms report their outcome and keep what was typed
// on failure; the dashboard preference is stored per user on this device; a
// client sees a read-only company card.

import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const updateDisplayName = vi.fn();
const changePassword = vi.fn();
vi.mock('@/app/actions/account-actions', () => ({
  updateDisplayName: (...args) => updateDisplayName(...args),
  changePassword: (...args) => changePassword(...args),
}));

import AccountSettings from '@/components/crm/AccountSettings';

const COMPANY = { name: 'Acme Team Wear', email: 'ops@acme.test', phone: '555-0100', website: 'acme.test', industry: 'Sports' };

function renderSettings(overrides = {}) {
  return render(<AccountSettings role="client" userId="u1" fullName="Casey Jones" email="casey@example.test" company={COMPANY} {...overrides} />);
}

beforeEach(() => {
  window.localStorage.clear();
  updateDisplayName.mockResolvedValue({ ok: true, data: { fullName: 'Casey J. Jones' } });
  changePassword.mockResolvedValue({ ok: true });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('profile', () => {
  it('shows the name, the sign-in email read-only, and saves a new name', async () => {
    renderSettings();
    expect(screen.getByLabelText('Email').readOnly).toBe(true);
    expect(screen.getByLabelText('Email').value).toBe('casey@example.test');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Casey  J. Jones' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));

    expect(await screen.findByText('Your name has been saved.')).toBeTruthy();
    expect(updateDisplayName.mock.calls[0][0].get('fullName')).toBe('Casey  J. Jones');
    expect(screen.getByLabelText('Name').value).toBe('Casey J. Jones');
  });

  it('reports a failure and keeps what was typed', async () => {
    updateDisplayName.mockResolvedValue({ ok: false, error: 'Unable to save your name. Please try again.' });
    renderSettings();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Unable to save your name. Please try again.');
    expect(screen.getByLabelText('Name').value).toBe('New Name');
  });

  it('cannot save an empty name, and disables the form while saving', async () => {
    let finish;
    updateDisplayName.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    renderSettings();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Save name' }).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Casey' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() => expect(screen.getByLabelText('Name').disabled).toBe(true));
    finish({ ok: true, data: { fullName: 'Casey' } });
    await screen.findByText('Your name has been saved.');
  });

  it('survives the action throwing (offline)', async () => {
    updateDisplayName.mockRejectedValue(new Error('network'));
    renderSettings();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Casey' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Check your connection/);
  });
});

describe('password', () => {
  function fill({ current = 'old-password', next = 'new-password', confirm = 'new-password' } = {}) {
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: current } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: next } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: confirm } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
  }

  it('changes the password, clears every field, and says a confirmation was sent', async () => {
    renderSettings();
    fill();
    expect(await screen.findByText(/Your password has been changed/)).toBeTruthy();
    const data = changePassword.mock.calls[0][0];
    expect([data.get('currentPassword'), data.get('newPassword'), data.get('confirmPassword')]).toEqual(['old-password', 'new-password', 'new-password']);
    for (const label of ['Current password', 'New password', 'Confirm new password']) {
      expect(screen.getByLabelText(label).value).toBe('');
    }
  });

  it('on failure keeps the new password but clears the current one', async () => {
    changePassword.mockResolvedValue({ ok: false, error: 'Your current password is not correct.' });
    renderSettings();
    fill();
    expect((await screen.findByRole('alert')).textContent).toBe('Your current password is not correct.');
    expect(screen.getByLabelText('Current password').value).toBe('');
    expect(screen.getByLabelText('New password').value).toBe('new-password');
  });

  it('uses password fields with the right autocomplete hints', () => {
    renderSettings();
    expect(screen.getByLabelText('Current password').getAttribute('autocomplete')).toBe('current-password');
    expect(screen.getByLabelText('New password').getAttribute('autocomplete')).toBe('new-password');
    expect(screen.getByLabelText('New password').type).toBe('password');
  });
});

describe('dashboard preference', () => {
  it('offers the role\'s tabs and stores a non-default choice for this user only', () => {
    renderSettings({ role: 'admin', company: null });
    const select = screen.getByLabelText('Open on');
    expect([...select.options].map((option) => option.text)).toEqual(['Needs action', 'Projects', 'CRM']);

    fireEvent.change(select, { target: { value: 'crm' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText(/Your dashboard will open on this tab on this device/)).toBeTruthy();
    expect(JSON.parse(window.localStorage.getItem('crm-prefs:u1'))).toEqual({ defaultTab: 'crm' });
    expect(window.localStorage.getItem('crm-prefs:u2')).toBeNull();
  });

  it('shows the saved choice, and choosing the dashboard\'s own first tab clears it', () => {
    window.localStorage.setItem('crm-prefs:u1', JSON.stringify({ defaultTab: 'projects' }));
    renderSettings({ role: 'project_manager', company: null });
    expect(screen.getByLabelText('Open on').value).toBe('projects');

    fireEvent.change(screen.getByLabelText('Open on'), { target: { value: 'needs-you' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(window.localStorage.getItem('crm-prefs:u1')).toBeNull();
  });

  it('says so when the browser will not store it', () => {
    renderSettings({ role: 'admin', company: null });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    fireEvent.change(screen.getByLabelText('Open on'), { target: { value: 'crm' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert').textContent).toMatch(/would not let us save/);
    setItem.mockRestore();
  });
});

describe('company', () => {
  it('shows a client their company, read-only, and only when there is one', () => {
    const { unmount } = renderSettings();
    const card = screen.getByRole('region', { name: 'Your company' });
    expect(card.textContent).toContain('Acme Team Wear');
    expect(card.querySelector('input')).toBeNull();
    unmount();

    renderSettings({ company: null });
    expect(screen.queryByRole('region', { name: 'Your company' })).toBeNull();
  });

  it('staff do not get a company card', () => {
    renderSettings({ role: 'project_manager' });
    expect(screen.queryByRole('region', { name: 'Your company' })).toBeNull();
  });
});
