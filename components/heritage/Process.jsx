import Reveal from '../Reveal';
import { Pin } from './Pin';
import { APPROVAL_QUOTE, PROCESS_STEPS } from '../../lib/heritage.mjs';

// 04 The process: the screen is only the beginning. Eight steps from artwork
// to approved repeat production; the thread passes through each step's bead
// and lights it as it is sewn past. Step text always stays fully readable.
export default function Process() {
  return (
    <section className="hx-section" id="process" aria-labelledby="hx-process-title">
      <div className="hx-inner hx-process-grid">
        <div>
          <Reveal y={28}>
            <div className="hx-label">04 — The process</div>
            <h2 className="hx-process-title" id="hx-process-title">
              The screen is only
              <br />
              <em>the beginning.</em>
            </h2>
          </Reveal>
          <div style={{ position: 'relative' }}>
            <Pin lane="l" top="-40px" />
            <ol className="hx-steps">
              {PROCESS_STEPS.map((step, i) => (
                <li className="hx-step" key={step.title}>
                  <span className="hx-step-dot" data-pin="" data-checkpoint="" aria-hidden="true" />
                  <span className="hx-step-no">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <div className="hx-step-title">{step.title}</div>
                    <div className="hx-step-body">{step.body}</div>
                  </div>
                </li>
              ))}
            </ol>
            <Pin lane="l" bottom="-36px" />
          </div>
        </div>
        <div style={{ alignSelf: 'end' }}>
          <Reveal as="blockquote" className="hx-quote" y={28}>
            <div className="hx-label">How we approve a file</div>
            <p>“{APPROVAL_QUOTE}”</p>
          </Reveal>
        </div>
      </div>
      <Pin lane="l" bottom="56px" />
    </section>
  );
}
