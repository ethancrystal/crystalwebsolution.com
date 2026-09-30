// Behaviour of components/crm/Tabs.jsx: WAI-ARIA roles, keyboard movement,
// ?tab= in the URL, panels kept mounted, badges and the controlled `value`.

import { useState } from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';

import Tabs from '@/components/crm/Tabs';

const TABS = [
  { id: 'overview', label: 'Overview', content: <p>Overview panel</p> },
  { id: 'messages', label: 'Messages', badge: 2, content: <input aria-label="Draft" /> },
  { id: 'files', label: 'Files', badge: 0, content: <p>Files panel</p> },
];

function setUrl(search) {
  window.history.replaceState(null, '', `/dashboard/projects/p${search}`);
}

beforeEach(() => setUrl(''));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Tabs', () => {
  it('renders a labelled tablist with the first tab selected', () => {
    render(<Tabs label="Project sections" tabs={TABS} />);
    expect(screen.getByRole('tablist', { name: 'Project sections' })).toBeTruthy();
    const overview = screen.getByRole('tab', { name: 'Overview' });
    expect(overview.getAttribute('aria-selected')).toBe('true');
    expect(overview.tabIndex).toBe(0);
    expect(screen.getByRole('tab', { name: /Messages/ }).tabIndex).toBe(-1);
    const panel = screen.getByRole('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(overview.id);
    expect(overview.getAttribute('aria-controls')).toBe(panel.id);
  });

  it('shows a badge only for a positive count', () => {
    render(<Tabs label="Sections" tabs={TABS} />);
    expect(screen.getByRole('tab', { name: 'Messages 2 new' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Files' })).toBeTruthy();
  });

  it('keeps inactive panels mounted but hidden, so drafts survive', () => {
    render(<Tabs label="Sections" tabs={TABS} />);
    fireEvent.click(screen.getByRole('tab', { name: /Messages/ }));
    const draft = screen.getByLabelText('Draft');
    fireEvent.change(draft, { target: { value: 'half-written' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(draft.closest('[role="tabpanel"]').hidden).toBe(true);
    fireEvent.click(screen.getByRole('tab', { name: /Messages/ }));
    expect(screen.getByLabelText('Draft').value).toBe('half-written');
  });

  it('moves with arrow keys, Home and End, wrapping around', () => {
    const onChange = vi.fn();
    render(<Tabs label="Sections" tabs={TABS} onChange={onChange} />);
    const overview = screen.getByRole('tab', { name: 'Overview' });
    overview.focus();
    fireEvent.keyDown(overview, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Files' }));
    fireEvent.keyDown(document.activeElement, { key: 'Home' });
    expect(document.activeElement).toBe(overview);
    fireEvent.keyDown(overview, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: /Messages/ }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(document.activeElement, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith('files');
  });

  it('writes ?tab= and keeps other parameters; the first tab clears it', () => {
    setUrl('?keep=1');
    render(<Tabs label="Sections" tabs={TABS} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Files' }));
    let params = new URLSearchParams(window.location.search);
    expect(params.get('tab')).toBe('files');
    expect(params.get('keep')).toBe('1');
    fireEvent.click(screen.getByRole('tab', { name: 'Overview' }));
    params = new URLSearchParams(window.location.search);
    expect(params.has('tab')).toBe(false);
    expect(params.get('keep')).toBe('1');
  });

  it('opens the tab named in the URL and reports it; ignores unknown ids', () => {
    setUrl('?tab=files');
    const onChange = vi.fn();
    const { unmount } = render(<Tabs label="Sections" tabs={TABS} onChange={onChange} />);
    expect(screen.getByRole('tab', { name: 'Files' }).getAttribute('aria-selected')).toBe('true');
    expect(onChange).toHaveBeenCalledWith('files');
    unmount();

    setUrl('?tab=nope');
    render(<Tabs label="Sections" tabs={TABS} />);
    expect(screen.getByRole('tab', { name: 'Overview' }).getAttribute('aria-selected')).toBe('true');
  });

  it('follows a controlled value set by the page', () => {
    function Page() {
      const [tab, setTab] = useState('overview');
      return (
        <>
          <button type="button" onClick={() => setTab('messages')}>Message your manager</button>
          <Tabs label="Sections" tabs={TABS} value={tab} onChange={setTab} />
        </>
      );
    }
    setUrl('?tab=files');
    render(<Page />);
    // A controlled page still honours the deep link, and mounting never
    // erases it.
    expect(screen.getByRole('tab', { name: 'Files' }).getAttribute('aria-selected')).toBe('true');
    expect(new URLSearchParams(window.location.search).get('tab')).toBe('files');
    fireEvent.click(screen.getByRole('button', { name: 'Message your manager' }));
    expect(screen.getByRole('tab', { name: /Messages/ }).getAttribute('aria-selected')).toBe('true');
    expect(new URLSearchParams(window.location.search).get('tab')).toBe('messages');
  });
});
