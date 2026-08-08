// PageHero — the opening block for inner marketing pages. Reuses the existing
// text-plate + eyebrow + page-title visual language so inner pages feel of a
// piece with the homepage, without importing any homepage runtime.
export default function PageHero({ eyebrow, title, lede, children }) {
  return (
    <section className="mkt-hero">
      <div className="text-plate">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title mkt-hero-title">{title}</h1>
        {lede && <p className="mkt-hero-lede">{lede}</p>}
        {children}
      </div>
    </section>
  );
}
