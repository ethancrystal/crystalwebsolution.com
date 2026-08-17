'use client';

import { useMemo, useState } from 'react';
import { PROJECT_TYPE_OPTIONS } from '@/lib/projectTypes';
import { createProject } from '@/app/actions/project-actions';
import {
  QUESTIONNAIRES,
  isQuestionVisible,
  validateQuestionnaireResponses,
} from '@/lib/crm/questionnaires.mjs';

function fieldValue(value, type) {
  if (type === 'multiselect') return Array.isArray(value) ? value : [];
  return value ?? '';
}

function renderQuestion(question, responses, setResponses) {
  const value = fieldValue(responses[question.id], question.type);
  const update = (nextValue) => setResponses((current) => ({ ...current, [question.id]: nextValue }));
  const inputId = `brief-question-${question.id}`;

  if (question.type === 'textarea') {
    return <textarea id={inputId} rows={4} value={value} onChange={(event) => update(event.target.value)} />;
  }

  if (question.type === 'select') {
    return (
      <select id={inputId} value={value} onChange={(event) => update(event.target.value)}>
        <option value="">Select an option...</option>
        {question.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    );
  }

  if (question.type === 'multiselect') {
    return (
      <div className="brief-options" role="group" aria-label={question.label}>
        {question.options.map((option) => (
          <label key={option.value} className="brief-option">
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              onChange={(event) => update(
                event.target.checked
                  ? [...value, option.value]
                  : value.filter((item) => item !== option.value),
              )}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === 'file') {
    return <input id={inputId} type="file" multiple={question.multiple} onChange={(event) => update([...event.target.files])} />;
  }

  return <input id={inputId} type={question.type} value={value} onChange={(event) => update(event.target.value)} />;
}

export default function BriefSubmissionForm({ hasCompany, onCreated }) {
  const [briefForm, setBriefForm] = useState({
    title: '',
    description: '',
    target_date: '',
    project_type: '',
  });
  const [responses, setResponses] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const questionnaire = useMemo(() => QUESTIONNAIRES[briefForm.project_type] ?? null, [briefForm.project_type]);

  async function handleBriefSubmit(event) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!hasCompany) {
        setError('Your company profile must be ready before creating a project.');
        return;
      }
      if (!briefForm.project_type) {
        setError('Choose a project category.');
        return;
      }

      const questionnaireResult = validateQuestionnaireResponses(questionnaire, responses);
      if (!questionnaireResult.ok) {
        setError(questionnaireResult.errors[0]?.message || 'Complete the required brief fields.');
        return;
      }

      const formData = new FormData();
      formData.set('title', briefForm.title);
      formData.set('brief', briefForm.description || '');
      formData.set('targetDate', briefForm.target_date || '');
      formData.set('category', briefForm.project_type || '');
      formData.set('questionnaireVersion', String(questionnaire.version));
      formData.set('questionnaireResponses', JSON.stringify(responses));

      const result = await createProject(formData);
      if (!result.ok) {
        setError(result.error || 'Unable to submit the brief.');
        return;
      }

      setBriefForm({ title: '', description: '', target_date: '', project_type: '' });
      setResponses({});
      onCreated?.(result.data);
    } catch (err) {
      setError(err.message || 'Unable to submit the brief.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="brief-card">
      <h2 className="brief-title">Start a new project</h2>
      <p className="brief-sub">Choose a category, answer the baseline questions, and your dedicated project workspace will open with its own collaboration thread.</p>
      {error && <div className="brief-error" role="alert">{error}</div>}

      <form onSubmit={handleBriefSubmit} className="brief-form">
        <div className="brief-row">
          <label htmlFor="brief-title">Project title *</label>
          <input id="brief-title" type="text" value={briefForm.title} onChange={(event) => setBriefForm((prev) => ({ ...prev, title: event.target.value }))} required />
        </div>

        <div className="brief-row">
          <label htmlFor="brief-project-type">Project category *</label>
          <select id="brief-project-type" value={briefForm.project_type} onChange={(event) => { setBriefForm((prev) => ({ ...prev, project_type: event.target.value })); setResponses({}); }} required>
            <option value="">Select a category...</option>
            {PROJECT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="brief-row">
          <label htmlFor="brief-description">Additional context</label>
          <textarea id="brief-description" rows={4} value={briefForm.description} onChange={(event) => setBriefForm((prev) => ({ ...prev, description: event.target.value }))} />
        </div>

        {questionnaire && (
          <fieldset className="brief-questionnaire">
            <legend>{questionnaire.title}</legend>
            <p>{questionnaire.description}</p>
            {questionnaire.questions.filter((question) => isQuestionVisible(question, responses)).map((question) => (
              <div className="brief-row" key={question.id}>
                <label htmlFor={`brief-question-${question.id}`}>{question.label}{question.required ? ' *' : ''}</label>
                {renderQuestion(question, responses, setResponses)}
              </div>
            ))}
          </fieldset>
        )}

        <div className="brief-row">
          <label htmlFor="brief-target-date">Target date</label>
          <input id="brief-target-date" type="date" value={briefForm.target_date} onChange={(event) => setBriefForm((prev) => ({ ...prev, target_date: event.target.value }))} />
        </div>

        <button type="submit" className="brief-button" disabled={isSubmitting || !hasCompany}>
          {isSubmitting ? 'Submitting...' : 'Submit brief and create workspace'}
        </button>
      </form>

      <style jsx>{`
        .brief-card { background: rgba(30, 35, 60, 0.8); border: 1px solid rgba(100, 200, 255, 0.2); border-radius: 12px; padding: 1.5rem; backdrop-filter: blur(10px); }
        .brief-title { font-size: 1.4rem; color: #64c8ff; margin-bottom: 0.4rem; }
        .brief-sub, .brief-questionnaire p { color: #999; font-size: 0.9rem; margin-bottom: 1.25rem; }
        .brief-error { background: rgba(255, 100, 100, 0.1); border: 1px solid rgba(255, 100, 100, 0.3); color: #ff9999; padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem; }
        .brief-form { display: flex; flex-direction: column; gap: 1.25rem; }
        .brief-row { display: flex; flex-direction: column; gap: 0.4rem; }
        .brief-row label, .brief-questionnaire legend { color: #999; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; }
        .brief-questionnaire { display: flex; flex-direction: column; gap: 1rem; border: 1px solid rgba(100, 200, 255, 0.18); border-radius: 8px; padding: 1rem; }
        .brief-questionnaire legend { padding: 0 0.5rem; color: #64c8ff; }
        .brief-row input, .brief-row select, .brief-row textarea { background: rgba(15, 20, 40, 0.6); border: 1px solid rgba(100, 200, 255, 0.2); border-radius: 6px; padding: 0.7rem 0.9rem; color: #e0e0e0; font-size: 0.95rem; font-family: inherit; }
        .brief-row input:focus, .brief-row select:focus, .brief-row textarea:focus { outline: 2px solid rgba(100, 200, 255, 0.6); outline-offset: 2px; }
        .brief-row textarea { resize: vertical; }
        .brief-options { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 0.6rem; }
        .brief-option { display: flex; flex-direction: row !important; align-items: center; gap: 0.5rem; color: #d8defc !important; text-transform: none !important; letter-spacing: normal !important; }
        .brief-option input { width: 1rem; height: 1rem; accent-color: #64c8ff; }
        .brief-button { background: linear-gradient(135deg, #64c8ff 0%, #5bb8ff 100%); color: #0a0e27; padding: 0.75rem 1.5rem; border-radius: 6px; border: none; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.2s ease; align-self: flex-start; }
        .brief-button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(100, 200, 255, 0.3); }
        .brief-button:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
