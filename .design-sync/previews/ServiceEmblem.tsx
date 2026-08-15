// Authored preview — ServiceEmblem. The floor card tripped [RENDER_THIN]:
// with no `signal` it falls back to one glyph, and since the whole span is
// aria-hidden decorative SVG there is no text for the heuristic to find.
//
// `variant="3d"` is deliberately NOT previewed — it swaps in ServiceEmblem3D,
// an R3F canvas that can't mount inside a static card. The two DOM variants
// are the ones a design agent can actually place.
import { ServiceEmblem } from 'crystal-web-solution';

const SIGNALS = [
  'web',
  'development',
  'brand',
  'logo',
  'marketing',
  'motion',
  'ai',
  'workflow',
] as const;

export const AllSignals = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '1.5rem',
      textAlign: 'center',
    }}
  >
    {SIGNALS.map((signal) => (
      <div key={signal}>
        <div style={{ width: 64, height: 64, margin: '0 auto' }}>
          <ServiceEmblem signal={signal} />
        </div>
        <p style={{ marginTop: '.5rem', fontSize: '.75rem', opacity: 0.7 }}>{signal}</p>
      </div>
    ))}
  </div>
);

export const StaticVariant = () => (
  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
    {(['web', 'motion', 'ai'] as const).map((signal) => (
      <div key={signal} style={{ width: 64, height: 64 }}>
        <ServiceEmblem signal={signal} variant="static" />
      </div>
    ))}
    <p style={{ fontSize: '.75rem', opacity: 0.7, margin: 0 }}>
      variant="static" strips the SMIL animations — use it where motion would
      distract or where reduced-motion is honoured upstream.
    </p>
  </div>
);

export const NumberedInAList = () => (
  <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '1rem' }}>
    {(
      [
        ['brand', '01', 'Brand systems'],
        ['web', '02', 'Marketing sites'],
        ['motion', '03', 'Motion and 3D'],
      ] as const
    ).map(([signal, n, label]) => (
      <li key={n} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span style={{ width: 48, height: 48, flex: '0 0 auto' }}>
          <ServiceEmblem signal={signal} n={n} />
        </span>
        <span>{label}</span>
      </li>
    ))}
  </ol>
);
