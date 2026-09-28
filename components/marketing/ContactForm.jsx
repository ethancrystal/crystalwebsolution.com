'use client';

import { useEffect, useRef, useState } from 'react';
import { SITE } from '../../lib/site';
import { blast } from '../../lib/pulse';
import { trackEvent } from '../../lib/analytics.mjs';
import {
  CONTACT_BUDGETS,
  CONTACT_FIELD_LIMITS,
  createEmptyContactForm,
  validateContactForm,
} from '../../lib/contactForm.mjs';
import { getHCaptchaSiteKey, HCAPTCHA_TOKEN_FIELD } from '../../lib/hcaptcha.mjs';
import HCaptcha from './HCaptcha';

const CAPTCHA_REQUIRED_MESSAGE = 'Please complete the security check before sending.';

// Reusable contact form extracted from components/sections/Contact.jsx.
// PRESENTATION REFACTOR ONLY (per the marketing plan, Contact Form Protection
// Condition): field names, required fields, length limits, honeypot, request
// payload, and success/error behavior are preserved exactly. The form posts to
// /api/contact exactly as the homepage version does. No Supabase table or
// schema is introduced.
export default function ContactForm({ variant = 'marketing' }) {
  const requestRef = useRef(null);
  const [values, setValues] = useState(createEmptyContactForm);
  const [errors, setErrors] = useState({});
  const [submitState, setSubmitState] = useState({ status: 'idle', message: '' });
  // hCaptcha: the widget hands us a one-shot token; the API verifies it with
  // HCAPTCHA_SECRET (lib/hcaptcha.mjs). `captchaReset` is bumped after a
  // successful send, or when the server rejects the token, so the widget
  // asks for a fresh solve.
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaReset, setCaptchaReset] = useState(0);
  // Set when js.hcaptcha.com never loads (ad blocker, proxy, vendor outage).
  // The server still requires a token once HCAPTCHA_SECRET is configured, so
  // the honest fallback is the direct email path, not a silent bypass.
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);
  const siteKey = getHCaptchaSiteKey();

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

    if (captchaUnavailable) {
      setSubmitState({
        status: 'error',
        message: `The security check could not load, so this form can’t send. Please email ${SITE.email} directly.`,
      });
      return;
    }

    if (!captchaToken) {
      setErrors((current) => ({ ...current, hcaptcha: CAPTCHA_REQUIRED_MESSAGE }));
      setSubmitState({ status: 'error', message: CAPTCHA_REQUIRED_MESSAGE });
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
        body: JSON.stringify({ ...validation.data, [HCAPTCHA_TOKEN_FIELD]: captchaToken }),
        signal: controller.signal,
      });
      const responseBody = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (responseBody.errors && typeof responseBody.errors === 'object') {
          setErrors(responseBody.errors);
        }
        // Tokens are single-use: whatever the server said, this one is spent.
        setCaptchaReset((count) => count + 1);
        setSubmitState({
          status: 'error',
          message:
            responseBody.message
            || 'Your message could not be delivered. Try again or use the direct email option.',
        });
        return;
      }

      // Fires only after the API accepts the brief, so the GA4 conversion
      // counts delivered leads rather than submit clicks. No PII is sent —
      // budget is a fixed enum from CONTACT_BUDGETS, not free text.
      trackEvent('generate_lead', { form_location: variant, budget: validation.data.budget });

      setValues(createEmptyContactForm());
      setErrors({});
      setCaptchaReset((count) => count + 1);
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

  const describedBy = (field, hintId) =>
    [hintId, errors[field] ? `contact-${field}-error` : ''].filter(Boolean).join(' ') || undefined;

  const isSubmitting = submitState.status === 'submitting';

  return (
    <form className={`contact-form contact-form--${variant}`} onSubmit={submitForm} noValidate>
      <div className="contact-form-grid">
        <div className="contact-form-field">
          <label htmlFor={`${variant}-name`}>Name <span className="contact-form-required">(required)</span></label>
          <input
            id={`${variant}-name`}
            name="name"
            type="text"
            value={values.name}
            onChange={updateValue}
            onBlur={validateField}
            onFocus={() => blast(0.5, 0.5)}
            autoComplete="name"
            maxLength={CONTACT_FIELD_LIMITS.name}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={describedBy('name')}
            required
          />
          {errors.name && <p className="contact-form-error" id={`${variant}-name-error`}>{errors.name}</p>}
        </div>

        <div className="contact-form-field">
          <label htmlFor={`${variant}-email`}>Email <span className="contact-form-required">(required)</span></label>
          <input
            id={`${variant}-email`}
            name="email"
            type="email"
            value={values.email}
            onChange={updateValue}
            onBlur={validateField}
            autoComplete="email"
            inputMode="email"
            maxLength={CONTACT_FIELD_LIMITS.email}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={describedBy('email', `${variant}-email-hint`)}
            required
          />
          <p className="contact-form-hint" id={`${variant}-email-hint`}>We’ll only use this address to reply to your enquiry.</p>
          {errors.email && <p className="contact-form-error" id={`${variant}-email-error`}>{errors.email}</p>}
        </div>

        <div className="contact-form-field">
          <label htmlFor={`${variant}-company`}>Company <span className="contact-form-optional">(optional)</span></label>
          <input
            id={`${variant}-company`}
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
          {errors.company && <p className="contact-form-error" id={`${variant}-company-error`}>{errors.company}</p>}
        </div>

        <div className="contact-form-field">
          <label htmlFor={`${variant}-budget`}>Budget <span className="contact-form-required">(required)</span></label>
          <select
            id={`${variant}-budget`}
            name="budget"
            value={values.budget}
            onChange={updateValue}
            onBlur={validateField}
            aria-invalid={Boolean(errors.budget)}
            aria-describedby={describedBy('budget', `${variant}-budget-hint`)}
            required
          >
            <option value="">Select a range</option>
            {CONTACT_BUDGETS.map((budget) => <option value={budget} key={budget}>{budget}</option>)}
          </select>
          <p className="contact-form-hint" id={`${variant}-budget-hint`}>Choose the closest range; it helps us recommend the right scope.</p>
          {errors.budget && <p className="contact-form-error" id={`${variant}-budget-error`}>{errors.budget}</p>}
        </div>

        <div className="contact-form-field contact-form-field--wide">
          <label htmlFor={`${variant}-brief`}>Project brief <span className="contact-form-required">(required)</span></label>
          <textarea
            id={`${variant}-brief`}
            name="brief"
            value={values.brief}
            onChange={updateValue}
            onBlur={validateField}
            rows={7}
            maxLength={CONTACT_FIELD_LIMITS.brief}
            aria-invalid={Boolean(errors.brief)}
            aria-describedby={describedBy('brief', `${variant}-brief-hint`)}
            required
          />
          <p className="contact-form-hint" id={`${variant}-brief-hint`}>Share the goal, current state, timing, and what a strong outcome looks like.</p>
          {errors.brief && <p className="contact-form-error" id={`${variant}-brief-error`}>{errors.brief}</p>}
        </div>
      </div>

      <div className="contact-form-honeypot sr-only" aria-hidden="true">
        <label htmlFor={`${variant}-website`}>Website</label>
        <input
          id={`${variant}-website`}
          name="website"
          type="text"
          value={values.website}
          onChange={updateValue}
          autoComplete="off"
          tabIndex={-1}
        />
      </div>

      <HCaptcha
        siteKey={siteKey}
        variant={variant}
        resetSignal={captchaReset}
        errorId={errors.hcaptcha ? `${variant}-hcaptcha-error` : undefined}
        onUnavailable={() => setCaptchaUnavailable(true)}
        onToken={(token) => {
          if (token) setCaptchaUnavailable(false);
          setCaptchaToken(token);
          if (token) {
            setErrors((current) => {
              if (!current.hcaptcha) return current;
              const next = { ...current };
              delete next.hcaptcha;
              return next;
            });
          }
        }}
      />
      {errors.hcaptcha && <p className="contact-form-error" id={`${variant}-hcaptcha-error`}>{errors.hcaptcha}</p>}
      {captchaUnavailable && !captchaToken && (
        <p className="contact-form-error" role="alert">
          The security check could not load (an ad blocker or network filter may be stopping it).
          You can still reach us at <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
        </p>
      )}

      <div className="contact-form-actions">
        <button
          className="btn btn-solid contact-form-submit"
          type="submit"
          aria-disabled={isSubmitting}
          aria-describedby={submitState.message ? `${variant}-form-status` : undefined}
        >
          {isSubmitting ? 'Sending…' : 'Send project brief'}
        </button>
        <p className="contact-form-privacy">Your details are sent only when you press submit.</p>
      </div>

      {submitState.message && (
        <p
          className={`contact-form-status contact-form-status--${submitState.status}`}
          id={`${variant}-form-status`}
          role={submitState.status === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {submitState.message}
        </p>
      )}
    </form>
  );
}
