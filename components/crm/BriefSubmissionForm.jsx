'use client';

import { useState } from 'react';
import { PROJECT_TYPE_OPTIONS } from '@/lib/projectTypes';
import { createProject } from '@/app/actions/project-actions';

export default function BriefSubmissionForm({ hasCompany, onCreated }) {
  const [briefForm, setBriefForm] = useState({
    title: '',
    description: '',
    target_date: '',
    project_type: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleBriefSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set('title', briefForm.title);
      formData.set('brief', briefForm.description || '');
      formData.set('targetDate', briefForm.target_date || '');
      formData.set('category', briefForm.project_type || '');

      const result = await createProject(formData);

      if (!result.ok) {
        setError(result.error || 'Unable to submit the brief.');
        return;
      }

      setBriefForm({ title: '', description: '', target_date: '', project_type: '' });
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
      <p className="brief-sub">Send us your brief and we'll pick it up from here.</p>

      {error && <div className="brief-error">{error}</div>}

      <form onSubmit={handleBriefSubmit} className="brief-form">
        <div className="brief-row">
          <label htmlFor="brief-title">Project title *</label>
          <input
            id="brief-title"
            type="text"
            value={briefForm.title}
            onChange={(e) => setBriefForm((prev) => ({ ...prev, title: e.target.value }))}
            required
          />
        </div>

        <div className="brief-row">
          <label htmlFor="brief-description">Brief</label>
          <textarea
            id="brief-description"
            value={briefForm.description}
            onChange={(e) => setBriefForm((prev) => ({ ...prev, description: e.target.value }))}
            rows={4}
          />
        </div>

        <div className="brief-row">
          <label htmlFor="brief-project-type">Project type</label>
          <select
            id="brief-project-type"
            value={briefForm.project_type}
            onChange={(e) => setBriefForm((prev) => ({ ...prev, project_type: e.target.value }))}
          >
            <option value="">Select a type...</option>
            {PROJECT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="brief-grid">
          <div className="brief-row">
            <label htmlFor="brief-target-date">Target date</label>
            <input
              id="brief-target-date"
              type="date"
              value={briefForm.target_date}
              onChange={(e) => setBriefForm((prev) => ({ ...prev, target_date: e.target.value }))}
            />
          </div>
        </div>

        <button type="submit" className="brief-button" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit brief'}
        </button>
      </form>

      <style jsx>{`
        .brief-card {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 12px;
          padding: 1.5rem;
          backdrop-filter: blur(10px);
        }

        .brief-title {
          font-size: 1.4rem;
          color: #64c8ff;
          margin-bottom: 0.4rem;
        }

        .brief-sub {
          color: #999;
          font-size: 0.9rem;
          margin-bottom: 1.25rem;
        }

        .brief-error {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .brief-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .brief-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1.25rem;
        }

        .brief-row {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .brief-row label {
          color: #999;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .brief-row input,
        .brief-row select,
        .brief-row textarea {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          padding: 0.7rem 0.9rem;
          color: #e0e0e0;
          font-size: 0.95rem;
          font-family: inherit;
        }

        .brief-row input:focus,
        .brief-row select:focus,
        .brief-row textarea:focus {
          outline: none;
          border-color: rgba(100, 200, 255, 0.6);
        }

        .brief-row textarea {
          resize: vertical;
        }

        .brief-button {
          background: linear-gradient(135deg, #64c8ff 0%, #5bb8ff 100%);
          color: #0a0e27;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          border: none;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          align-self: flex-start;
        }

        .brief-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(100, 200, 255, 0.3);
        }

        .brief-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
