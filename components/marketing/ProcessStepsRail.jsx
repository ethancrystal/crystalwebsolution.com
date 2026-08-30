'use client';

// ProcessStepsRail — Process page only. Client wrapper that pairs the
// numbered <ol> of steps with the scroll-scrubbed ProcessRail, since the
// rail needs a ref to the list's own scroll range and app/process/page.jsx
// is otherwise a server component.
import { useRef } from 'react';
import ProcessRail from './ProcessRail';

export default function ProcessStepsRail({ steps }) {
  const stepsRef = useRef(null);

  return (
    <div className="process-steps-rail">
      <ProcessRail stepsRef={stepsRef} />
      <ol ref={stepsRef} className="mkt-steps mkt-steps--wide">
        {steps.map((step) => (
          <li key={step.n} className="mkt-step">
            <span className="mkt-step-index">{step.n}</span>
            <div className="mkt-step-body">
              <h2 className="mkt-step-title">{step.title}</h2>
              <p className="mkt-step-text">{step.body}</p>
              {(step.duration || step.deliverable) && (
                <p className="mkt-step-meta">
                  {step.duration && <span className="mkt-step-duration">{step.duration}</span>}
                  {step.deliverable && <span className="mkt-step-deliverable">{step.deliverable}</span>}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
