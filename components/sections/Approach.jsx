'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import SectionReveal from '../SectionReveal';
import { useCardMouseReveal } from '../CardHoverReveal';
import { lightApproach, dimApproach } from '../../lib/beacon';

const STEPS = [
  {
    title: 'Brief & Discovery',
    description:
      'We map your audience, goals, and constraints so the build starts from the right problem instead of the prettiest assumption.',
    colorTheme: 'blue',
  },
  {
    title: 'Design',
    description:
      'We turn direction into visual system, motion, and interaction craft that earns attention without shouting.',
    colorTheme: 'purple',
  },
  {
    title: 'Development',
    description:
      'Design and engineering move together, so polish survives build time and launch readiness is verified before cutover.',
    colorTheme: 'blue',
  },
  {
    title: 'Deployment',
    description:
      'We launch, instrument, and improve with you—go-live is the beginning of a measurable feedback loop.',
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

      <div id={panelId} className="approach-step-panel" role="region" aria-labelledby={triggerId}>
        <div className="approach-step-panel-inner">
          <p className="approach-step-desc">{step.description}</p>
        </div>
      </div>
    </div>
  );
}

export default function Approach() {
  // One step expanded at a time; -1 once the open one is collapsed again.
  const [openIndex, setOpenIndex] = useState(0);
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
      <div className="text-plate">
        <p className="eyebrow">
          <SectionReveal as="span" direction="left">How we work</SectionReveal>
        </p>
        <SectionReveal as="h2" direction="left" className="section-title">
          Four steps. No shortcuts.
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
