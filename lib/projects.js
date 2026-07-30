// Case-study data. Visuals are code-generated from each project's palette —
// no image assets anywhere in this repo.
export const PROJECTS = [
  {
    slug: 'aurora-finance',
    title: 'Aurora Finance',
    category: 'Fintech platform',
    year: '2026',
    palette: ['#59f3ff', '#3c6cff'],
    summary:
      'A real-time trading dashboard rebuilt as a calm, glassy instrument — data you can feel before you read it.',
    services: ['Product design', 'WebGL', 'Frontend build'],
    body: [
      'Aurora came to us with a dashboard that was technically complete and emotionally exhausting. Dense tables, twelve competing alerts, no hierarchy.',
      'We rebuilt the interface around a single depth axis: portfolio health floats nearest the viewer, context recedes. Motion carries meaning — velocity of change maps to velocity on screen.',
      'The result cut task time by a third and became the template for the rest of their product family.',
    ],
  },
  {
    slug: 'meridian-atelier',
    title: 'Meridian Atelier',
    category: 'Luxury e-commerce',
    year: '2025',
    palette: ['#c084fc', '#3c6cff'],
    summary:
      'A couture house translated into light — product photography replaced by refractive 3D that responds to the cursor.',
    services: ['Art direction', '3D & motion', 'E-commerce'],
    body: [
      'Meridian wanted a storefront that felt like stepping into their atelier, not scrolling a catalogue.',
      'Each garment is presented inside a refracting glass volume; the cursor bends the light. Checkout stays deliberately plain — drama where it earns attention, silence where it counts.',
      'Session length doubled. Returns dropped. The site won three international design awards in its first quarter.',
    ],
  },
  {
    slug: 'northwind-labs',
    title: 'Northwind Labs',
    category: 'Deep-tech brand',
    year: '2025',
    palette: ['#59f3ff', '#c084fc'],
    summary:
      'A climate research lab given a public face — dense science made legible through decoding typography and generative visuals.',
    services: ['Brand identity', 'Design system', 'Development'],
    body: [
      'Northwind publishes brilliant research that almost nobody could read. Our brief: make rigor feel inviting without dumbing it down.',
      'We built a decoding type system — headlines resolve from cipher to clarity as you scroll, a visual metaphor for the lab’s work. Charts are generated live from their open datasets.',
      'Media citations tripled within six months of launch.',
    ],
  },
  {
    slug: 'halcyon-audio',
    title: 'Halcyon Audio',
    category: 'Product launch',
    year: '2024',
    palette: ['#3c6cff', '#59f3ff'],
    summary:
      'A flagship headphone launch where sound becomes geometry — waveforms drive the entire 3D scene in real time.',
    services: ['Launch site', 'WebAudio + WebGL', 'Motion design'],
    body: [
      'Halcyon’s flagship deserved more than a spec sheet. We built a scene where the product’s own frequency response sculpts the environment around it.',
      'Every visitor hears a different room: the WebAudio analyser feeds displacement, bloom and particle drift, so the page literally moves to the music.',
      'Pre-orders sold out in eleven days.',
    ],
  },
  {
    slug: 'terra-verde',
    title: 'Terra Verde',
    category: 'Architecture studio',
    year: '2024',
    palette: ['#c084fc', '#59f3ff'],
    summary:
      'An architecture portfolio that walks you through its buildings — one continuous camera move, six projects, zero page loads.',
    services: ['Portfolio site', 'Scroll choreography', 'CMS'],
    body: [
      'Architects think in sequence — approach, threshold, volume, light. Their old site chopped that into thumbnails.',
      'We rebuilt it as a single continuous camera journey. Scroll is the walk; each project is a room the camera enters. The plan drawings assemble themselves from strokes as you arrive.',
      'The studio now opens client pitches by scrolling the site in silence.',
    ],
  },
];

export function getProject(slug) {
  return PROJECTS.find((p) => p.slug === slug) || null;
}
