import Reveal from '../Reveal';
import { Pin } from './Pin';
import { WORKBENCH } from '../../lib/heritage.mjs';

// 07 From the workbench: selected proof, not a gallery. Every print is here
// for what it proves, and the caption says what. Scattered like prints on a
// bench from 1100px up; a plain two-column stack below.
export default function Workbench() {
  return (
    <section className="hx-section hx-work" id="work" aria-labelledby="hx-work-title">
      <Pin lane="r" top="40%" />
      <div className="hx-inner">
        <Reveal className="hx-head" y={28}>
          <div>
            <div className="hx-label">07 — From the workbench</div>
            <h2 className="hx-h2" id="hx-work-title">
              Selected proof,
              <br />
              <em>not a gallery.</em>
            </h2>
          </div>
          <p className="hx-aside" style={{ maxWidth: 360 }}>
            Finished pieces and full batches, photographed as they came off the bench. Each one is here for what it
            proves.
          </p>
        </Reveal>
        <Reveal as="ul" className="hx-bench" y={28}>
          {WORKBENCH.map((print) => (
            <li key={print.src}>
              <figure
                className="hx-polaroid"
                style={{ '--x': print.x, '--y': print.y, '--w': print.w, '--r': print.r }}
              >
                <img src={print.src} width="872" height="900" alt={print.alt} loading="lazy" decoding="async" />
                <figcaption>{print.caption}</figcaption>
              </figure>
            </li>
          ))}
        </Reveal>
      </div>
      <Pin cross="rl" bottom="0" />
    </section>
  );
}
