'use client';

import { useEffect, useRef, useState } from 'react';
import SectionReveal from '../SectionReveal';
import Magnetic from '../Magnetic';
import { SITE } from '../../lib/site';
import {
  CONTACT_BUDGETS,
  CONTACT_FIELD_LIMITS,
  createEmptyContactForm,
  validateContactForm,
} from '../../lib/contactForm.mjs';

// Contact deliberately closes quietly. The hero owns the crystal and its
// pulse language; this CTA uses a contained CSS sweep instead of replaying
// that 3D gesture at the end of the page.
export default function Contact() {
  const requestRef = useRef(null);
  const [values, setValues] = useState(createEmptyContactForm);
  const [errors, setErrors] = useState({});
  const [submitState, setSubmitState] = useState({ status: 'idle', message: '' });

  useEffect(() => () => requestRef.current?.abort(), []);

  const updateValue = (event) => {
    const { name, value } = event.target;
    const nextValues = { ...values, [name]: value };
    setValues(nextValues);

    if (errors[name]) {
      const nextError = validateContactForm(nextValues).errors[name];
      setErrors((current) => {
        const nextErrors = { ...current };
        if (nextError) nextErrors[name] = nextError;
        else delete nextErrors[name];
        return nextErrors;
      });
    }

    if (submitState.status !== 'idle' && submitState.status !== 'submitting') {
      setSubmitState({ status: 'idle', message: '' });
    }
  };

  const validateField = (event) => {
    const { name } = event.target;
    const nextError = validateContactForm(values).errors[name];
    setErrors((current) => {
      const nextErrors = { ...current };
      if (nextError) nextErrors[name] = nextError;
      else delete nextErrors[name];
      return nextErrors;
    });
  };

  const submitForm = async (event) => {
    event.preventDefault();
    if (submitState.status === 'submitting') return;

    const validation = validateContactForm(values);
    if (!validation.valid) {
      setErrors(validation.errors);
      setSubmitState({
        status: 'error',
        message: 'Some details need attention. Review the marked fields and submit again.',
      });
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    setErrors({});
    setSubmitState({ status: 'submitting', message: 'Sending your project brief…' });

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
        signal: controller.signal,
      });
      const responseBody = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (responseBody.errors && typeof responseBody.errors === 'object') {
          setErrors(responseBody.errors);
        }
        setSubmitState({
          status: 'error',
          message: responseBody.message
            || 'Your message could not be delivered. Try again or use the direct email option.',
        });
        return;
      }

      setValues(createEmptyContactForm());
      setErrors({});
      setSubmitState({
        status: 'success',
        message: responseBody.message || 'Your project brief was sent. We’ll reply by email.',
      });
    } catch (error) {
      if (error.name === 'AbortError') return;
      setSubmitState({
        status: 'error',
        message: 'Your request could not reach us. Check your connection and try again, or email us directly.',
      });
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const describedBy = (field, hintId) => (
    [hintId, errors[field] ? `contact-${field}-error` : ''].filter(Boolean).join(' ') || undefined
  );

  const isSubmitting = submitState.status === 'submitting';

  return (
    <section className="section contact contact--quiet" id="contact" data-quiet>
      <div className="text-plate">
        <p className="eyebrow"><SectionReveal as="span" direction="left">From idea to outcome</SectionReveal></p>
        <SectionReveal as="h2" direction="left" className="contact-line">Let&apos;s make</SectionReveal>
        <SectionReveal as="h2" direction="left" className="contact-line contact-line-accent" delay={0.08}>something rare.</SectionReveal>
        <SectionReveal className="contact-sub" direction="up" delay={0.1}>
          <p>Send us your brief. We&apos;ll give you a straight read on scope, timeline, cost, and the first move if it&apos;s a fit.</p>
        </SectionReveal>
      </div>
      <SectionReveal className="contact-form-wrap" direction="up" delay={0.1}>
        <form className="contact-form" onSubmit={submitForm} noValidate>
          <div className="contact-form-grid">
            <div className="contact-form-field">
              <label htmlFor="contact-name">Name <span className="contact-form-required">(required)</span></label>
              <input
                id="contact-name"
                name="name"
                type="text"
                value={values.name}
                onChange={updateValue}
                onBlur={validateField}
                autoComplete="name"
                maxLength={CONTACT_FIELD_LIMITS.name}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={describedBy('name')}
                required
              />
              {errors.name ? <p className="contact-form-error" id="contact-name-error">{errors.name}</p> : null}
            </div>

            <div className="contact-form-field">
              <label htmlFor="contact-email">Email <span className="contact-form-required">(required)</span></label>
              <input
                id="contact-email"
                name="email"
                type="email"
                value={values.email}
                onChange={updateValue}
                onBlur={validateField}
                autoComplete="email"
                inputMode="email"
                maxLength={CONTACT_FIELD_LIMITS.email}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={describedBy('email', 'contact-email-hint')}
                required
              />
              <p className="contact-form-hint" id="contact-email-hint">We&apos;ll only use this address to reply to your enquiry.</p>
              {errors.email ? <p className="contact-form-error" id="contact-email-error">{errors.email}</p> : null}
            </div>

            <div className="contact-form-field">
              <label htmlFor="contact-company">Company <span className="contact-form-optional">(optional)</span></label>
              <input
                id="contact-company"
                name="company"
                type="text"
                value={values.company}
                onChange={updateValue}
                onBlur={validateField}
                autoComplete="organization"
                maxLength={CONTACT_FIELD_LIMITS.company}
                aria-invalid={Boolean(errors.company)}
                aria-describedby={describedBy('company')}
              />
              {errors.company ? <p className="contact-form-error" id="contact-company-error">{errors.company}</p> : null}
            </div>

            <div className="contact-form-field">
              <label htmlFor="contact-budget">Budget <span className="contact-form-required">(required)</span></label>
              <select
                id="contact-budget"
                name="budget"
                value={values.budget}
                onChange={updateValue}
                onBlur={validateField}
                aria-invalid={Boolean(errors.budget)}
                aria-describedby={describedBy('budget', 'contact-budget-hint')}
                required
              >
                <option value="">Select a range</option>
                {CONTACT_BUDGETS.map((budget) => <option value={budget} key={budget}>{budget}</option>)}
              </select>
              <p className="contact-form-hint" id="contact-budget-hint">Choose the closest range; it helps us recommend the right scope.</p>
              {errors.budget ? <p className="contact-form-error" id="contact-budget-error">{errors.budget}</p> : null}
            </div>

            <div className="contact-form-field contact-form-field--wide">
              <label htmlFor="contact-brief">Project brief <span className="contact-form-required">(required)</span></label>
              <textarea
                id="contact-brief"
                name="brief"
                value={values.brief}
                onChange={updateValue}
                onBlur={validateField}
                rows={7}
                maxLength={CONTACT_FIELD_LIMITS.brief}
                aria-invalid={Boolean(errors.brief)}
                aria-describedby={describedBy('brief', 'contact-brief-hint')}
                required
              />
              <p className="contact-form-hint" id="contact-brief-hint">Share the goal, current state, timing, and what a strong outcome looks like.</p>
              {errors.brief ? <p className="contact-form-error" id="contact-brief-error">{errors.brief}</p> : null}
            </div>
          </div>

          <div className="contact-form-honeypot sr-only" aria-hidden="true">
            <label htmlFor="contact-website">Website</label>
            <input
              id="contact-website"
              name="website"
              type="text"
              value={values.website}
              onChange={updateValue}
              autoComplete="off"
              tabIndex={-1}
            />
          </div>

          <div className="contact-form-actions">
            <button
              className="btn btn-solid contact-form-submit"
              type="submit"
              aria-disabled={isSubmitting}
              aria-describedby={submitState.message ? 'contact-form-status' : undefined}
            >
              {isSubmitting ? 'Sending…' : 'Send project brief'}
            </button>
            <p className="contact-form-privacy">Your details are sent only when you press submit.</p>
          </div>

          {submitState.message ? (
            <p
              className={`contact-form-status contact-form-status--${submitState.status}`}
              id="contact-form-status"
              role={submitState.status === 'error' ? 'alert' : 'status'}
              aria-live="polite"
            >
              {submitState.message}
            </p>
          ) : null}
        </form>
      </SectionReveal>
      <SectionReveal className="contact-cta contact-cta--secondary" direction="up" delay={0.1}>
        <p className="contact-email-label">Prefer email?</p>
        <Magnetic strength={0.45}>
          <a
            href={`mailto:${SITE.email}`}
            className="btn btn-ghost contact-email"
            data-cursor="Write us"
          >
            {SITE.email}
          </a>
        </Magnetic>
      </SectionReveal>
      <SectionReveal as="footer" className="footer" direction="left" start="top 94%">
        <div className="footer-col">
          <p className="footer-label">Enquiry</p>
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          {SITE.phone && <a href={`tel:${SITE.phone.replace(/[^+\d]/g, '')}`}>{SITE.phone}</a>}
        </div>
        {SITE.socials.length > 0 && (
          <div className="footer-col">
            <p className="footer-label">Social</p>
            {SITE.socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer">{s.label}</a>
            ))}
          </div>
        )}
        <div className="footer-col">
          <p className="footer-label">Studio</p>
          <p>{SITE.city}</p>
          <p>Web, brand &amp; automation</p>
        </div>
        <p className="footer-bottom">
          © {new Date().getFullYear()} {SITE.name}. {SITE.tagline}
        </p>
      </SectionReveal>
    </section>
  );
}
