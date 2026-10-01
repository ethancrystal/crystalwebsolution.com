// components/crm/Tabs.jsx `defaultId`: the tab a person chose to open on
// (Settings > Dashboard). It arrives after mount, yields to an explicit
// ?tab= link or an earlier click, and keeps reloads landing where they left.

import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import Tabs from '@/components/crm/Tabs';

const TABS = [
  { id: 'overview', label: 'Overview', content: <p>Overview panel</p> },
  { id: 'messages', label: 'Messages', badge: 2, content: <p>Messages panel</p> },
  { id: 'files', label: 'Files', content: <p>Files panel</p> },
];

const selectedLabel = () => screen.getAllByRole('tab').find((tab) => tab.getAttribute('aria-selected') === 'true').textContent;
const param = () => new URLSearchParams(window.location.search).get('tab');
const setUrl = (search) => window.history.replaceState(null, '', `/dashboard/projects/p${search}`);
const view = (props) => <Tabs label="Sections" tabs={TABS} {...props} />;

beforeEach(() => setUrl(''));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Tabs defaultId', () => {
  it('opens on it once it arrives, reports it, and keeps the URL clean', () => {
    const onChange = vi.fn();
    const { rerender } = render(view({ onChange }));
    expect(selectedLabel()).toBe('Overview');
    rerender(view({ onChange, defaultId: 'files' }));
    expect(selectedLabel()).toBe('Files');
    expect(onChange).toHaveBeenCalledWith('files');
    expect(param()).toBeNull();
  });

  it('an explicit ?tab= link wins over the default', () => {
    setUrl('?tab=messages');
    const { rerender } = render(view());
    rerender(view({ defaultId: 'files' }));
    expect(selectedLabel()).toMatch(/^Messages/);
    expect(param()).toBe('messages');
  });

  it('a click made before the default arrives is not overridden', () => {
    const { rerender } = render(view());
    fireEvent.click(screen.getByRole('tab', { name: /Messages/ }));
    rerender(view({ defaultId: 'files' }));
    expect(selectedLabel()).toMatch(/^Messages/);
  });

  it('ignores a default that is not a tab here, or is the first tab already', () => {
    const onChange = vi.fn();
    const { rerender } = render(view({ onChange }));
    rerender(view({ onChange, defaultId: 'nope' }));
    rerender(view({ onChange, defaultId: 'overview' }));
    expect(selectedLabel()).toBe('Overview');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('with a default set, picking it carries no ?tab= and picking the first tab does', () => {
    const { rerender } = render(view());
    rerender(view({ defaultId: 'files' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(param()).toBe('overview');
    fireEvent.click(screen.getByRole('tab', { name: 'Files' }));
    expect(param()).toBeNull();
  });

  it('a reload on the explicit first-tab link stays on it rather than jumping to the default', () => {
    setUrl('?tab=overview');
    const { rerender } = render(view());
    rerender(view({ defaultId: 'files' }));
    expect(selectedLabel()).toBe('Overview');
  });

  it('without a default nothing changes: the first tab is home and carries no ?tab=', () => {
    render(view());
    fireEvent.click(screen.getByRole('tab', { name: 'Files' }));
    expect(param()).toBe('files');
    fireEvent.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(param()).toBeNull();
  });
});
