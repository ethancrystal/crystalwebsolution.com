import Reveal from '../Reveal';
import { Checkpoint, Pin } from './Pin';
import {
  CORE_OUTPUTS,
  CRYSTAL_DIGITIZING_URL,
  CRYSTAL_DIGITIZING_YEARS,
  TIMELINE,
} from '../../lib/heritage.mjs';

// 02 Heritage: the 16 years, then the core claim that digitizing is the root
// every product grows from. Two sections on one ground, as in the design.
export default function Heritage() {
  return (
    <>
      <section className="hx-section hx-heritage" id="heritage" aria-labelledby="hx-heritage-title">
        <Pin lane="r" top="12%" />
        <Checkpoint side="right" top="50%" />
        <Reveal className="hx-inner hx-heritage-grid" y={28}>
          <div>
            <div className="hx-label">02 — Heritage</div>
            <div className="hx-big-number" aria-hidden="true">{CRYSTAL_DIGITIZING_YEARS}</div>
            <h2 className="hx-heritage-title" id="hx-heritage-title">
              <span className="sr-only">{CRYSTAL_DIGITIZING_YEARS} </span>
              <em>years behind the file.</em>
            </h2>
          </div>
          <div className="hx-heritage-copy">
            <p className="hx-heritage-lede">
              Crystal Digitizing came first: sixteen years of turning artwork into stitch files that have to run
              cleanly on a real machine. CD Sportswear INC is built on that discipline — reading every design for
              how it will sew, not how it looks on a monitor.
            </p>
            <ol className="hx-timeline">
              {TIMELINE.map((item) => (
                <li key={item.label} className={item.current ? 'is-current' : undefined}>
                  <span className="hx-timeline-dot" aria-hidden="true" />
                  <div className="hx-timeline-label">{item.label}</div>
                  <p>{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
        <Pin cross="rl" bottom="0" />
      </section>

      <section className="hx-section hx-core" id="core" aria-labelledby="hx-core-title">
        <Pin lane="l" top="55%" />
        <Reveal className="hx-inner" y={28}>
          <div className="hx-head">
            <div>
              <div className="hx-label hx-label--cyan">The core — Crystal Digitizing</div>
              <h2 className="hx-core-title" id="hx-core-title">
                Digitizing is the root.
                <br />
                <em>Everything else grows from the file.</em>
              </h2>
            </div>
            {/* Points at the scroll thread, which is only drawn from 900px up. */}
            <p className="hx-aside hx-thread-copy">
              The thread running down this page works the same way: a path is plotted first as a file, then sewn.
            </p>
          </div>
          <div className="hx-core-card">
            <div className="hx-core-card-copy">
              <div className="hx-mono hx-core-card-kicker">The file / since 2010</div>
              <div className="hx-core-card-name">Crystal Digitizing</div>
              <p>
                Sixteen years of turning artwork into stitch files that run cleanly on a real machine — then proving
                each one on fabric before it reaches production.
              </p>
            </div>
            <a className="hx-btn" href={CRYSTAL_DIGITIZING_URL} target="_blank" rel="noopener">
              Explore Crystal Digitizing <span className="hx-arrow" aria-hidden="true">→</span>
            </a>
          </div>
          <div className="hx-core-drop" aria-hidden="true" />
          <ul className="hx-core-outputs">
            {CORE_OUTPUTS.map((item) => (
              <li key={item.title}>
                <a className="hx-core-output" href={item.href}>
                  <div className="hx-tag">{item.tag}</div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </a>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>
    </>
  );
}
