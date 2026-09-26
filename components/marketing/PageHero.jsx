import SectionReveal from '../SectionReveal';
import BlurLetters from '../BlurLetters';
import LineRise from '../LineRise';
import HeroStage from './HeroStage';

// PageHero — the opening block for inner marketing pages. Reuses the existing
// text-plate + eyebrow + page-title visual language so inner pages feel of a
// piece with the homepage, without importing any homepage runtime.
//
// HeroStage renders the cyan-silver animated stage (only on the four
// whitelisted top-level pages — see SubpageExperience.jsx) scoped to this
// section, so the animation starts just below the nav and ends where the
// next section begins, instead of running the full page height.
export default function PageHero({ eyebrow, title, lede, children }) {
  return (
    <section className="mkt-hero">
      <HeroStage />
      <div className="text-plate">
        {eyebrow && (
          <p className="eyebrow">
            <SectionReveal as="span" direction="left">{eyebrow}</SectionReveal>
          </p>
        )}
        <BlurLetters as="h1" className="page-title mkt-hero-title" delay={0.05}>
          {title}
        </BlurLetters>
        {lede && (
          <LineRise as="p" className="mkt-hero-lede" delay={0.15}>
            {lede}
          </LineRise>
        )}
        <SectionReveal direction="up" delay={0.2}>
          {children}
        </SectionReveal>
      </div>
    </section>
  );
}
