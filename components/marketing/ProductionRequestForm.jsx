'use client';

import { useEffect, useRef, useState } from 'react';
import { SITE } from '../../lib/site';
import { blast } from '../../lib/pulse';
import { trackEvent } from '../../lib/analytics.mjs';
import {
  CONTACT_FIELD_LIMITS,
  PRODUCTION_CATEGORIES,
  PRODUCTION_FIELD_LIMITS,
  createEmptyProductionRequest,
  normalizeProductionRequest,
  validateProductionRequest,
} from '../../lib/contactForm.mjs';
import {
  ARTWORK_ACCEPT,
  ARTWORK_FORMATS_LABEL,
  ARTWORK_FORMATS_LIST,
  ARTWORK_LIMITS,
  formatBytes,
  validateArtworkFiles,
} from '../../lib/contactArtwork.mjs';
import { uploadContactArtwork } from '../../lib/uploadContactArtwork';
import { getHCaptchaSiteKey, HCAPTCHA_TOKEN_FIELD } from '../../lib/hcaptcha.mjs';
import HCaptcha from './HCaptcha';

const CAPTCHA_REQUIRED_MESSAGE = 'Please complete the security check before sending.';
const MAX_FILE_MB = ARTWORK_LIMITS.maxFileBytes / (1024 * 1024);
const MAX_TOTAL_MB = ARTWORK_LIMITS.maxTotalBytes / (1024 * 1024);

const declared = (files) => files.map((file) => ({ name: file.name, size: file.size }));
const sameFile = (a, b) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

