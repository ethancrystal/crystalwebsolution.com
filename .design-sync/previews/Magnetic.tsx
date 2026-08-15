// Authored preview — Magnetic. Wraps a single child and pulls it toward the
// cursor via gsap.quickTo. It renders nothing on its own, so the floor card
// came up blank; these cells give it real children. The magnetic pull needs a
// pointer (and is disabled under coarse pointers / reduced motion), so a
// static card correctly shows the child at its resting position.
import { Magnetic } from 'crystal-web-solution';

export const SolidButton = () => (
  <Magnetic>
    <a href="#" className="btn btn-solid" style={{ textDecoration: 'none' }}>
      Start a project <span className="btn-arrow">→</span>
    </a>
  </Magnetic>
);

export const StrengthScale = () => (
  <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
    {[0.15, 0.35, 0.6].map((strength) => (
      <div key={strength} style={{ textAlign: 'center' }}>
        <Magnetic strength={strength}>
          <span className="btn btn-solid">{strength}</span>
        </Magnetic>
        <p style={{ marginTop: '.75rem', fontSize: '.75rem', opacity: 0.6 }}>
          strength={strength}
        </p>
      </div>
    ))}
  </div>
);

export const AroundAnIconTarget = () => (
  <Magnetic strength={0.5}>
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 64,
        height: 64,
        borderRadius: '50%',
        border: '1px solid var(--cyan)',
        color: 'var(--cyan)',
      }}
    >
      →
    </span>
  </Magnetic>
);
