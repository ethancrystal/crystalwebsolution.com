// ContentSection — a labelled content block used across inner marketing pages.
// `tone` switches the background plate so consecutive sections stay legible
// over the same dark canvas. No client-side runtime.
export default function ContentSection({ eyebrow, title, children, tone = 'default', id }) {
  return (
    <section className={`mkt-section mkt-section--${tone}`} id={id}>
      <div className="mkt-section-inner">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        {title && <h2 className="mkt-section-title">{title}</h2>}
        {children}
      </div>
    </section>
  );
}
