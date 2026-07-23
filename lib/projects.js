// Selected case studies. The five client narratives were provided directly by
// the studio; the sixth documents this site and can be verified in the repo.
// Visuals remain procedural and are generated from each palette.
export const PROJECTS = [
  {
    slug: 'tucker-trips',
    title: 'Tucker Trips',
    category: 'Web & app development',
    palette: ['#c084fc', '#ff8dd1'],
    services: ['Product design', 'Frontend build', 'CMS'],
    summary:
      'A trip-sharing platform buried under generic travel-blog templates; we rebuilt it as a place travelers actually want to publish to.',
    body: [
      'Tucker Trips wanted to be the platform where travelers document and share journeys, but the early build looked like every other blogging theme: no sense of place and no reason to choose it over a social feed.',
      'We redesigned around the map, not the post. Every trip lives on an interactive route, with photos, notes, and stops threaded along the journey instead of stacked in a feed.',
      'We built a lightweight authoring flow so travelers can publish from the road: drop a pin, add a photo, and write a line without fighting a heavy CMS.',
      'The result reads less like a blog and more like a logbook. Every trip has its own shape, and Tucker Trips has an identity distinct from the generic travel-blog space it started in.',
    ],
  },
  {
    slug: 'talk-to-my-lawyer',
    title: 'Talk to My Lawyer',
    category: 'Web & app development',
    palette: ['#59f3ff', '#3c6cff'],
    services: ['Product design', 'Frontend build', 'Document generation UX'],
    summary:
      'Legal letters that took a lawyer’s time and a client’s patience; we turned the process into a guided flow anyone can complete in minutes.',
    body: [
      'Talk To My Lawyer’s core promise, generating a proper legal letter without booking a consultation, was undercut by a form-heavy interface that felt like paperwork rather than help.',
      'We rebuilt the letter-generation flow as a conversational step-by-step builder: plain-language questions in, properly formatted legal letter out, with legal terminology explained inline rather than assumed.',
      'We designed the output itself to look credible and ready to send, so trust is built into the deliverable instead of resting only on the marketing copy.',
      'What was a form is now a guided experience. It lowers the intimidation of legal work, which is the reason people come to the site in the first place.',
    ],
  },
  {
    slug: 'style',
    title: 'Style',
    category: 'E-commerce',
    palette: ['#ff8dd1', '#c084fc'],
    services: ['Product design', 'Frontend build', 'Storefront UX'],
    summary:
      'A clothing store with a great catalog and a forgettable browsing experience; we rebuilt it to feel like a boutique, not a spreadsheet.',
    body: [
      'Style had the inventory of a real fashion retailer but the browsing experience of a generic storefront theme: grid after grid with no point of view.',
      'We rebuilt the shopping experience around editorial presentation, with product pages that provide styling context, a faster filter-and-browse flow, and a checkout that gets out of the customer’s way.',
      'We paid particular attention to mobile, where fashion browsing often begins: large imagery, thumb-friendly filtering, and minimal friction from product to cart.',
      'The store now reads like a curated boutique instead of a catalog dump, which matters in a category where customers are buying a look, not just an item.',
    ],
  },
  {
    slug: 'zeus-towing-services',
    title: 'Zeus Towing Services',
    category: 'Web design',
    palette: ['#b9ff4a', '#ff8c73'],
    services: ['Web design', 'Local SEO structure', 'Mobile-first build'],
    summary:
      'A towing company losing calls to slow, cluttered competitor sites; we gave them a site built for the moment that matters: someone stranded, on their phone, right now.',
    body: [
      'Zeus Towing’s customers are rarely browsing calmly. They are stuck on the roadside and need a number to call immediately, while the old site buried that path behind slow loads and unnecessary scrolling.',
      'We rebuilt the site mobile-first, treating the phone number and service area as primary content rather than an afterthought: visible in seconds and never buried in a menu.',
      'We structured service pages clearly by tow type and coverage area, so customers and search engines can immediately understand what Zeus does and where.',
      'The site now matches the urgency of the moment it is built for: fast, direct, and designed to move a stranded customer from landing to phone call with minimal friction.',
    ],
  },
  {
    slug: 'prestige-online-learning',
    title: 'Prestige Online Learning',
    category: 'Web & app development',
    palette: ['#3c6cff', '#59f3ff'],
    services: ['Product design', 'Frontend build', 'Course platform UX'],
    summary:
      'An online school with strong courses hidden behind a confusing platform; we rebuilt it around the student’s path from browsing to finishing.',
    body: [
      'Prestige had strong course content, but the platform made it hard to tell what to take, how far along you were, or what came next.',
      'We rebuilt the experience around a clear learning path: structured course catalogs, visible progress tracking, and a dashboard that tells each student where they left off.',
      'We simplified enrollment and course navigation so the platform gets out of the way of learning instead of adding friction on top of it.',
      'The result is a school that feels like one coherent path from enrollment to completion instead of a pile of disconnected course pages.',
    ],
  },
  {
    slug: 'crystal-web-solution',
    title: 'Crystal Web Solution',
    category: 'Immersive web experience',
    palette: ['#59f3ff', '#c084fc'],
    services: ['Creative direction', 'WebGL development', 'Motion system'],
    summary:
      'An agency site that needed to prove its craft before making a claim; we turned the portfolio itself into one continuous interactive world.',
    body: [
      'A conventional agency page could list the right capabilities and still feel interchangeable. Crystal Web Solution needed a site whose behavior made the case before the copy did.',
      'We built one fixed WebGL world and let the DOM journey move through it: a reactive crystal, a flying work carousel, an assembling mark, and a contact beat that settles the experience into action.',
      'The motion runs from one shared clock, the artwork is generated in code, and the camera path is driven by section data so every transition belongs to the same spatial story.',
      'Reduced-motion and no-WebGL visitors receive the same content through a complete static path. The result is both the studio homepage and a working demonstration of how it approaches interaction, performance, and accessibility.',
    ],
  },
];

export function getProject(slug) {
  return PROJECTS.find((project) => project.slug === slug) || null;
}
