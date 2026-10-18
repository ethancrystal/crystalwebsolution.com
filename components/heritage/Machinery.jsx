import { Fragment } from 'react';
import Reveal from '../Reveal';
import { Pin } from './Pin';
import { MACHINERY_FACTS } from '../../lib/heritage.mjs';

// 06 Machinery: the machine is where the last design decisions are made. The
// design's "machine model" row is omitted until the model is confirmed.
export default function Machinery() {
  return (
    <section className="hx-section" id="machinery" aria-labelledby="hx-machinery-title">
      <Pin lane="r" top="50%" />
      <div className="hx-inner hx-machinery-grid">
        <Reveal className="hx-machine-media" y={28}>
          <figure>
            <div>
              <img
                src="/heritage/process.webp"
                width="1100"
                height="733"
                alt="Operator guiding fabric under the needle during a machine test"
                loading="lazy"
                decoding="async"
              />
            </div>
            <figcaption>MACHINE TEST / PRODUCTION CHECK</figcaption>
          </figure>
        </Reveal>
        <Reveal className="hx-machinery-copy" y={28}>
          <div className="hx-label">06 — Machinery</div>
          <h2 className="hx-machinery-title" id="hx-machinery-title">
            The machine is part of the <em>design process.</em>
          </h2>
          <p>
            A file is only finished when it runs. Thread tension, hoop, backing and fabric all change how a design
            sews — so the machine is where the last design decisions are made, not where we hope for the best.
          </p>
          <dl className="hx-facts-list">
            {/* Fragments, not wrapper divs: the rules close only the last pair,
                which :last-of-type can only do among direct siblings. */}
            {MACHINERY_FACTS.map((fact) => (
              <Fragment key={fact.term}>
                <dt>{fact.term}</dt>
                <dd>{fact.detail}</dd>
              </Fragment>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
