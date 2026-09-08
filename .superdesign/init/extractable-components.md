# Extractable components

## SubpageNav
- Source: `components/marketing/SubpageNav.jsx`
- Category: layout
- Description: Inner-page top nav with logo, marketing links, login, start-a-project
- Extractable props: none required (links come from SITE.nav)
- Hardcoded: SITE.nav labels, BrandLogo, burger

## MarketingFooter
- Source: `components/marketing/MarketingFooter.jsx`
- Category: layout
- Description: Footer with logo, explore links, enquiry, Manassas + Sharjah
- Extractable props: none
- Hardcoded: SITE fields, legal links

## PageHero
- Source: `components/marketing/PageHero.jsx`
- Category: layout
- Description: Eyebrow + single H1 + lede
- Extractable props: eyebrow (string), title (string), lede (string)
- Hardcoded: SectionReveal directions, text-plate

## ServiceEmblem
- Source: `components/marketing/ServiceEmblem.jsx`
- Category: basic
- Description: Per-signal SVG or 3D instrument
- Extractable props: signal (string), n (string), variant (svg|3d|static)
- Hardcoded: glyph set, reduced-motion strip
