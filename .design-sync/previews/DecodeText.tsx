// Authored preview — DecodeText. Requires a `text` prop; without one the
// floor card rendered an empty element.
//
// Capture timing note: each character unscrambles at `index * speed + 220ms`,
// so at the production default (speed 0.035) a headline is still mid-cipher
// when the card is screenshotted — the first pass of these cells captured
// literal garble like "Built to be u-*?+\}<>". The cards below therefore run
// fast enough to settle, so each one shows the RESOLVED text, which is what a
// design agent needs to see. The scramble is still the live behaviour on the
// real page; `speed` is documented in DecodeText.d.ts and the cell labels
// below name the production value.
import { DecodeText } from 'crystal-web-solution';

export const Headline = () => (
  <DecodeText as="h2" text="Built to be unforgettable." speed={0.002} />
);

export const Eyebrow = () => (
  <DecodeText as="p" className="eyebrow" text="Independent digital studio" speed={0.002} />
);

export const ProductionDefault = () => (
  <div style={{ display: 'grid', gap: '.5rem' }}>
    <DecodeText as="span" text="Signal over noise" speed={0.002} />
    <span style={{ fontSize: '.75rem', opacity: 0.6 }}>
      Shown resolved. On the page this runs at speed=0.035, decoding
      left-to-right over roughly half a second.
    </span>
  </div>
);
