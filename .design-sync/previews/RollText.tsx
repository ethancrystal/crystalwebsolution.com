// Authored preview — RollText. Renders blank on the floor card because the
// component is pure children-wrapping: with no children there is nothing to
// mask or roll. The hover swap itself is CSS-driven (.roll in globals.css),
// so a static card shows the resting face, which is the correct at-rest look.
import { RollText } from 'crystal-web-solution';

export const InALink = () => (
  <a href="#" className="btn btn-solid" style={{ textDecoration: 'none' }}>
    <RollText>Start a project</RollText>
  </a>
);

export const NavItems = () => (
  <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
    {['Work', 'Studio', 'Approach', 'Contact'].map((label) => (
      <a key={label} href="#" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
        <RollText>{label}</RollText>
      </a>
    ))}
  </nav>
);

export const AsStandaloneLabel = () => (
  <p style={{ margin: 0, fontSize: '1.25rem' }}>
    <RollText className="roll-lead">Built to be unforgettable.</RollText>
  </p>
);
