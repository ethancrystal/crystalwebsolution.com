'use client';

import { useEffect, useId, useRef, useState } from 'react';

// Accessible tabs for portal pages (WAI-ARIA tabs pattern, styles in
// app/styles/crm.css under "Tabs").
//
//   <Tabs label="Project sections" tabs={[{ id, label, badge?, content }]}
//         onChange={(id) => ...} />
//
// - The selected tab lives in the URL as ?tab=<id>, so it survives a reload
//   and can be linked to. It is read once on mount and written with
//   replaceState, keeping every other query parameter.
// - Every panel stays mounted and inactive ones are `hidden`: a message
//   thread keeps its draft, staged uploads and live subscription when the
//   visitor switches tabs.
// - Arrow keys, Home and End move between tabs (roving tabindex).
// - `badge` (a number) shows an unread count; 0 hides it.
// - Pass `value` to control the selected tab from the page (for example a
//   "Message your project manager" button that opens Messages); onChange
//   still reports every change, including the one read from the URL.

export default function Tabs({ label, tabs, onChange, value, param = 'tab' }) {
  const baseId = useId();
  const ids = tabs.map((tab) => tab.id);
  const [internal, setSelected] = useState(ids[0]);
  const selected = value && ids.includes(value) ? value : internal;
  const buttons = useRef({});

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get(param);
    if (requested && ids.includes(requested) && requested !== ids[0]) {
      setSelected(requested);
      onChange?.(requested);
    }
    // Read once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function select(id, { focus = false } = {}) {
    setSelected(id);
    writeUrl(id);
    if (focus) buttons.current[id]?.focus();
    onChange?.(id);
  }

  function writeUrl(id) {
    const url = new URL(window.location.href);
    if (id === ids[0]) url.searchParams.delete(param);
    else url.searchParams.set(param, id);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }

  // Keep the URL in step when the page changes `value` itself. Not on mount:
  // the effect above has just read ?tab= and the page has not re-rendered
  // with it yet, so writing the initial value would erase a deep link.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (value && ids.includes(value)) writeUrl(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function onKeyDown(event) {
    const index = ids.indexOf(selected);
    const moves = {
      ArrowRight: (index + 1) % ids.length,
      ArrowLeft: (index - 1 + ids.length) % ids.length,
      Home: 0,
      End: ids.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    select(ids[moves[event.key]], { focus: true });
  }

  return (
    <div className="crm-tabs">
      <div className="crm-tablist" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
        {tabs.map((tab) => {
          const isSelected = tab.id === selected;
          return (
            <button
              key={tab.id}
              ref={(node) => { buttons.current[tab.id] = node; }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              className="crm-tab"
              onClick={() => select(tab.id)}
            >
              {tab.label}
              {tab.badge > 0 && ' '}
              {tab.badge > 0 && (
                <span className="crm-tab-badge">
                  {tab.badge}
                  {' '}
                  <span className="crm-visually-hidden">new</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== selected}
          tabIndex={0}
          className="crm-tabpanel"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
