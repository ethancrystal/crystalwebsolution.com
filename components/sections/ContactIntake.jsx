'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import SectionReveal from '../SectionReveal';
import Reveal from '../Reveal';
import ContactForm from '../marketing/ContactForm';
import ProductionRequestForm from '../marketing/ProductionRequestForm';
import { SITE } from '../../lib/site';

// The closing intake. Two doors into the same /api/contact route:
//   production  (default) artwork, size and quantity for patches, stickers,
//               embroidery digitizing and vector work: the embroidery-first
//               homepage's call to action lands here.
//   brief       the original digital-studio project brief (budget tiers).
// Only the active panel is mounted. Two mounted forms would duplicate the
// `${variant}-*` field ids and run two hCaptcha widgets.
//
// `/#contact-brief` and `/#contact-production` open the matching panel and
// scroll to the switcher. Each is a real element id (an invisible anchor that
// sits above the tabs, so the fixed nav does not cover them after the jump).
// SmoothScroll cancels the browser's own hash navigation for in-page links, so
// a link click is handled here as well as the hash on load and on hashchange.
const TABS = Object.freeze([
  { key: 'production', label: 'Production request', anchorId: 'contact-production' },
  { key: 'brief', label: 'Web project brief', anchorId: 'contact-brief' },
]);

function modeFromHash(hash) {
  return TABS.find((tab) => `#${tab.anchorId}` === hash)?.key ?? null;
}

function modeFromHref(href) {
  if (!href || !(href.startsWith('#') || href.startsWith('/#'))) return null;
  return modeFromHash(href.slice(href.indexOf('#')));
}

export default function ContactIntake() {
  const [mode, setMode] = useState('production');
  const tabRefs = useRef({});
  // What the visitor has typed in each panel. Only one panel is mounted at a
  // time, so each reports its state here and starts from it when re-mounted.
  const drafts = useRef({ production: undefined, brief: undefined });
  const onProductionDraft = useCallback((draft) => { drafts.current.production = draft; }, []);
  const onBriefDraft = useCallback((draft) => { drafts.current.brief = draft; }, []);

  useEffect(() => {
    const sync = () => {
      const fromHash = modeFromHash(window.location.hash);
      if (fromHash) setMode(fromHash);
    };
    const onLinkClick = (event) => {
      const next = modeFromHref(event.target.closest?.('a[href]')?.getAttribute('href'));
      if (next) setMode(next);
    };
    sync();
    window.addEventListener('hashchange', sync);
    document.addEventListener('click', onLinkClick);
    return () => {
      window.removeEventListener('hashchange', sync);
      document.removeEventListener('click', onLinkClick);
    };
  }, []);

  const onTabKeyDown = useCallback((event) => {
    const index = TABS.findIndex((tab) => tab.key === mode);
    let next = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = TABS[(index + 1) % TABS.length];
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = TABS[(index - 1 + TABS.length) % TABS.length];
    else if (event.key === 'Home') next = TABS[0];
    else if (event.key === 'End') next = TABS[TABS.length - 1];
    if (!next) return;
    event.preventDefault();
    setMode(next.key);
    tabRefs.current[next.key]?.focus();
  }, [mode]);

  return (
    <div className="contact-intake">
      <div className="contact-intake-head">
        {TABS.map((tab) => <span key={tab.key} id={tab.anchorId} className="contact-intake-anchor" />)}
        <div
          className="contact-intake-tabs"
          role="tablist"
          aria-label="What would you like to send us?"
          onKeyDown={onTabKeyDown}
        >
          {TABS.map((tab) => {
            const selected = mode === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                id={`contact-tab-${tab.key}`}
                ref={(node) => { tabRefs.current[tab.key] = node; }}
                className="contact-intake-tab"
                aria-selected={selected}
                aria-controls={selected ? `contact-panel-${tab.key}` : undefined}
                tabIndex={selected ? 0 : -1}
                onClick={() => setMode(tab.key)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {mode === 'production' ? (
        <div
          className="contact-panel contact-panel--production"
          role="tabpanel"
          id="contact-panel-production"
          aria-labelledby="contact-tab-production"
        >
          <Reveal className="contact-production-copy" y={28}>
            <p className="contact-production-kicker">PRODUCTION REQUEST</p>
            <h2 className="contact-production-title">
              Have artwork ready?
              <br />
              <em>Let&apos;s make it production-ready.</em>
            </h2>
            <p className="contact-production-lede">
              Send the file, the size and the quantity. A specialist reviews it and comes back with a mockup before
              anything is produced.
            </p>
            <ul className="contact-production-lines">
              <li><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
              {SITE.phone && <li><a href={`tel:${SITE.phone.replace(/[^+\d]/g, '')}`}>{SITE.phone}</a></li>}
              <li className="contact-production-city">{SITE.city}</li>
            </ul>
          </Reveal>
          <Reveal className="contact-production-form" y={28} delay={0.08}>
            <ProductionRequestForm
              variant="production"
              draft={drafts.current.production}
              onDraftChange={onProductionDraft}
            />
          </Reveal>
        </div>
      ) : (
        <div
          className="contact-panel contact-panel--brief"
          role="tabpanel"
          id="contact-panel-brief"
          aria-labelledby="contact-tab-brief"
        >
          <div className="text-plate">
            <p className="eyebrow"><SectionReveal as="span" direction="left">From idea to outcome</SectionReveal></p>
            <SectionReveal as="h2" direction="left" className="contact-line">Let&apos;s build</SectionReveal>
            <SectionReveal as="h2" direction="left" className="contact-line contact-line-accent" delay={0.08}>something worth the scroll.</SectionReveal>
            <SectionReveal className="contact-sub" direction="up" delay={0.1}>
              <p>Send your brief and get a straight read — scope, timeline, cost, and the first move — if it&apos;s a fit.</p>
            </SectionReveal>
          </div>
          <SectionReveal className="contact-form-wrap" direction="up" delay={0.1}>
            <ContactForm variant="home" draft={drafts.current.brief} onDraftChange={onBriefDraft} />
          </SectionReveal>
        </div>
      )}
    </div>
  );
}
