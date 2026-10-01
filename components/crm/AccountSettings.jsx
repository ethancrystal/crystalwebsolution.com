'use client';

import { useEffect, useId, useState } from 'react';
import { changePassword, updateDisplayName } from '@/app/actions/account-actions';
import { MIN_PASSWORD_LENGTH } from '@/lib/crm/account.mjs';
import { DASHBOARD_TAB_CHOICES, browserStorage, readPrefs, writePrefs } from '@/lib/crm/prefs.mjs';
import { PendingLabel } from '@/components/auth/AuthPending';

// Settings for the signed-in person, any role: their name, password, the
// dashboard tab they open on, and (clients) a read-only view of their company.
// Each form reports its own result in a polite live region and keeps what was
// typed when it fails. Styles: app/styles/crm.css (.crm-card, .crm-field).
//
// Props: role, userId, fullName, email (their own, read-only), company
// ({ name, email, phone, website, industry } or null; clients only).

function Notice({ notice }) {
  // Always mounted so the message is announced when it appears.
  return (
    <div role={notice?.type === 'error' ? 'alert' : 'status'} aria-live="polite">
      {notice && (
        <p className={notice.type === 'error' ? 'crm-form-error' : 'crm-form-success'}>{notice.text}</p>
      )}
    </div>
  );
}

