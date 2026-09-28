'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import SectionReveal from '../SectionReveal';
import SectionHeader from '../shared/SectionHeader';
import { useCardMouseReveal } from '../CardHoverReveal';
import SectionSkeleton from '../ui/section-skeleton';
import { lightApproach, dimApproach } from '../../lib/beacon';

const STEPS = [
  {
    title: 'Brief & Discovery',
    summary: 'Questions before pixels — your goals, your customers, and the one job this project has to do.',
    description:
      'Most projects go wrong right here, because the work starts on an assumption nobody wrote down. So you get asked first: what you sell, who you sell it to, and what has to change for this to be worth doing. Scope and cost are settled in writing before any design begins, so you decide with the whole picture in front of you.',
    outputs: [
      'A written brief you sign off on',
      'Scope, cost, and timeline agreed up front',
      'The measure we check the work against later',
    ],
    colorTheme: 'blue',
  },
  {
    title: 'Design',
    summary: 'You review real screens, not adjectives — layout, type, colour, and motion drawn as one system.',
    description:
      'Direction, interface, and motion are designed together instead of bolted on in sequence, so the site holds its shape on every page — including the ones nobody demos. You give notes in rounds, and nothing moves to build until what you are looking at is what you want.',
    outputs: [
      'Key screens designed to production detail',
      'A reusable system for pages you add later',
      'Feedback rounds built into the schedule',
    ],
    colorTheme: 'purple',
  },
  {
    title: 'Development',
    summary: 'The people who designed it write the code, so what you approved is what ships.',
    description:
      'Hand-off is where good design quietly dies — a second team reinterprets the work and drops whatever is awkward to build. Here design and engineering are the same team, so nothing gets lost in translation. Your site is built to be fast, accessible, and readable by search engines, and tested on real devices before it goes anywhere near your customers.',
    outputs: [
      'A production build, tested on real devices',
      'Accessible, fast, and search-ready by default',
      'Code and content you own outright',
    ],
    colorTheme: 'blue',
  },
  {
    title: 'Deployment',
    summary: 'Launch is a checkpoint, not the finish — we stay on for what the first weeks teach you.',
    description:
      'Your site goes live with analytics wired up, so you can see what visitors actually do rather than guess. Real traffic always exposes something a staging site cannot, and we stay close through that first stretch to fix it. When you want to add to the site months later, you are talking to the people who built it.',
    outputs: [
      'Launch checks and analytics in place',
      'A walkthrough so your team can run it',
      'Support after go-live, not just before',
    ],
    colorTheme: 'purple',
  },
];

// One accordion row. This is a component (not an inline map body) so that
// useCardMouseReveal() is called once per mounted step at a stable position in
// the hook order — calling it inside the parent's .map() callback broke the
// rules of hooks.
function ApproachStep({ step, index, isOpen, onToggle, onTriggerKeyDown, registerTrigger }) {
  const { cardRef, onMouseMove } = useCardMouseReveal();
  const triggerId = `approach-step-${index}`;
  const panelId = `approach-panel-${index}`;

  return (
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      className="approach-step"
      data-theme={step.colorTheme}
      data-open={isOpen ? 'true' : 'false'}
    >
      <h3 className="approach-step-heading">
        <button
          type="button"
          id={triggerId}
          ref={(el) => registerTrigger(index, el)}
          className="approach-step-trigger"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => onToggle(index)}
          onKeyDown={(event) => onTriggerKeyDown(event, index)}
        >
          <span className="approach-step-num">{`0${index + 1}`}</span>
          <span className="approach-step-title">{step.title}</span>
          <span className="approach-step-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="4" y1="12" x2="20" y2="12" />
              <line className="approach-step-icon-bar" x1="12" y1="4" x2="12" y2="20" />
            </svg>
          </span>
        </button>
      </h3>

      {/* Always visible, so the collapsed accordion reads as four described
          steps rather than four bare labels. Sits outside the <button> to keep
          the trigger's accessible name short. */}
      <p className="approach-step-summary">{step.summary}</p>

      <div id={panelId} className="approach-step-panel" role="region" aria-labelledby={triggerId}>
        <div className="approach-step-panel-inner">
          <p className="approach-step-desc">{step.description}</p>
          <div className="approach-step-outputs">
            <p className="approach-step-outputs-label">What you get</p>
            <ul>
              {step.outputs.map((output) => (
                <li key={output}>{output}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Approach() {
  // One step expanded at a time; -1 means none open. Starts collapsed so a
  // fresh page load never pins the compass to step 0 via the beacon effect
  // below — the scroll-derived choreography plays until the visitor opens a
  // step themselves.
  const [openIndex, setOpenIndex] = useState(-1);
  const triggersRef = useRef([]);

  // DOM -> canvas hand-off. No prop crosses the boundary: the expanded step is
  // written into the lib/beacon.js `approachBeacon` singleton and read inside
  // ApproachCompass's useFrame, exactly as Services/ServiceRail already do with
  // `beacon.index`.
  useEffect(() => {
    lightApproach(openIndex);
  }, [openIndex]);

  // Teardown: leave the compass on its own scroll-derived step when this
  // section unmounts.
  useEffect(() => () => { dimApproach(); }, []);

  const registerTrigger = useCallback((index, el) => {
    triggersRef.current[index] = el;
  }, []);

  const onToggle = useCallback((index) => {
    setOpenIndex((current) => (current === index ? -1 : index));
  }, []);

  // Enter/Space are handled natively by <button>. This only adds the optional
  // APG accordion roving keys on top of normal tab order.
  const onTriggerKeyDown = useCallback((event, index) => {
    const last = STEPS.length - 1;
    let next = null;
    if (event.key === 'ArrowDown') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowUp') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next === null) return;
    event.preventDefault();
    triggersRef.current[next]?.focus();
  }, []);

  return (
    <section className="section approach" id="approach" data-quiet>
      <SectionSkeleton />
      <div className="text-plate">
        <SectionHeader eyebrow="How we work" title="Four steps. No shortcuts." />
        <SectionReveal className="approach-intro" direction="up" delay={0.08}>
          <p>
            Every project runs these four steps in the same order, whether it is a
            one-page site or a rebuild with automation behind it. You always know
            which step you are in, what comes next, and what it costs before it
            starts. Open any step to see what happens inside it.
          </p>
        </SectionReveal>
      </div>

      <div className="approach-accordion">
        {STEPS.map((step, index) => (
          <ApproachStep
            key={step.title}
            step={step}
            index={index}
            isOpen={openIndex === index}
            onToggle={onToggle}
            onTriggerKeyDown={onTriggerKeyDown}
            registerTrigger={registerTrigger}
          />
        ))}
      </div>
    </section>
  );
}
