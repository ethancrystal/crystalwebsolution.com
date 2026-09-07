# Page dependency trees

## /services/[slug]
Entry: app/services/[slug]/page.jsx
Dependencies:
- components/marketing/MarketingShell.jsx
  - components/marketing/SubpageExperience.jsx
    - components/SmoothScroll.jsx
    - components/FocusVeil.jsx
    - components/ScrollProgress.jsx
    - components/marketing/SubpageNav.jsx
      - components/BrandLogo.jsx
      - components/Magnetic.jsx
      - components/Menu.jsx
      - lib/site.js
    - components/marketing/IdleScene.jsx
      - components/three/Crystal.jsx
      - components/three/Particles.jsx
      - components/three/Lights.jsx
      - lib/useRenderQuality.js
    - components/marketing/MarketingFooter.jsx
- components/marketing/ServicePage.jsx
  - components/marketing/PageHero.jsx
    - components/SectionReveal.jsx
  - components/marketing/ContentSection.jsx
  - components/marketing/ContactForm.jsx
  - components/marketing/ServiceEmblem.jsx
    - components/three/ServiceEmblem3D.jsx
  - lib/servicePages.mjs
- components/marketing/ServiceSchema.jsx
- app/styles/service-pages.css
- app/styles/tokens.css
- .superdesign/design-system.md

## /services
Entry: app/services/page.jsx
Dependencies:
- components/marketing/MarketingShell.jsx (same tree as above)
- components/marketing/PageHero.jsx
- components/marketing/ContentSection.jsx
- components/marketing/ServiceGrid.jsx
  - components/ui/GlowCard.jsx
  - components/marketing/ServiceEmblem.jsx
- components/marketing/ServiceThreadArc.jsx