function ProfileForm({ fullName, email }) {
  const [name, setName] = useState(fullName ?? '');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState(null);
  const nameId = useId();
  const emailId = useId();

  async function onSubmit(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setNotice(null);
    try {
      const formData = new FormData();
      formData.set('fullName', name);
      const result = await updateDisplayName(formData);
      if (result?.ok) {
        setName(result.data.fullName);
        setNotice({ type: 'success', text: 'Your name has been saved.' });
      } else {
        setNotice({ type: 'error', text: result?.error || 'Unable to save your name.' });
      }
    } catch {
      setNotice({ type: 'error', text: 'Unable to save your name. Check your connection and try again.' });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="crm-card" aria-labelledby="settings-profile-heading">
      <h2 id="settings-profile-heading">Profile</h2>
      <form className="crm-form" onSubmit={onSubmit} aria-busy={pending}>
        <div className="crm-field">
          <label htmlFor={nameId}>Name</label>
          <input id={nameId} name="fullName" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={120} required disabled={pending} />
        </div>
        <div className="crm-field">
          <label htmlFor={emailId}>Email</label>
          <input id={emailId} value={email ?? ''} readOnly aria-describedby={`${emailId}-hint`} />
          <p id={`${emailId}-hint`} className="crm-field-hint">This is the address you sign in with. Contact us to change it.</p>
        </div>
        <Notice notice={notice} />
        <div className="crm-form-actions">
          <button type="submit" className="crm-button crm-button-primary" disabled={pending || !name.trim()}>
            <PendingLabel pending={pending} label="Saving…">Save name</PendingLabel>
          </button>
        </div>
      </form>
    </section>
  );
}

function PasswordForm() {
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState(null);
  const ids = { current: useId(), next: useId(), confirm: useId() };
  const set = (field) => (event) => setValues((previous) => ({ ...previous, [field]: event.target.value }));

  async function onSubmit(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setNotice(null);
    try {
      const formData = new FormData();
      for (const [field, value] of Object.entries(values)) formData.set(field, value);
      const result = await changePassword(formData);
      if (result?.ok) {
        // Never keep passwords in the form after a change.
        setValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setNotice({ type: 'success', text: 'Your password has been changed. We sent you a confirmation email.' });
      } else {
        // Keep what was typed except the current password, so a typo in one field is a one-field fix.
        setValues((previous) => ({ ...previous, currentPassword: '' }));
        setNotice({ type: 'error', text: result?.error || 'Unable to change your password.' });
      }
    } catch {
      setNotice({ type: 'error', text: 'Unable to change your password. Check your connection and try again.' });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="crm-card" aria-labelledby="settings-password-heading">
      <h2 id="settings-password-heading">Password</h2>
      <form className="crm-form" onSubmit={onSubmit} aria-busy={pending}>
        <div className="crm-field">
          <label htmlFor={ids.current}>Current password</label>
          <input id={ids.current} type="password" value={values.currentPassword} onChange={set('currentPassword')} autoComplete="current-password" required disabled={pending} />
        </div>
        <div className="crm-field">
          <label htmlFor={ids.next}>New password</label>
          <input id={ids.next} type="password" value={values.newPassword} onChange={set('newPassword')} autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required disabled={pending} aria-describedby={`${ids.next}-hint`} />
          <p id={`${ids.next}-hint`} className="crm-field-hint">At least {MIN_PASSWORD_LENGTH} characters.</p>
        </div>
        <div className="crm-field">
          <label htmlFor={ids.confirm}>Confirm new password</label>
          <input id={ids.confirm} type="password" value={values.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required disabled={pending} />
        </div>
        <Notice notice={notice} />
        <div className="crm-form-actions">
          <button type="submit" className="crm-button crm-button-primary" disabled={pending}>
            <PendingLabel pending={pending} label="Changing…">Change password</PendingLabel>
          </button>
        </div>
      </form>
    </section>
  );
}

function DashboardForm({ role, userId }) {
  const choices = DASHBOARD_TAB_CHOICES[role] ?? [];
  const firstId = choices[0]?.id ?? '';
  // This page is server-rendered, where there is no localStorage, so the saved
  // choice is read after mount; reading it while rendering would make the
  // browser's first frame differ from the server's.
  const [tab, setTab] = useState(firstId);
  const [notice, setNotice] = useState(null);
  const selectId = useId();

  useEffect(() => {
    setTab(readPrefs(browserStorage(), userId, role).defaultTab ?? firstId);
  }, [userId, role, firstId]);

  function onSubmit(event) {
    event.preventDefault();
    // The first tab is every dashboard's own default, so choosing it clears the preference.
    const saved = writePrefs(browserStorage(), userId, role, { defaultTab: tab === firstId ? null : tab });
    setNotice(saved
      ? { type: 'success', text: 'Saved. Your dashboard will open on this tab on this device.' }
      : { type: 'error', text: 'This browser would not let us save that. Your dashboard keeps its usual tab.' });
  }

  if (choices.length === 0) return null;
  return (
    <section className="crm-card" aria-labelledby="settings-dashboard-heading">
      <h2 id="settings-dashboard-heading">Dashboard</h2>
      <form className="crm-form" onSubmit={onSubmit}>
        <div className="crm-field">
          <label htmlFor={selectId}>Open on</label>
          <select id={selectId} value={tab} onChange={(event) => { setTab(event.target.value); setNotice(null); }} aria-describedby={`${selectId}-hint`}>
            {choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
          </select>
          <p id={`${selectId}-hint`} className="crm-field-hint">
            {role === 'client' ? 'The tab a project opens on.' : 'The tab your home page opens on.'} Saved on this device only.
          </p>
        </div>
        <Notice notice={notice} />
        <div className="crm-form-actions">
          <button type="submit" className="crm-button crm-button-primary">Save</button>
        </div>
      </form>
    </section>
  );
}

function CompanyCard({ company }) {
  const rows = [
    ['Company', company.name],
    ['Email', company.email],
    ['Phone', company.phone],
    ['Website', company.website],
    ['Industry', company.industry],
  ].filter(([, value]) => value);
  return (
    <section className="crm-card" aria-labelledby="settings-company-heading">
      <h2 id="settings-company-heading">Your company</h2>
      <dl className="crm-details">
        {rows.map(([term, value]) => (
          <div key={term} className="crm-details-row">
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="crm-field-hint">Need something changed? Message your project manager or contact us.</p>
    </section>
  );
}

export default function AccountSettings({ role, userId, fullName, email, company = null }) {
  return (
    <div className="crm-settings">
      <ProfileForm fullName={fullName} email={email} />
      <PasswordForm />
      <DashboardForm role={role} userId={userId} />
      {role === 'client' && company && <CompanyCard company={company} />}
    </div>
  );
}
