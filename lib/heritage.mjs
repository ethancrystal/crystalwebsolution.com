// Content for the embroidery-first homepage (components/heritage/*). Kept as
// plain data so the copy has one home and tests can pin the claims it makes.
//
// Source: the owner's "CD Sportswear Heritage Homepage" Claude Design handoff
// (2026-10-18). The design's unfilled placeholders ("[ model to confirm ]",
// "[ add verified correction ]") are deliberately NOT carried over.

// The production partner behind the 16 years. The design links to it as the
// first navigation item; it is the owner's embroidery-digitizing site.
export const CRYSTAL_DIGITIZING_URL = 'https://crystaldigitizing.com';

// Years of Crystal Digitizing (2010 to now). A literal on purpose: a
// date-derived number would be frozen into the prerendered HTML at build time
// and mismatch on hydration after New Year.
export const CRYSTAL_DIGITIZING_YEARS = 16;

// Homepage-only menu. Leads with Crystal Digitizing, then the production story,
// with the digital studio lower down. Subpages keep SITE.nav.
export const HERITAGE_NAV = Object.freeze([
  { label: 'Crystal Digitizing', href: CRYSTAL_DIGITIZING_URL, external: true },
  { label: 'What We Make', href: '/#make' },
  { label: 'The Process', href: '/#process' },
  { label: 'Work', href: '/#work' },
  { label: 'Digital Studio', href: '/#studio' },
  { label: 'About', href: '/#heritage' },
  { label: 'Contact', href: '/#contact' },
]);

export const HERO_FACTS = Object.freeze([
  `${CRYSTAL_DIGITIZING_YEARS} YRS / CRYSTAL DIGITIZING`,
  'IN-HOUSE SEW-OUT TESTING',
  'NO MINIMUM ORDER',
]);

export const TIMELINE = Object.freeze([
  {
    label: '2010 / CRYSTAL DIGITIZING',
    body: 'Artwork converted into embroidery files, built and tested for production.',
  },
  {
    label: '2016 / CD SPORTSWEAR INC',
    body: 'The same file discipline, now carried through to finished patches, stickers and branded goods.',
  },
  {
    label: 'TODAY',
    body: 'Digitizing, machine testing, inspection and repeat production — handled by specialists, in-house.',
    current: true,
  },
]);

export const CORE_OUTPUTS = Object.freeze([
  // Embroidery and Patches link to their pillar pages (docs/seo/STRATEGY.md §3,
  // themes P1/P2): the homepage is the strongest page on the site, and these are
  // the two pages it should push.
  { tag: 'FILE → EMBROIDERY', title: 'Embroidery', body: 'Sewn at the size it will be worn, on the fabric it will meet.', href: '/services/embroidery-digitizing' },
  { tag: 'FILE → PATCHES', title: 'Patches', body: 'Embroidered, woven, PVC, leather, chenille and printed — file and material chosen together.', href: '/services/custom-patches' },
  { tag: 'FILE → STICKERS', title: 'Stickers', body: 'Clean cut lines and accurate colour, prepared before print.', href: '/#make' },
  { tag: 'FILE → VECTOR', title: 'Vector artwork', body: 'Logos rebuilt clean and separated for the method that will produce them.', href: '/#make' },
  { tag: 'FILE → BRAND GOODS', title: 'Apparel & goods', body: 'Available on confirmed projects.', href: '/#contact' },
]);

export const DIGITIZE_ITEMS = Object.freeze([
  { title: 'Cap digitizing', body: 'Cap designs managed for sizing and stitch accuracy.' },
  { title: 'Monogram digitizing', body: 'Quality monogram digitizing for embroidery, with the sharpest result.' },
  { title: 'Towel digitizing', body: 'Digitizing for different towel fabrics, with sharp embroidery results.' },
  { title: 'Hat digitizing', body: 'Hat designs digitized for embroidery, sewn out at the exact size.' },
  { title: 'Sleeves digitizing', body: 'Sleeve designs punched by a qualified digitizing department, to your requirements.' },
  { title: 'Gloves digitizing', body: 'Glove embroidery needs an experienced digitizer. We make the exact outcome possible.' },
]);

export const DIGITIZE_TAGS = Object.freeze(['STITCH DIRECTION', 'DENSITY', 'UNDERLAY', 'SMALL LETTERING']);

// Patch-material tiles. `multiply` marks the vector JPEGs drawn on white, which
// are multiplied onto the pale tile so no hard white box shows.
export const PATCH_TILES = Object.freeze([
  { src: '/heritage/emb-ribshack.webp', w: 240, h: 240, alt: 'Embroidered Rib Shack BBQ design', caption: 'EMBROIDERY DESIGN' },
  { src: '/heritage/vec-mustangs.webp', w: 500, h: 500, alt: 'Vector logo: purple M with a galloping mustang', caption: 'VECTOR LOGO', multiply: true },
  { src: '/heritage/vec-funbunch.webp', w: 240, h: 240, alt: 'Vector illustration: The Fun Bunch, Sapulpa Oklahoma', caption: 'VECTOR ILLUSTRATION' },
  { src: '/heritage/vec-monger.webp', w: 496, h: 500, alt: 'Vector logo: Monger Elementary Volleyball mustang', caption: 'VECTOR LOGO', multiply: true },
  { src: '/heritage/vec-airpark.webp', w: 240, h: 240, alt: 'Vector logo: Clearwater Airpark', caption: 'VECTOR LOGO' },
  { src: '/heritage/vec-stirrup.webp', w: 500, h: 500, alt: 'Vector render: yellow and black safety stirrup', caption: 'VECTOR RENDER', multiply: true },
]);

