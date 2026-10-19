import Reveal from '../Reveal';
import { STUDIO_CAPABILITIES } from '../../lib/heritage.mjs';

// 09 Digital Studio: the hinge between the production story above and the
// digital beats below (Capabilities, Selected work, Contact). The physical work leads; the
// studio is framed as supporting it. Transparent, so the WebGL stage returns
// from here; the ink ground above fades out through the ::before gradient.
export default function StudioBridge() {
  return (
    <section className="hx hx-studio" id="studio" aria-labelledby="hx-studio-title">
      <div className="hx-studio-grid">
        <Reveal className="hx-studio-copy" y={28}>
          <div className="hx-label hx-label--cyan">09 — Digital Studio</div>
          <h2 className="hx-studio-title" id="hx-studio-title">
            Digital work that supports <em>physical production.</em>
          </h2>
          <p>
            CD Sportswear INC also builds websites, brand systems, automation, product presentation and customer
            workflows — so a brand looks as considered online as it does on the patch.
          </p>
          <a className="hx-link" href="/services">
            Visit the Digital Studio <span className="hx-arrow" aria-hidden="true">→</span>
          </a>
        </Reveal>
        <Reveal as="ul" className="hx-studio-list" y={28}>
          {STUDIO_CAPABILITIES.map((item, i) => (
            <li key={item}>
              <span className="hx-studio-no">{String(i + 1).padStart(2, '0')}</span>
              <span className="hx-studio-name">{item}</span>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
