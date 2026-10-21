'use client';

import { useEffect, useRef, useState } from 'react';

// First-run tour for the client dashboard (portal plan phase C1, decision D2:
// remembered per browser). Four steps, Next / Back / Skip, and a localStorage
// key so it never auto-opens again — the dashboard header's "Replay tour"
// button clears the key and reopens it. Flat and quiet on purpose: no
// animation, so prefers-reduced-motion needs no branch.

export const TOUR_SEEN_KEY = 'cws.portal.tour.seen.v1';

const STEPS = [
  {
    title: 'Start a project',
    body: 'Pick a service under "Start a new brief" — every card opens its own brief.',
    hint: 'Look for the service cards further down this page.',
  },
  {
    title: 'Fill in the brief',
    body: 'Answer the guided questions. Your answers save as you go, so you can stop and come back any time.',
    hint: 'The wizard opens as soon as you pick a service.',
  },
  {
    title: 'Message the team',
    body: 'Once a project is running, its conversation is where you talk with the team working on it.',
    hint: 'Open a project and look for the "Conversation & Files" section.',
  },
  {
    title: 'Upload files',
    body: 'Share assets and references by adding them to a project\'s files.',
    hint: 'Open a project and look for the "Files" section.',
  },
];

function readSeenKey() {
  try {
    return window.localStorage.getItem(TOUR_SEEN_KEY);
  } catch {
    return null;
  }
}

function writeSeenKey() {
  try {
    window.localStorage.setItem(TOUR_SEEN_KEY, new Date().toISOString());
  } catch {
    // Storage unavailable (private mode): the tour simply shows every visit.
  }
}

function clearSeenKey() {
  try {
    window.localStorage.removeItem(TOUR_SEEN_KEY);
  } catch {
    // Nothing to clear.
  }
}

// `replayToken` is bumped by the dashboard's "Replay tour" button; any value
// above the initial one clears the seen key and reopens the tour.
export default function PortalTour({ replayToken = 0 }) {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!readSeenKey()) setOpen(true);
  }, []);

  useEffect(() => {
    if (replayToken > 0) {
      clearSeenKey();
      setStep(0);
      setOpen(true);
    }
  }, [replayToken]);

  useEffect(() => {
    if (!open) return undefined;
    dialogRef.current?.focus();
    function handleKeyDown(event) {
      if (event.key === 'Escape') finish();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  function finish() {
    writeSeenKey();
    setOpen(false);
  }

  function next() {
    if (step === STEPS.length - 1) finish();
    else setStep((current) => current + 1);
  }

  function back() {
    setStep((current) => Math.max(0, current - 1));
  }

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="portal-tour-backdrop">
      <div
        className="portal-tour"
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-tour-title"
        aria-describedby="portal-tour-body"
        tabIndex={-1}
        ref={dialogRef}
      >
        <p className="portal-tour-count">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 id="portal-tour-title">{current.title}</h2>
        <p id="portal-tour-body">{current.body}</p>
        <p className="portal-tour-hint">{current.hint}</p>
        <div className="portal-tour-controls">
          <button type="button" className="crm-button crm-button-ghost crm-button-small" onClick={finish}>
            Skip tour
          </button>
          <div className="portal-tour-nav">
            <button
              type="button"
              className="crm-button crm-button-small"
              onClick={back}
              disabled={step === 0}
            >
              Back
            </button>
            <button
              type="button"
              className="crm-button crm-button-primary crm-button-small"
              onClick={next}
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>

        <style jsx>{`
          .portal-tour-backdrop {
            position: fixed;
            inset: 0;
            z-index: 60;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            background: rgba(4, 6, 12, 0.7);
          }

          .portal-tour {
            width: 100%;
            max-width: 26rem;
            background: var(--crm-surface);
            border: 1px solid var(--crm-border-strong);
            border-radius: var(--crm-radius);
            padding: 1.5rem;
            color: var(--crm-text);
            outline: none;
          }

          .portal-tour-count {
            margin: 0 0 0.35rem;
            color: var(--crm-subtle);
            font-size: 0.8rem;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }

          .portal-tour h2 {
            margin: 0 0 0.5rem;
            font-size: 1.15rem;
            font-weight: 600;
          }

          .portal-tour p {
            margin: 0 0 0.75rem;
            color: var(--crm-muted);
            line-height: 1.55;
          }

          .portal-tour-hint {
            color: var(--crm-subtle);
            font-size: 0.875rem;
          }

          .portal-tour-controls {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
            margin-top: 1.25rem;
          }

          .portal-tour-nav {
            display: flex;
            gap: 0.5rem;
          }

          @media (max-width: 480px) {
            .portal-tour-controls {
              flex-direction: column-reverse;
              align-items: stretch;
            }
            .portal-tour-nav {
              justify-content: flex-end;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