// Vector-prep mosaic: two rows (three small, two wide), in the design's order.
export const VECTOR_MOSAIC = Object.freeze([
  { src: '/heritage/vec-mustangs.webp', w: 500, h: 500, alt: 'Vector logo: purple M with a galloping mustang', span: 2, multiply: true },
  { src: '/heritage/vec-monger.webp', w: 496, h: 500, alt: 'Vector logo: Monger Elementary Volleyball mustang', span: 2, multiply: true },
  { src: '/heritage/vec-stirrup.webp', w: 500, h: 500, alt: 'Vector render: yellow and black safety stirrup', span: 2, multiply: true },
  { src: '/heritage/vec-airpark.webp', w: 240, h: 240, alt: 'Vector logo: Clearwater Airpark', span: 3 },
  { src: '/heritage/vec-funbunch.webp', w: 240, h: 240, alt: 'Vector illustration: The Fun Bunch, Sapulpa Oklahoma', span: 3 },
]);

export const PROCESS_STEPS = Object.freeze([
  { title: 'Artwork', body: 'Your file, sketch or existing patch — with size and quantity.' },
  { title: 'Digitizing', body: 'Stitch type, direction, density and underlay planned for the real size.' },
  { title: 'Machine setup', body: 'Thread, backing, hoop and fabric matched to the order.' },
  { title: 'First sew-out', body: 'The file runs on the machine. This is a test, not a product.' },
  { title: 'Inspection', body: 'Lettering, density, stitch direction and border control, under good light.' },
  { title: 'Refinement', body: 'The file is corrected wherever the sew-out shows it needs attention.' },
  { title: 'Second sew-out', body: 'The correction is proven on fabric.' },
  { title: 'Approved repeat production', body: 'The approved file becomes the standard for every reorder.' },
]);

export const APPROVAL_QUOTE =
  'We do not approve a file because it looks good on screen. We run it on the machine, inspect the sew-out, refine what needs attention, and test it again.';

// What the inspection looks at between sew-out 01 and 02. Describes the check
// itself; no invented correction is claimed for any specific job.
export const INSPECTION_CHECKS = Object.freeze([
  { title: 'Lettering', body: 'Small text read at the size it will be worn.' },
  { title: 'Density', body: 'Fill and thread build judged against the fabric.' },
  { title: 'Stitch direction', body: 'Direction and shading checked under good light.' },
  { title: 'Border control', body: 'Edges and borders checked for a clean, even finish.' },
]);

export const MACHINERY_FACTS = Object.freeze([
  { term: 'TESTED ON', detail: "The order's fabric and backing" },
  { term: 'APPROVAL', detail: 'After the corrected sew-out' },
]);

// Workbench proof: one framed print per claim. Position is the wide-screen
// scatter (left/top/width as % of the board, plus a tilt); narrow screens
// stack them in a two-column grid.
export const WORKBENCH = Object.freeze([
  { src: '/heritage/sublimation-05.webp', alt: 'Stacked batch of round printed patches', caption: 'REPEAT SAMPLE / CONSISTENCY', x: '1%', y: '3%', w: '30%', r: '-2deg' },
  { src: '/heritage/patch-3.webp', alt: 'Embroidered seal patch with fine lettering', caption: 'SMALL LETTERING / READABILITY', x: '30%', y: '13%', w: '24%', r: '1.6deg' },
  { src: '/heritage/chenille-04.webp', alt: 'Chenille letter patches', caption: 'CHENILLE / TEXTURE & EDGE', x: '56%', y: '1%', w: '25%', r: '-1deg' },
  { src: '/heritage/patch-5.webp', alt: 'Embroidered oval patch with merrowed border', caption: 'PATCH BORDER / EDGE CONTROL', x: '78%', y: '27%', w: '21%', r: '2.4deg' },
  { src: '/heritage/patch-14.webp', alt: 'Debossed leather patch', caption: 'LEATHER / DEBOSS DETAIL', x: '5%', y: '53%', w: '22%', r: '2deg' },
  { src: '/heritage/sublimation-08.webp', alt: 'Two stacks of identical printed tiger patches', caption: 'BATCH / EVERY PIECE MATCHES', x: '30%', y: '56%', w: '26%', r: '-2deg' },
  { src: '/heritage/patch-8.webp', alt: 'PVC patch with skull and beret', caption: 'PVC / COLOUR SEPARATION', x: '59%', y: '55%', w: '19%', r: '1deg' },
  { src: '/heritage/sublimation-12.webp', alt: 'Stack of round patches with green merrowed border', caption: 'REPEAT ORDER / SAME BORDER', x: '80%', y: '68%', w: '18%', r: '-1.5deg' },
]);

// The patch promotion. Confirmed details only.
export const OFFER = Object.freeze({
  price: '5',
  rows: [
    { term: 'Materials', detail: 'Embroidered, woven, PVC, leather, chenille, printed' },
    { term: 'Minimum order', detail: 'None' },
    { term: 'Digitizing', detail: 'Free' },
    { term: 'Mockup before production', detail: 'Free' },
  ],
});

// What the Digital Studio does, as the design lists it. A plain list on
// purpose: the design's tiles were screenshots of third-party showcase sites
// (public/projects/clients/SOURCES.md), which must never read as our own work.
export const STUDIO_CAPABILITIES = Object.freeze([
  'Websites',
  'Brand systems',
  'Automation',
  'Product presentation',
  'Customer workflows',
]);

// Lane anchors for the scroll-drawn thread (components/heritage/ThreadRail).
// The hero entry and each section's marker are placed in JSX; this is only the
// colour set: ordinary sewing-thread steel, dark to light.
export const THREAD_COLORS = Object.freeze(['#13303d', '#416f84', '#7fb2c6', '#e9f5fa']);
