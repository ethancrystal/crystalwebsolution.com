import ProjectVisual from '../ProjectVisual';

// Case study only. Until real project screenshots exist, this renders a
// staggered 2-col grid of palette-driven ProjectVisual variants — a
// deliberate "designed placeholder" that stays honest about not being a real
// screenshot while matching the site's generative-art identity elsewhere.
export default function CaseGallery({ palette, title }) {
  return (
    <div className="case-gallery">
      {[0, 1, 2, 3].map((variant) => (
        <div key={variant} className={`case-gallery-tile${variant % 2 === 1 ? ' is-offset' : ''}`}>
          <ProjectVisual
            palette={palette}
            title={title}
            variant={variant}
            ratio="4 / 3"
            label={`${title} — detail study ${variant + 1}`}
          />
        </div>
      ))}
    </div>
  );
}