// The homepage "production request" intake: what a patch, sticker or
// embroidery buyer sees instead of the web-project brief. It posts to the same
// /api/contact route as ContactForm, with `kind: 'production'` selecting the
// production validator (lib/contactForm.mjs). hCaptcha, the honeypot, the rate
// limit and the CRM write are all the route's, unchanged.
//
// Artwork: the visitor can attach up to three files (AI, EPS, PDF, PNG, JPG,
// DST) and/or paste a share link. Files go in two phases (migration 0053):
// /api/contact stores the request and returns signed upload URLs, then the
// browser uploads straight to private storage and asks the server to check
// and attach them. If any step fails the request is still delivered, and the
// success card names the files that did not arrive so they can be emailed.
//
// `draft` / `onDraftChange` let the parent keep what the visitor has typed when
// the intake switches to the other tab.
export default function ProductionRequestForm({ variant = 'production', draft, onDraftChange }) {
  const formRef = useRef(null);
  const successRef = useRef(null);
  const requestRef = useRef(null);
  const fileInputRef = useRef(null);
  const [values, setValues] = useState(() => draft?.values ?? createEmptyProductionRequest());
  const [files, setFiles] = useState(() => draft?.files ?? []);
  const [fileError, setFileError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitState, setSubmitState] = useState({ status: 'idle', message: '' });
  const [sent, setSent] = useState({ category: '', hadLink: false, attached: [], failed: [] });
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaReset, setCaptchaReset] = useState(0);
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);
  const siteKey = getHCaptchaSiteKey();

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    onDraftChange?.({ values, files });
  }, [values, files, onDraftChange]);

  useEffect(() => {
    if (submitState.status === 'success') successRef.current?.focus();
  }, [submitState.status]);

  const setFieldError = (name, nextError) => {
    setErrors((current) => {
      const nextErrors = { ...current };
      if (nextError) nextErrors[name] = nextError;
      else delete nextErrors[name];
      return nextErrors;
    });
  };

  const clearStaleStatus = () => {
    if (submitState.status !== 'idle' && submitState.status !== 'submitting') {
      setSubmitState({ status: 'idle', message: '' });
    }
  };

  const updateValue = (event) => {
    const { name, value } = event.target;
    const nextValues = { ...values, [name]: value };
    setValues(nextValues);

    if (errors[name]) setFieldError(name, validateProductionRequest(nextValues).errors[name]);
    clearStaleStatus();
  };

  const validateField = (event) => {
    const { name } = event.target;
    setFieldError(name, validateProductionRequest(values).errors[name]);
  };

  // Adds picked or dropped files one by one, keeping every file that fits the
  // limits and reporting the first one that does not.
  const addFiles = (picked) => {
    let accepted = files;
    let firstError = '';

    for (const file of picked) {
      if (accepted.some((existing) => sameFile(existing, file))) continue;
      const check = validateArtworkFiles(declared([...accepted, file]));
      if (check.error) {
        firstError ||= check.error;
      } else {
        accepted = [...accepted, file];
      }
    }

    setFiles(accepted);
    setFileError(firstError);
    clearStaleStatus();
  };

  const removeFile = (index) => {
    setFiles((current) => current.filter((_, position) => position !== index));
    setFileError('');
  };

  const onFilesPicked = (event) => {
    addFiles(Array.from(event.target.files ?? []));
    // Let the same file be picked again after removing it.
    event.target.value = '';
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer?.files ?? []));
  };

  const focusFirstInvalid = () => {
    window.requestAnimationFrame(() => {
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
    });
  };

  const submitForm = async (event) => {
    event.preventDefault();
    if (submitState.status === 'submitting') return;

    const candidate = { ...values, files: declared(files) };
    const validation = validateProductionRequest(candidate);
    if (!validation.valid) {
      setErrors(validation.errors);
      setSubmitState({
        status: 'error',
        message: 'Some details need attention. Review the marked fields and submit again.',
      });
      focusFirstInvalid();
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

    const request = normalizeProductionRequest(candidate);
    const controller = new AbortController();
    requestRef.current = controller;
    setErrors({});
    setSubmitState({ status: 'submitting', message: 'Sending your production request…' });

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, [HCAPTCHA_TOKEN_FIELD]: captchaToken }),
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
            || 'Your request could not be delivered. Try again or use the direct email option.',
        });
        return;
      }

      // The request is delivered. Upload the artwork, if any, and report what
      // arrived; a failure here never un-sends the request.
      let outcome = { attached: [], failed: [] };
      if (files.length > 0) {
        outcome = await uploadContactArtwork({
          artwork: responseBody.artwork,
          files,
          onProgress: (index, total) => setSubmitState({
            status: 'submitting',
            message: `Uploading artwork (${index} of ${total})…`,
          }),
        });
      }

      // Fires only after the API accepts the request. The category is a fixed
      // enum (PRODUCTION_CATEGORIES); no name, email, file name or free text
      // is sent.
      trackEvent('generate_lead', {
        form_location: 'home_production',
        category: request.category,
        artwork_files: outcome.attached.length,
      });

      setSent({
        category: request.category,
        hadLink: Boolean(request.artworkLink),
        attached: outcome.attached,
        failed: outcome.failed,
      });
      setValues(createEmptyProductionRequest());
      setFiles([]);
      setFileError('');
      setErrors({});
      setCaptchaToken('');
      setCaptchaReset((count) => count + 1);
      setSubmitState({
        status: 'success',
        message: responseBody.message || 'Your production request was sent.',
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
    [hintId, errors[field] ? `${variant}-${field}-error` : ''].filter(Boolean).join(' ') || undefined;

  const fieldError = (field) =>
    errors[field] && (
      <p className="pr-error" id={`${variant}-${field}-error`}>{errors[field]}</p>
    );

  const isSubmitting = submitState.status === 'submitting';
  const filesMessage = fileError || errors.files;

  if (submitState.status === 'success') {
    const mailto = <a href={`mailto:${SITE.email}`}>{SITE.email}</a>;
    const hadFiles = sent.attached.length + sent.failed.length > 0;

    return (
      <div
        className="pr-success"
        id={`${variant}-success`}
        role="status"
        aria-live="polite"
        tabIndex={-1}
        ref={successRef}
      >
        <p className="pr-success-kicker">REQUEST RECEIVED / {sent.category.toUpperCase()}</p>
        <p className="pr-success-line">Thank you. A specialist will review your artwork and reply with a mockup.</p>
        {sent.attached.length > 0 && (
          <p className="pr-success-note">Artwork received: {sent.attached.join(', ')}.</p>
        )}
        {sent.failed.length > 0 && (
          <p className="pr-success-note pr-success-note--warn">
            {sent.failed.length === 1 ? 'This file' : 'These files'} did not upload: {sent.failed.join(', ')}.
            Please email {sent.failed.length === 1 ? 'it' : 'them'} to {mailto} and we’ll match
            {sent.failed.length === 1 ? ' it' : ' them'} to this request.
          </p>
        )}
        {!hadFiles && !sent.hadLink && (
          <p className="pr-success-note">
            No artwork yet? Email the file ({ARTWORK_FORMATS_LIST.replace(' or ', ', ')}) to {mailto} and we’ll
            match it to this request.
          </p>
        )}
        <button
          type="button"
          className="pr-again"
          onClick={() => setSubmitState({ status: 'idle', message: '' })}
        >
          Send another request
        </button>
      </div>
    );
  }

  return (
    <form
      className={`contact-form contact-form--${variant} pr-form`}
      onSubmit={submitForm}
      noValidate
      ref={formRef}
    >
      <fieldset className="pr-chips" aria-describedby={errors.category ? `${variant}-category-error` : undefined}>
        <legend className="pr-label">WHAT ARE WE MAKING?</legend>
        <div className="pr-chip-row">
          {PRODUCTION_CATEGORIES.map((category) => (
            <label className="pr-chip" key={category}>
              <input
                type="radio"
                name="category"
                value={category}
                checked={values.category === category}
                onChange={updateValue}
              />
              <span className="pr-chip-face">{category}</span>
            </label>
          ))}
        </div>
        {fieldError('category')}
      </fieldset>

      <div className="pr-grid">
        <div className="pr-field">
          <label className="pr-label" htmlFor={`${variant}-name`}>NAME <span className="pr-note">(required)</span></label>
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
          {fieldError('name')}
        </div>

        <div className="pr-field">
          <label className="pr-label" htmlFor={`${variant}-email`}>EMAIL <span className="pr-note">(required)</span></label>
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
            aria-describedby={describedBy('email')}
            required
          />
          {fieldError('email')}
        </div>

        <div className="pr-field">
          <label className="pr-label" htmlFor={`${variant}-size`}>SIZE <span className="pr-note">(required)</span></label>
          <input
            id={`${variant}-size`}
            name="size"
            type="text"
            value={values.size}
            onChange={updateValue}
            onBlur={validateField}
            placeholder="e.g. 3.5 in wide"
            autoComplete="off"
            maxLength={PRODUCTION_FIELD_LIMITS.size}
            aria-invalid={Boolean(errors.size)}
            aria-describedby={describedBy('size')}
            required
          />
          {fieldError('size')}
        </div>

        <div className="pr-field">
          <label className="pr-label" htmlFor={`${variant}-quantity`}>QUANTITY <span className="pr-note">(required)</span></label>
          <input
            id={`${variant}-quantity`}
            name="quantity"
            type="text"
            value={values.quantity}
            onChange={updateValue}
            onBlur={validateField}
            placeholder="Any — no minimum"
            autoComplete="off"
            maxLength={PRODUCTION_FIELD_LIMITS.quantity}
            aria-invalid={Boolean(errors.quantity)}
            aria-describedby={describedBy('quantity')}
            required
          />
          {fieldError('quantity')}
        </div>
      </div>

      <div
        className={`pr-artwork${dragging ? ' pr-artwork--drag' : ''}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div className="pr-artwork-head">
          <span className="pr-artwork-title">Artwork <span className="pr-note">(optional)</span></span>
          <span className="pr-artwork-formats" aria-hidden="true">{ARTWORK_FORMATS_LABEL}</span>
        </div>

        <label className="pr-attach" htmlFor={`${variant}-files`}>
          <span className="pr-attach-text">
            {files.length > 0 ? 'Add more files' : 'Attach artwork'}
            <span className="pr-attach-sub">or drag files here</span>
          </span>
          <span className="pr-attach-tag" aria-hidden="true">ATTACH</span>
          <input
            id={`${variant}-files`}
            ref={fileInputRef}
            className="pr-attach-input"
            type="file"
            multiple
            accept={ARTWORK_ACCEPT}
            onChange={onFilesPicked}
            aria-invalid={Boolean(filesMessage)}
            aria-describedby={[`${variant}-files-hint`, filesMessage ? `${variant}-files-error` : ''].filter(Boolean).join(' ')}
          />
        </label>
        <p className="pr-hint" id={`${variant}-files-hint`}>
          Up to {ARTWORK_LIMITS.maxFiles} files, {MAX_FILE_MB} MB each ({MAX_TOTAL_MB} MB together):{' '}
          {ARTWORK_FORMATS_LIST}.
        </p>
        {filesMessage && <p className="pr-error" id={`${variant}-files-error`} role="alert">{filesMessage}</p>}

        {files.length > 0 && (
          <ul className="pr-files" aria-label="Attached files">
            {files.map((file, index) => (
              <li className="pr-file" key={`${file.name}-${file.size}-${file.lastModified}`}>
                <span className="pr-file-name">{file.name}</span>
                <span className="pr-file-size">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  className="pr-file-remove"
                  onClick={() => removeFile(index)}
                  aria-label={`Remove ${file.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <label className="pr-artwork-title pr-artwork-link-label" htmlFor={`${variant}-artworkLink`}>
          Or paste a link <span className="pr-note">(optional)</span>
        </label>
        <input
          id={`${variant}-artworkLink`}
          name="artworkLink"
          type="text"
          inputMode="url"
          value={values.artworkLink}
          onChange={updateValue}
          onBlur={validateField}
          placeholder="Drive, Dropbox or WeTransfer link"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={PRODUCTION_FIELD_LIMITS.artworkLink}
          aria-invalid={Boolean(errors.artworkLink)}
          aria-describedby={describedBy('artworkLink')}
        />
        {fieldError('artworkLink')}
        <p className="pr-hint">
          No artwork yet? Leave both blank and email it to <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
        </p>
      </div>

      <div className="pr-field">
        <label className="pr-label" htmlFor={`${variant}-notes`}>NOTES <span className="pr-note">(optional)</span></label>
        <textarea
          id={`${variant}-notes`}
          name="notes"
          value={values.notes}
          onChange={updateValue}
          onBlur={validateField}
          rows={3}
          placeholder="Fabric, placement, deadline…"
          maxLength={PRODUCTION_FIELD_LIMITS.notes}
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={describedBy('notes')}
        />
        {fieldError('notes')}
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
      {errors.hcaptcha && <p className="pr-error" id={`${variant}-hcaptcha-error`}>{errors.hcaptcha}</p>}
      {captchaUnavailable && !captchaToken && (
        <p className="pr-error" role="alert">
          The security check could not load (an ad blocker or network filter may be stopping it).
          You can still reach us at <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
        </p>
      )}

      <div className="pr-actions">
        <button
          className="pr-submit"
          type="submit"
          aria-disabled={isSubmitting}
          aria-describedby={submitState.message ? `${variant}-form-status` : undefined}
        >
          {isSubmitting ? 'Sending…' : 'Send production request'}
          <span className="pr-submit-arrow" aria-hidden="true">→</span>
        </button>
        <p className="pr-privacy">Your details are sent only when you press submit.</p>
      </div>

      {submitState.message && (
        <p
          className={`pr-status pr-status--${submitState.status}`}
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
