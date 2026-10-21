// A headline drawn as stitched type: a woven four-tone thread fill with a dark
// satin edge and a light sheen, as in the design. The gradients live once in
// HeritageWorld's hidden <defs>; each title only references them.
//
// The heading text is the aria-label of the role="img" SVG, so assistive tech
// reads one clean heading. `box` is the design's measured viewBox, `size` the
// width in em so the title scales with its heading's font-size.
export default function StitchedTitle({ id, label, lines, box, size, small = false, as: Tag = 'h3' }) {
  const grad = small ? 'hx-thread-grad-sm' : 'hx-thread-grad';
  const edge = small ? 4.2 : 5.4;
  const body = small ? 1.2 : 2.4;
  return (
    <Tag className={`hx-stitched-title${small ? ' hx-stitched-title--sm' : ''}`}>
      <svg role="img" aria-label={label} viewBox={`0 0 ${box[0]} ${box[1]}`} style={{ width: `${size}em` }}>
        <g
          transform="translate(2.4 4)"
          style={{ fill: '#000', fillOpacity: 0.55, stroke: '#000', strokeOpacity: 0.55, strokeWidth: edge, strokeLinejoin: 'round' }}
        >
          <use href={`#${id}`} />
        </g>
        <g style={{ fill: 'none', stroke: '#04102a', strokeWidth: edge, strokeLinejoin: 'round' }}>
          <use href={`#${id}`} />
        </g>
        <g style={{ fill: `url(#${grad})`, stroke: `url(#${grad})`, strokeWidth: body, strokeLinejoin: 'round' }}>
          <text id={id}>
            {lines.map((line, i) => (
              <tspan key={line} x="8" y={70 + 80 * i}>{line}</tspan>
            ))}
          </text>
        </g>
        <g style={{ fill: 'url(#hx-thread-sheen)', stroke: 'none' }}>
          <use href={`#${id}`} />
        </g>
        <g style={{ fill: 'none', stroke: '#fff', strokeOpacity: 0.55, strokeWidth: 0.8, strokeLinejoin: 'round' }}>
          <use href={`#${id}`} />
        </g>
      </svg>
    </Tag>
  );
}
