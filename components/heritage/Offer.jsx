import Reveal from '../Reveal';
import { Checkpoint } from './Pin';
import { OFFER } from '../../lib/heritage.mjs';

// 08 The current patch offer. Placed after the heritage and quality sections
// on purpose: an opportunity from a production partner, not the identity of
// the company. Only confirmed offer details appear here.
export default function Offer() {
  return (
    <section className="hx-section hx-offer" id="offer" aria-labelledby="hx-offer-title">
      <Checkpoint side="left" top="50%" />
      <Reveal className="hx-offer-card" y={28}>
        <div className="hx-offer-grid">
          <div>
            <div className="hx-offer-kicker">CURRENT PATCH OFFER</div>
            <h2 id="hx-offer-title" className="sr-only">Current patch offer: $5 per patch</h2>
            <div className="hx-offer-price" aria-hidden="true">
              <span>$</span>
              <span>{OFFER.price}</span>
            </div>
            <div className="hx-offer-per" aria-hidden="true">PER PATCH</div>
          </div>
          <div>
            <p className="hx-offer-lede">
              An opportunity from a production partner — with the same testing behind every patch.
            </p>
            <ul className="hx-offer-rows">
              {OFFER.rows.map((row) => (
                <li key={row.term}>
                  <span>{row.term}</span>
                  <span>{row.detail}</span>
                </li>
              ))}
            </ul>
            <a className="hx-btn hx-btn--paper" href="/#contact">
              Send artwork, size &amp; quantity <span className="hx-arrow" aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
