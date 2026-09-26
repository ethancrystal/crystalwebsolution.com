'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { Tick02Icon } from '@hugeicons/core-free-icons';
import {
  FIELD_LIMITS,
  briefDisplayTitle,
  briefSections,
  getBriefTemplate,
  isEmptyAnswer,
  missingRequiredAnswers,
} from '@/lib/crm/brief-templates.mjs';
import { saveBriefDraft, submitBrief } from '@/app/actions/brief-actions';
import { BRIEF_ICONS } from '@/components/crm/briefIcons';

const AUTOSAVE_DELAY_MS = 900;

function formatSavedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function FieldInput({ field, value, onChange, invalid }) {
  const id = `brief-field-${field.id}`;
  const describedBy = [field.help ? `${id}-help` : null, invalid ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;

  if (field.type === 'textarea') {
    const text = value ?? '';
    return (
      <>
        <textarea
          id={id}
          rows={4}
          value={text}
          maxLength={FIELD_LIMITS.textarea}
          placeholder={field.placeholder}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        {text.length > FIELD_LIMITS.textarea * 0.8 && (
          <span className="bw-counter">{text.length} / {FIELD_LIMITS.textarea}</span>
        )}
      </>
    );
  }

  if (field.type === 'select') {
    return (
      <div className="bw-chips" role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={describedBy}>
        {field.options.map((option) => (
          <label key={option.value} className={`bw-chip ${value === option.value ? 'is-on' : ''}`}>
            <input
              type="radio"
              name={id}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              onClick={() => { if (value === option.value) onChange(''); }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    );
  }

  if (field.type === 'multi') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="bw-chips" role="group" aria-labelledby={`${id}-label`} aria-describedby={describedBy}>
        {field.options.map((option) => {
          const on = selected.includes(option.value);
          return (
            <label key={option.value} className={`bw-chip ${on ? 'is-on' : ''}`}>
              <input
                type="checkbox"
                value={option.value}
                checked={on}
                onChange={() =>
                  onChange(on ? selected.filter((item) => item !== option.value) : [...selected, option.value])
                }
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (field.type === 'scale') {
    const set = Number.isInteger(value);
    return (
      <div className="bw-scale">
        <span className="bw-scale-end" aria-hidden="true">{field.left}</span>
        <input
          id={id}
          type="range"
          min={1}
          max={5}
          step={1}
          value={set ? value : 3}
          className={set ? 'is-set' : ''}
          aria-valuetext={set ? undefined : 'No preference'}
          aria-describedby={describedBy}
          onChange={(event) => onChange(Number.parseInt(event.target.value, 10))}
        />
        <span className="bw-scale-end bw-scale-end-right" aria-hidden="true">{field.right}</span>
        <span className="bw-scale-tail">
          {set ? (
            <button type="button" className="bw-link" onClick={() => onChange(null)}>
              Clear<span className="sr-only"> {field.label}</span>
            </button>
          ) : (
            <span className="bw-scale-hint">No preference</span>
          )}
        </span>
      </div>
    );
  }

  const inputType = field.type === 'url' ? 'url' : field.type === 'date' ? 'date' : 'text';
  return (
    <input
      id={id}
      type={inputType}
      value={value ?? ''}
      maxLength={field.type === 'url' ? FIELD_LIMITS.url : field.type === 'text' ? FIELD_LIMITS.text : undefined}
      placeholder={field.placeholder ?? (field.type === 'url' ? 'https://' : undefined)}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export default function BriefWizard({ brief, projects = [] }) {
  const router = useRouter();
  const template = getBriefTemplate(brief.brief_type);
  const steps = template.steps;
  const reviewIndex = steps.length;

  const [answers, setAnswers] = useState(() => brief.answers ?? {});
  const [stepIndex, setStepIndex] = useState(0);
  const [saveState, setSaveState] = useState({ status: 'saved', savedAt: brief.updated_at });
  const [showMissing, setShowMissing] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openProjects = projects.filter((project) => project.status !== 'cancelled');
  // A draft started from a project page defaults to that project, unless it
  // has since been cancelled -- then the client picks a new destination.
  const attachedOpen = openProjects.some((project) => project.id === brief.project_id);
  const startedFromClosedProject = Boolean(brief.project_id) && !attachedOpen;
  const [destination, setDestination] = useState(() => ({
    mode: attachedOpen ? 'attach' : 'new',
    projectId: attachedOpen ? brief.project_id : (openProjects[0]?.id ?? ''),
    projectTitle: '',
    targetDate: '',
  }));

  const answersRef = useRef(answers);
  const dirtyRef = useRef(false);
  const timerRef = useRef(null);
  const headingRef = useRef(null);
  const inflightRef = useRef(null);
  const lastSaveOkRef = useRef(true);
  const failuresRef = useRef(0);
  // Set by a non-retryable failure (validation, auth, deleted draft): stop
  // the automatic retries until the client edits again.
  const stoppedRef = useRef(false);
  const flushRef = useRef(null);

  // Saves the latest answers. Resolves true when the answers as of the end
  // of the call are stored, false otherwise. Safe to call concurrently: only
  // one request is ever in flight and every caller waits for it.
  const flush = useCallback(async () => {
    clearTimeout(timerRef.current);
    while (inflightRef.current) await inflightRef.current;
    if (!dirtyRef.current) return lastSaveOkRef.current;

    dirtyRef.current = false;
    setSaveState((prev) => ({ ...prev, status: 'saving' }));

    const formData = new FormData();
    formData.set('briefId', brief.id);
    formData.set('answers', JSON.stringify(answersRef.current));

    const request = (async () => {
      let saved = false;
      try {
        const result = await saveBriefDraft(formData);
        if (result.ok) {
          saved = true;
          failuresRef.current = 0;
          setSaveState({ status: 'saved', savedAt: result.data.savedAt });
        } else {
          // A submitted brief has nothing left to save.
          if (!result.submitted) dirtyRef.current = true;
          if (result.retryable === false) stoppedRef.current = true;
          failuresRef.current += 1;
          setSaveState((prev) => ({ ...prev, status: 'error', message: result.error }));
        }
      } catch {
        dirtyRef.current = true;
        failuresRef.current += 1;
        setSaveState((prev) => ({ ...prev, status: 'error', message: 'Connection lost. Retrying…' }));
      }
      lastSaveOkRef.current = saved;
      inflightRef.current = null;
      return saved;
    })();

    inflightRef.current = request;
    const saved = await request;

    // Edits typed during the request get their own save; failures back off
    // exponentially (capped at a minute) and stop when not retryable.
    if (dirtyRef.current && !stoppedRef.current) {
      const delay = saved
        ? AUTOSAVE_DELAY_MS
        : Math.min(AUTOSAVE_DELAY_MS * 2 ** failuresRef.current, 60_000);
      timerRef.current = setTimeout(() => flushRef.current?.(), delay);
    }
    return saved && !dirtyRef.current;
  }, [brief.id]);
  flushRef.current = flush;

  const updateAnswer = useCallback(
    (fieldId, value) => {
      setAnswers((prev) => {
        const next = { ...prev };
        if (isEmptyAnswer(value)) delete next[fieldId];
        else next[fieldId] = value;
        answersRef.current = next;
        return next;
      });
      dirtyRef.current = true;
      stoppedRef.current = false;
      setSaveState((prev) => (prev.status === 'saving' ? prev : { ...prev, status: 'pending' }));
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => flushRef.current?.(), AUTOSAVE_DELAY_MS);
    },
    [],
  );

  useEffect(() => {
    function warnIfUnsaved(event) {
      if (!dirtyRef.current && !inflightRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', warnIfUnsaved);
    return () => {
      window.removeEventListener('beforeunload', warnIfUnsaved);
      clearTimeout(timerRef.current);
      // In-app navigation (e.g. the "Dashboard" link) unmounts without
      // beforeunload: save pending edits now instead of dropping them.
      if (dirtyRef.current && !stoppedRef.current) flushRef.current?.();
    };
  }, []);

  const goTo = useCallback(
    (index) => {
      flush();
      setStepIndex(index);
      if (index === reviewIndex) setShowMissing(true);
      // Move focus to the new step heading for keyboard and screen-reader users.
      requestAnimationFrame(() => headingRef.current?.focus());
    },
    [flush, reviewIndex],
  );

  const missing = useMemo(() => missingRequiredAnswers(brief.brief_type, answers), [brief.brief_type, answers]);
  const missingIds = useMemo(() => new Set(missing.map((item) => item.fieldId)), [missing]);
  const sections = useMemo(() => briefSections(brief.brief_type, answers), [brief.brief_type, answers]);
  const stepComplete = (step) =>
    step.fields.some((field) => !isEmptyAnswer(answers[field.id])) &&
    step.fields.every((field) => !field.required || !missingIds.has(field.id));

  const suggestedTitle = briefDisplayTitle(brief.brief_type, answers);
  const suggestedDate = answers.deadline || answers.start_date || '';

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError(null);

    if (missing.length > 0) {
      setShowMissing(true);
      setSubmitError('A few required questions still need an answer.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Force a save of the exact answers being submitted and wait for it
      // (including any save already in flight) before submitting.
      dirtyRef.current = true;
      stoppedRef.current = false;
      const saved = await flush();
      if (!saved) {
        setSubmitError('We could not save your latest answers. Check your connection and try again.');
        return;
      }

      const formData = new FormData();
      formData.set('briefId', brief.id);
      formData.set('destination', destination.mode);
      if (destination.mode === 'attach') {
        formData.set('projectId', destination.projectId);
      } else {
        formData.set('projectTitle', destination.projectTitle || suggestedTitle);
        formData.set('targetDate', destination.targetDate || suggestedDate);
      }

      const result = await submitBrief(formData);
      if (!result.ok) {
        setSubmitError(result.error || 'Unable to submit the brief.');
        if (result.missing?.length) setShowMissing(true);
        return;
      }

      router.push(`/dashboard/projects/${result.data.projectId}?brief=submitted`);
    } catch {
      setSubmitError('Unable to submit the brief. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const step = steps[stepIndex];
  const progress = Math.round((Math.min(stepIndex, reviewIndex) / reviewIndex) * 100);
  const saveLabel =
    saveState.status === 'saving' || saveState.status === 'pending'
      ? 'Saving…'
      : saveState.status === 'error'
        ? saveState.message || 'Not saved'
        : saveState.savedAt
          ? `Saved ${formatSavedAt(saveState.savedAt)}`
          : 'Saved';

  return (
    <div className="bw">
      <header className="bw-head">
        <span className="bw-icon" aria-hidden="true">
          <HugeiconsIcon icon={BRIEF_ICONS[brief.brief_type]} size={22} />
        </span>
        <div className="bw-head-text">
          <p className="bw-eyebrow">{template.label} brief</p>
          <p className="bw-title">{suggestedTitle}</p>
        </div>
        <p className={`bw-save is-${saveState.status}`} role="status" aria-live="polite">
          {saveLabel}
        </p>
      </header>

      <div
        className="bw-progress"
        role="progressbar"
        aria-label="Brief progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="bw-body">
        <nav className="bw-steps" aria-label="Brief sections">
          <ol>
            {steps.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`bw-step ${index === stepIndex ? 'is-current' : ''}`}
                  aria-current={index === stepIndex ? 'step' : undefined}
                  onClick={() => goTo(index)}
                >
                  <span className={`bw-step-dot ${stepComplete(item) ? 'is-done' : ''}`} aria-hidden="true">
                    {stepComplete(item) ? <HugeiconsIcon icon={Tick02Icon} size={12} /> : index + 1}
                  </span>
                  <span>{item.title}</span>
                  {stepComplete(item) && <span className="sr-only"> (complete)</span>}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className={`bw-step ${stepIndex === reviewIndex ? 'is-current' : ''}`}
                aria-current={stepIndex === reviewIndex ? 'step' : undefined}
                onClick={() => goTo(reviewIndex)}
              >
                <span className="bw-step-dot" aria-hidden="true">✓</span>
                <span>Review & submit</span>
              </button>
            </li>
          </ol>
        </nav>

        <section className="bw-panel">
          {step ? (
            <>
              <h2 ref={headingRef} tabIndex={-1} className="bw-step-title">
                <span className="bw-step-count">Step {stepIndex + 1} of {steps.length}</span>
                {step.title}
              </h2>
              {step.intro && <p className="bw-intro">{step.intro}</p>}

              <div className="bw-fields">
                {step.fields.map((field) => {
                  const invalid = showMissing && missingIds.has(field.id);
                  const id = `brief-field-${field.id}`;
                  const isGroup = field.type === 'select' || field.type === 'multi';
                  return (
                    <div key={field.id} className={`bw-field ${invalid ? 'is-invalid' : ''}`}>
                      {isGroup ? (
                        <p id={`${id}-label`} className="bw-label">
                          {field.label}
                          {field.required && <span className="bw-req"> *<span className="sr-only">required</span></span>}
                        </p>
                      ) : (
                        <label id={`${id}-label`} htmlFor={id} className="bw-label">
                          {field.label}
                          {field.required && <span className="bw-req"> *<span className="sr-only">required</span></span>}
                        </label>
                      )}
                      {field.help && <p id={`${id}-help`} className="bw-help">{field.help}</p>}
                      <FieldInput
                        field={field}
                        value={answers[field.id]}
                        invalid={invalid}
                        onChange={(value) => updateAnswer(field.id, value)}
                      />
                      {invalid && <p id={`${id}-error`} className="bw-error-text">This one is required.</p>}
                    </div>
                  );
                })}
              </div>

              <div className="bw-actions">
                <button type="button" className="bw-btn bw-btn-ghost" onClick={() => goTo(stepIndex - 1)} disabled={stepIndex === 0}>
                  Back
                </button>
                <button type="button" className="bw-btn" onClick={() => goTo(stepIndex + 1)}>
                  {stepIndex === steps.length - 1 ? 'Review answers' : 'Next'}
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <h2 ref={headingRef} tabIndex={-1} className="bw-step-title">Review & submit</h2>
              <p className="bw-intro">Check your answers. You can jump back to any section to change them.</p>

              {missing.length > 0 && (
                <div className="bw-missing" role="alert">
                  <p>Still needed before you can submit:</p>
                  <ul>
                    {missing.map((item) => (
                      <li key={item.fieldId}>
                        <button
                          type="button"
                          className="bw-link"
                          onClick={() => goTo(steps.findIndex((candidate) => candidate.id === item.stepId))}
                        >
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {sections.length === 0 ? (
                <p className="bw-help">Nothing answered yet.</p>
              ) : (
                sections.map((section) => (
                  <div key={section.id} className="bw-review-section">
                    <div className="bw-review-head">
                      <h3>{section.title}</h3>
                      <button
                        type="button"
                        className="bw-link"
                        onClick={() => goTo(steps.findIndex((candidate) => candidate.id === section.id))}
                      >
                        Edit<span className="sr-only"> {section.title}</span>
                      </button>
                    </div>
                    <dl>
                      {section.rows.map((row) => (
                        <div key={row.id} className="bw-review-row">
                          <dt>{row.label}</dt>
                          <dd>{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))
              )}

              <fieldset className="bw-destination">
                <legend>Where should this brief go?</legend>
                {startedFromClosedProject && (
                  <p className="bw-help bw-destination-note">
                    The project this brief was started from is no longer open. Choose where it should go.
                  </p>
                )}
                <label className={`bw-chip ${destination.mode === 'new' ? 'is-on' : ''}`}>
                  <input
                    type="radio"
                    name="destination"
                    checked={destination.mode === 'new'}
                    onChange={() => setDestination((prev) => ({ ...prev, mode: 'new' }))}
                  />
                  <span>Start a new project</span>
                </label>
                {openProjects.length > 0 && (
                  <label className={`bw-chip ${destination.mode === 'attach' ? 'is-on' : ''}`}>
                    <input
                      type="radio"
                      name="destination"
                      checked={destination.mode === 'attach'}
                      onChange={() => setDestination((prev) => ({ ...prev, mode: 'attach' }))}
                    />
                    <span>Add to an existing project</span>
                  </label>
                )}

                {destination.mode === 'new' ? (
                  <div className="bw-destination-grid">
                    <div className="bw-field">
                      <label htmlFor="bw-project-title" className="bw-label">Project name</label>
                      <input
                        id="bw-project-title"
                        type="text"
                        maxLength={120}
                        value={destination.projectTitle}
                        placeholder={suggestedTitle}
                        onChange={(event) => setDestination((prev) => ({ ...prev, projectTitle: event.target.value }))}
                      />
                    </div>
                    <div className="bw-field">
                      <label htmlFor="bw-target-date" className="bw-label">Target date</label>
                      <input
                        id="bw-target-date"
                        type="date"
                        value={destination.targetDate || suggestedDate}
                        onChange={(event) => setDestination((prev) => ({ ...prev, targetDate: event.target.value }))}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bw-field">
                    <label htmlFor="bw-project" className="bw-label">Project</label>
                    <select
                      id="bw-project"
                      value={destination.projectId}
                      onChange={(event) => setDestination((prev) => ({ ...prev, projectId: event.target.value }))}
                    >
                      {openProjects.map((project) => (
                        <option key={project.id} value={project.id}>{project.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </fieldset>

              {submitError && <p className="bw-submit-error" role="alert">{submitError}</p>}

              <div className="bw-actions">
                <button type="button" className="bw-btn bw-btn-ghost" onClick={() => goTo(steps.length - 1)}>
                  Back
                </button>
                <button type="submit" className="bw-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting…' : 'Submit brief'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      <style jsx>{`
        .bw {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .bw-head {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          flex-wrap: wrap;
        }
        .bw-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.75rem;
          height: 2.75rem;
          border-radius: 10px;
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.25);
          color: #64c8ff;
          flex-shrink: 0;
        }
        .bw-head-text {
          flex: 1;
          min-width: 12rem;
        }
        .bw-eyebrow {
          color: #999;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .bw-title {
          color: #e0e0e0;
          font-size: 1.15rem;
          font-weight: 600;
        }
        .bw-save {
          font-size: 0.85rem;
          color: #8fd6a8;
        }
        .bw-save.is-saving,
        .bw-save.is-pending {
          color: #999;
        }
        .bw-save.is-error {
          color: #ff9999;
        }
        .bw-progress {
          height: 4px;
          background: rgba(100, 200, 255, 0.1);
          border-radius: 999px;
          overflow: hidden;
        }
        .bw-progress span {
          display: block;
          height: 100%;
          background: linear-gradient(90deg, #64c8ff, #8a7dff);
          transition: width 0.3s ease;
        }
        .bw-body {
          display: grid;
          grid-template-columns: minmax(0, 14rem) minmax(0, 1fr);
          gap: 1.25rem;
          align-items: start;
        }
        .bw-steps ol {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          position: sticky;
          top: 6rem;
        }
        .bw-step {
          /* Contains the absolutely positioned .sr-only label so it scrolls
             with the step list instead of widening the page on mobile. */
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          width: 100%;
          text-align: left;
          background: none;
          border: 1px solid transparent;
          border-radius: 8px;
          padding: 0.55rem 0.7rem;
          color: #aab;
          font: inherit;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .bw-step:hover {
          color: #e0e0e0;
          background: rgba(100, 200, 255, 0.05);
        }
        .bw-step.is-current {
          color: #e0e0e0;
          border-color: rgba(100, 200, 255, 0.3);
          background: rgba(100, 200, 255, 0.08);
        }
        .bw-step-dot {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.4rem;
          height: 1.4rem;
          border-radius: 999px;
          border: 1px solid rgba(100, 200, 255, 0.3);
          font-size: 0.72rem;
          flex-shrink: 0;
        }
        .bw-step-dot.is-done {
          background: #64c8ff;
          border-color: #64c8ff;
          color: #0a0e27;
        }
        .bw-panel {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.12);
          border-radius: 12px;
          padding: 1.5rem;
          min-width: 0;
        }
        .bw-step-title {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          font-size: 1.35rem;
          color: #64c8ff;
          outline: none;
        }
        .bw-step-count {
          color: #999;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 500;
        }
        .bw-intro {
          color: #aab;
          margin: 0.4rem 0 1.25rem;
        }
        .bw-fields {
          display: flex;
          flex-direction: column;
          gap: 1.35rem;
        }
        .bw-field {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .bw-label {
          color: #d6dbe8;
          font-size: 0.95rem;
          font-weight: 500;
        }
        .bw-req {
          color: #64c8ff;
        }
        .bw-help {
          color: #999;
          font-size: 0.85rem;
        }
        .bw-field :global(input[type='text']),
        .bw-field :global(input[type='url']),
        .bw-field :global(input[type='date']),
        .bw-field :global(select),
        .bw-field :global(textarea) {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 8px;
          padding: 0.7rem 0.9rem;
          color: #e0e0e0;
          font-size: 0.95rem;
          font-family: inherit;
          width: 100%;
        }
        .bw-field :global(textarea) {
          resize: vertical;
          min-height: 6rem;
        }
        .bw-field :global(input:focus-visible),
        .bw-field :global(select:focus-visible),
        .bw-field :global(textarea:focus-visible) {
          outline: 2px solid rgba(100, 200, 255, 0.6);
          outline-offset: 1px;
        }
        .bw-field.is-invalid :global(input),
        .bw-field.is-invalid :global(textarea),
        .bw-field.is-invalid :global(.bw-chips) {
          border-color: rgba(255, 120, 120, 0.6);
        }
        .bw-error-text {
          color: #ff9999;
          font-size: 0.82rem;
        }
        .bw :global(.bw-counter) {
          align-self: flex-end;
          color: #999;
          font-size: 0.75rem;
        }
        .bw :global(.bw-chips) {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          border: 1px solid transparent;
          border-radius: 10px;
        }
        .bw :global(.bw-chip) {
          position: relative;
          display: inline-flex;
          align-items: center;
          padding: 0.5rem 0.85rem;
          border-radius: 999px;
          border: 1px solid rgba(100, 200, 255, 0.22);
          background: rgba(15, 20, 40, 0.6);
          color: #cfd5e3;
          font-size: 0.88rem;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .bw :global(.bw-chip:hover) {
          border-color: rgba(100, 200, 255, 0.5);
        }
        .bw :global(.bw-chip.is-on) {
          background: rgba(100, 200, 255, 0.16);
          border-color: #64c8ff;
          color: #fff;
        }
        .bw :global(.bw-chip input) {
          position: absolute;
          opacity: 0;
          inset: 0;
          margin: 0;
          cursor: pointer;
        }
        .bw :global(.bw-chip:has(input:focus-visible)) {
          outline: 2px solid rgba(100, 200, 255, 0.7);
          outline-offset: 2px;
        }
        .bw :global(.bw-scale) {
          display: grid;
          grid-template-columns: minmax(4.5rem, auto) minmax(6rem, 1fr) minmax(4.5rem, auto) 6.5rem;
          align-items: center;
          gap: 0.75rem;
        }
        .bw :global(.bw-scale input[type='range']) {
          width: 100%;
          accent-color: #64c8ff;
          opacity: 0.45;
        }
        .bw :global(.bw-scale input[type='range'].is-set) {
          opacity: 1;
        }
        .bw :global(.bw-scale-end) {
          color: #aab;
          font-size: 0.85rem;
        }
        .bw :global(.bw-scale-end-right) {
          text-align: right;
        }
        .bw :global(.bw-scale-tail) {
          position: relative;
          text-align: right;
        }
        .bw :global(.bw-scale-hint) {
          color: #777;
          font-size: 0.8rem;
        }
        .bw :global(.bw-link) {
          text-align: left;
          background: none;
          border: none;
          padding: 0;
          color: #64c8ff;
          font: inherit;
          font-size: 0.85rem;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .bw-actions {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          margin-top: 1.75rem;
        }
        .bw-btn {
          background: linear-gradient(135deg, #64c8ff 0%, #5bb8ff 100%);
          color: #0a0e27;
          padding: 0.7rem 1.4rem;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .bw-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(100, 200, 255, 0.3);
        }
        .bw-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .bw-btn-ghost {
          background: transparent;
          color: #64c8ff;
          border: 1px solid rgba(100, 200, 255, 0.3);
        }
        .bw-missing {
          background: rgba(255, 200, 100, 0.08);
          border: 1px solid rgba(255, 200, 100, 0.25);
          color: #ffd08a;
          border-radius: 8px;
          padding: 0.9rem 1rem;
          margin-bottom: 1.25rem;
        }
        .bw-missing ul {
          margin: 0.5rem 0 0;
          padding-left: 1.1rem;
        }
        .bw-review-section {
          border-top: 1px solid rgba(100, 200, 255, 0.1);
          padding: 1rem 0;
        }
        .bw-review-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }
        .bw-review-head h3 {
          font-size: 1rem;
          color: #e0e0e0;
        }
        .bw-review-row {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
          gap: 1rem;
          padding: 0.35rem 0;
          font-size: 0.9rem;
        }
        .bw-review-row dt {
          color: #999;
        }
        .bw-review-row dd {
          margin: 0;
          color: #e0e0e0;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        .bw-destination {
          border: 1px solid rgba(100, 200, 255, 0.15);
          border-radius: 10px;
          padding: 1rem;
          margin: 1rem 0 0;
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
        }
        .bw-destination legend {
          color: #d6dbe8;
          font-weight: 500;
          padding: 0 0.35rem;
        }
        .bw-destination > .bw-field,
        .bw-destination-note,
        .bw-destination-grid {
          flex-basis: 100%;
        }
        .bw-destination-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
          gap: 1rem;
          margin-top: 0.5rem;
        }
        .bw-submit-error {
          color: #ff9999;
          margin-top: 1rem;
        }
        .bw :global(.sr-only) {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        @media (max-width: 760px) {
          .bw-body {
            grid-template-columns: minmax(0, 1fr);
          }
          .bw-steps ol {
            position: static;
            flex-direction: row;
            overflow-x: auto;
            gap: 0.35rem;
            padding-bottom: 0.25rem;
          }
          .bw-step {
            white-space: nowrap;
            width: auto;
          }
          .bw-panel {
            padding: 1.1rem;
          }
          .bw-review-row {
            grid-template-columns: minmax(0, 1fr);
            gap: 0.15rem;
          }
          .bw :global(.bw-scale) {
            grid-template-columns: auto minmax(0, 1fr) auto;
            row-gap: 0.2rem;
          }
          .bw :global(.bw-scale-tail) {
            grid-column: 1 / -1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .bw-progress span,
          .bw-btn,
          .bw :global(.bw-chip) {
            transition: none;
          }
          .bw-btn:hover:not(:disabled) {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
