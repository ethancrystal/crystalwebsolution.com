Add the following at the beginning of the plan. It converts the document from a proposal into an agent-executable implementation specification.

0. Agent Execution Contract

0.1 Immediate Execution Directive

This document is an executable implementation specification.

Any coding agent, developer, or automated worker that receives this document must begin implementation immediately after completing the mandatory current-state inspection defined below.

The agent must not:

* Rewrite this plan into another plan.
* Produce only recommendations.
* Repeat the architecture proposal.
* Ask for approval already established by this document.
* Begin creating pages from assumptions.
* Replace existing content before inspecting it.
* Skip repository discovery.
* Modify production directly.
* Modify unrelated CRM or Supabase systems.

The required behavior is:

1. Inspect the current repository.
2. Read the current pages, sections, components, content, routes, tests, and configuration.
3. Compare the current implementation with this specification.
4. Create an isolated feature branch or worktree.
5. Implement the missing requirements.
6. Preserve valid existing functionality and content.
7. Run tests and production-build verification.
8. Publish through a draft pull request targeting preview.

The inspection phase is part of implementation. It is not a separate planning phase.

⸻

0.2 Current Repository Is the Source of Truth

The current repository state takes precedence over assumptions made when this document was written.

The agent must verify all referenced paths, exports, component names, content structures, and route implementations before editing them.

When the repository differs from this specification:

* Preserve working architecture unless it violates an explicit requirement.
* Adapt file paths to the current repository structure.
* Reuse existing components when they already satisfy the requirement.
* Do not create duplicate components with different names.
* Do not remove newer functionality merely because it is not mentioned here.
* Record material differences in the pull-request description.

This specification defines the required outcome. The current repository defines the exact implementation context.

⸻

0.3 Mandatory Read-Before-Write Condition

No marketing page, section, component, navigation item, metadata record, form, stylesheet, or content block may be created or modified until the agent has inspected its current implementation and all directly related dependencies.

Before changing a page, the agent must read:

1. The current route file.
2. Every component rendered directly by that route.
3. Every shared component those components depend on.
4. The page’s current content source.
5. The page’s current metadata implementation.
6. Relevant CSS classes and design tokens.
7. Existing tests for that route or feature.
8. Related navigation and sitemap definitions.
9. Related API or backend boundaries when the page contains a form.
10. Current Git history or recent commits when the reason for an unusual implementation is unclear.

Reading only filenames, search snippets, or isolated fragments is insufficient.

The agent must inspect complete relevant files or complete logical sections before editing.

⸻

0.4 Mandatory Current-Page Audit

Before implementation, the agent must inspect every current public marketing route.

At minimum, inspect:

/
 /work
 /work/[slug]
 /reviews
 /embroidery-screen-printing-web-design
 /login
 /signup
 /forgot-password
 /dashboard
 /team
 /admin

The authenticated routes are inspected only for regression awareness. They are not part of the marketing implementation scope.

The agent must identify:

* Which routes already exist.
* Which routes are static.
* Which routes are dynamic.
* Which pages generate metadata.
* Which pages use structured data.
* Which pages use homepage-specific runtime systems.
* Which pages use shared layouts.
* Which pages contain reusable marketing patterns.
* Which pages contain claims that must be preserved.
* Which pages depend on Supabase or authentication.
* Which routes are controlled by NEXT_PUBLIC_CRM_ENABLED.

The implementation must not proceed until this route map is understood.

⸻

0.5 Mandatory Homepage Section Audit

The homepage is an interconnected WebGL journey and must be treated as a system rather than a collection of isolated sections.

Before changing homepage navigation, links, content, or service rows, the agent must inspect the current implementation of every homepage section.

At minimum, inspect:

* Hero
* About
* Services
* Approach
* Stories or Work
* Mark
* Lab
* Motion
* Contact

The agent must also inspect:

* Experience
* Scene
* Journey or camera-position configuration
* Beat-progress logic
* Service signal logic
* Navigation
* Fullscreen menu
* Smooth-scroll implementation
* Loading system
* Focus or transition overlays
* Scroll-progress components

The agent must determine:

* Current section order.
* Current section IDs.
* Existing hash links.
* Existing camera stops.
* Existing service signals.
* Existing hover and keyboard behavior.
* Existing contact-form integration.
* Existing homepage-to-inner-page links.
* Which content is hardcoded and which is data-driven.

No homepage section may be reordered, renamed, removed, or inserted into the camera journey as part of this project.

⸻

0.6 Mandatory Content Audit

Before writing replacement content, the agent must read the current visible content for:

* Homepage sections.
* Work index.
* Every current case study.
* Reviews page.
* Existing specialty landing page.
* Navigation.
* Menu.
* Footer or footer-like content.
* Contact section.
* Existing service definitions.
* Site metadata.
* Structured data.
* Sitemap.
* Business identity information.

The agent must create an internal content inventory containing:

* Existing headings.
* Existing service names.
* Existing claims.
* Existing statistics.
* Existing testimonials.
* Existing project descriptions.
* Existing calls to action.
* Existing business details.
* Existing email addresses.
* Existing location information.
* Existing service relationships.

Content already present in the repository must not be silently discarded.

⸻

0.7 Content Preservation Rule

Existing verified content must be preserved unless one of the following conditions applies:

1. The content is demonstrably outdated.
2. The content contradicts another verified source.
3. The content contains a grammatical or clarity defect.
4. The content is duplicated unnecessarily.
5. The content conflicts with the approved positioning.
6. The content creates an SEO duplication problem.
7. The specification explicitly replaces it.

When existing content is changed, the new version must preserve its factual meaning unless the source material supports a factual correction.

The agent must not invent:

* Client results.
* Revenue increases.
* Conversion percentages.
* Team size.
* Project volume.
* Awards.
* Certifications.
* Partnerships.
* Office locations.
* Client quotations.
* Years of experience beyond verified information.

⸻

0.8 Source Precedence

When facts or content conflict, use this precedence order:

1. Current verified repository implementation.
2. Current verified site configuration.
3. Existing case-study data.
4. Existing review data.
5. Verified Supabase or backend configuration where relevant.
6. This implementation specification.
7. Reasonable inference, clearly identified and used only when unavoidable.

The agent must not use unsupported external assumptions to override repository facts.

⸻

0.9 Mandatory File Inspection

Before implementation, inspect the current versions of the following files or their current equivalents:

package.json
next.config.js
vercel.json
middleware.js
app/layout.jsx
app/page.jsx
app/globals.css
app/sitemap.js
app/robots.js
lib/site.js
lib/services.mjs
lib/projects.js
lib/contactForm.mjs
lib/crmFlag.js
components/Nav.jsx
components/Menu.jsx
components/Experience.jsx
components/Scene.jsx
components/sections/Contact.jsx
components/sections/Services.jsx
app/work/page.jsx
app/work/[slug]/page.jsx
app/reviews/page.jsx
app/embroidery-screen-printing-web-design/page.jsx
tests/services.test.mjs
tests/contactForm.test.mjs

When a listed file has moved or been renamed, locate its replacement and record the mapping.

The agent must also search for:

SITE.nav
SITE.authNav
CRM_ENABLED
generateMetadata
generateStaticParams
application/ld+json
/api/contact
service signal
#contact
#services

⸻

0.10 Existing Pattern Reuse Condition

Before creating a new implementation pattern, the agent must identify the strongest existing pattern in the repository.

Required reuse decisions include:

* Use the current case-study data and dynamic-route pattern as the reference for service-page generation.
* Use the current site configuration as the source for navigation and business identity.
* Use the current contact-form API and validation system.
* Use the existing CSS variables and visual tokens.
* Use the existing metadata style where it already satisfies the requirements.
* Use the existing CRM feature flag.
* Use existing Next.js conventions.
* Use existing package-management and test commands.

A new abstraction may be introduced only when:

* At least two pages or features require it.
* It reduces actual duplication.
* It has one clear responsibility.
* Its interface is understandable without reading its internals.
* It does not increase homepage bundle size unnecessarily.

⸻

0.11 Isolated Implementation Requirement

The agent must never implement this project directly on:

main
preview
production

The agent must:

1. Confirm the current branch.
2. Confirm the working tree is clean or identify unrelated changes.
3. Create an isolated worktree or feature branch from the current preview branch.
4. Use a branch name such as:

agent/marketing-inner-pages

5. Keep all work inside that isolated branch.
6. Never force-push a shared branch.
7. Never deploy directly to production.
8. Never run vercel --prod.
9. Open a draft pull request targeting preview.

If the existing working directory contains unrelated changes, the agent must not stage, overwrite, discard, or include them.

⸻

0.12 Baseline Verification Requirement

Before modifying source files, run the current baseline checks.

Required commands:

pnpm install --frozen-lockfile
pnpm test
pnpm build

When the repository documents a different required command, use the documented command and record the difference.

If the baseline fails before changes:

* Capture the exact failure.
* Determine whether it is caused by missing environment configuration, dependencies, or existing code.
* Do not attribute the failure to the new implementation.
* Continue only when the failure does not prevent reliable validation.
* Document unresolved baseline failures in the pull request.

⸻

0.13 Implementation Without Replanning

After the audit and baseline checks are complete, the agent must implement the specification directly.

The agent must not stop to produce another architecture document.

The work sequence is mandatory:

1. Establish tests for service and marketing data contracts.
2. Add stable service slugs.
3. Create detailed service-page content records.
4. Build the shared marketing component system.
5. Extract the existing contact form into a reusable component.
6. Reconnect the homepage contact section.
7. Build /about.
8. Build /services.
9. Build /process.
10. Build /contact.
11. Build /services/[slug].
12. Add generated metadata and structured data.
13. Update navigation and homepage links.
14. Align existing work, review, and specialty pages with the shared shell.
15. Update sitemap.
16. Run full tests and build.
17. Complete browser and accessibility QA.
18. Push the branch.
19. Open a draft pull request into preview.

The agent may adjust task order only when a dependency requires it.

⸻

0.14 Test-Driven Implementation Condition

For every independently testable data or logic requirement:

1. Write or update the failing test.
2. Run the test and confirm the expected failure.
3. Implement the minimum required change.
4. Run the focused test.
5. Run the relevant test group.
6. Commit the independently working change.

Required automated coverage includes:

* Service slug uniqueness.
* Homepage-to-service-page mapping.
* Service-page data completeness.
* SEO metadata uniqueness.
* Related-service validity.
* Sitemap coverage.
* Navigation coverage.
* Contact-form source-contract preservation.
* Absence of placeholder content.
* Absence of unsupported claims defined by the test contract.

Visual presentation must be verified through browser inspection in addition to source tests.

⸻

0.15 Page Implementation Template

Every standard marketing page must use this implementation sequence:

Step 1: Read Current Context

Read:

* Relevant existing page.
* Related homepage section.
* Current site data.
* Current CSS.
* Related content source.
* Existing metadata pattern.
* Existing tests.

Step 2: Define Page Data

Confirm:

* Route.
* H1.
* Metadata.
* Content sections.
* Calls to action.
* Related pages.
* Structured data.
* Existing content to preserve.

Step 3: Implement With Shared Components

Use:

MarketingShell
MarketingHeader
MarketingFooter
PageHero
ContentSection

Use additional shared components only where required.

Step 4: Add SEO

Add:

* Unique title.
* Unique description.
* Canonical URL.
* Open Graph metadata.
* Twitter metadata.
* Breadcrumbs.
* Appropriate schema.

Step 5: Validate

Check:

* Mobile layout.
* Desktop layout.
* Keyboard navigation.
* Reduced motion.
* Heading hierarchy.
* Internal links.
* Metadata.
* Console output.
* Production build.

⸻

0.16 Service Page Implementation Template

Every service page must be generated through the shared dynamic route.

The agent must not create eight unrelated handcrafted route files.

Required pattern:

app/services/[slug]/page.jsx
lib/servicePages.mjs
components/marketing/ServicePage.jsx

Each service record must contain complete content for:

* Slug.
* Signal.
* Title.
* SEO title.
* Meta description.
* Eyebrow.
* Hero.
* Introduction.
* Problem or opportunity.
* Capabilities.
* Deliverables.
* Process.
* Ideal-client profile.
* FAQ.
* Related services.
* Final CTA.

Before writing a service page, the agent must read:

* Its current homepage service row.
* Its current service signal.
* Related case studies.
* Existing site copy mentioning that service.
* Related service definitions.
* Existing claims and deliverables.

The final service-page content must extend the existing positioning rather than contradict or replace it arbitrarily.

⸻

0.17 Existing Page Migration Condition

Before wrapping an existing page with the new marketing system, the agent must document:

* Existing content.
* Existing metadata.
* Existing structured data.
* Existing route behavior.
* Existing dynamic parameters.
* Existing links.
* Existing styles.
* Existing claims.

Migration must preserve:

* Route URL.
* Static-generation behavior.
* Dynamic slug behavior.
* Existing project data.
* Existing review content.
* Existing specialty-page claims.
* Existing indexing behavior.

Migration may change presentation structure but must not silently alter factual content.

⸻

0.18 Contact Form Protection Condition

Before extracting or reusing the contact form, the agent must inspect:

components/sections/Contact.jsx
lib/contactForm.mjs
app/api/contact/route.js
tests/contactForm.test.mjs

The agent must identify the exact current equivalents when paths differ.

The implementation must preserve:

* Field names.
* Required fields.
* Field-length limits.
* Honeypot.
* API URL.
* Request payload.
* Success behavior.
* Error behavior.
* Email delivery.
* Webhook delivery.
* Reply-to behavior.
* Spam protection.

The extraction is a presentation refactor, not a backend redesign.

No Supabase table or schema may be introduced for the marketing contact form.

⸻

0.19 Styling Implementation Condition

Before adding styles, the agent must inspect:

* Existing CSS variables.
* Typography rules.
* Spacing scale.
* Buttons.
* Links.
* Cards.
* Breakpoints.
* Focus styles.
* Reduced-motion rules.
* Current public-page styles.

New styles must:

* Use existing tokens where possible.
* Remain in the existing CSS architecture.
* Avoid introducing Tailwind.
* Avoid introducing CSS-in-JS.
* Avoid adding a new component library.
* Avoid duplicating existing utility patterns.
* Avoid global selectors that affect CRM pages.
* Scope marketing-specific styles safely.

⸻

0.20 Mandatory Regression Boundaries

The agent must verify that the implementation does not alter:

* Supabase schema.
* Supabase migrations.
* Supabase RLS.
* Supabase storage policies.
* Authentication.
* Role resolution.
* Middleware access rules.
* CRM project actions.
* Notification cron.
* Existing CRM routes.
* Homepage section order.
* Homepage camera stops.
* Homepage WebGL actors.
* Existing service signals.
* Existing contact API behavior.
* Production deployment settings.

Any change in these areas must be removed from the marketing pull request unless strictly required to fix a verified regression introduced by the implementation.

⸻

0.21 Browser Verification Matrix

The agent must render and inspect every affected public route.

Required routes:

/
 /about
 /services
 /services/web-design
 /services/web-development
 /services/branding
 /services/logo-design
 /services/digital-marketing
 /services/animation
 /services/ai-automation
 /services/workflow-automation
 /process
 /contact
 /work
 /work/[every-current-slug]
 /reviews
 /embroidery-screen-printing-web-design

Regression routes:

/login
/signup
/forgot-password
/dashboard
/team
/admin

Required viewport checks:

* 360px mobile.
* 768px tablet.
* 1024px laptop.
* 1440px desktop.

Required interaction checks:

* Header navigation.
* Mobile menu.
* Escape-key behavior.
* Focus order.
* Service links.
* Related-service links.
* Work links.
* FAQ controls.
* Contact form.
* Form errors.
* Form success behavior.
* Reduced-motion mode.
* Homepage WebGL behavior.
* Homepage service hover signals.
* No horizontal overflow.
* No hydration errors.
* No console errors.

⸻

0.22 Mandatory Evidence Before Completion

The agent may not claim completion without producing evidence for:

* Feature branch name.
* Base commit.
* Changed-file list.
* Test command and result.
* Production-build command and result.
* Browser QA route list.
* Accessibility checks.
* Sitemap verification.
* Metadata verification.
* Contact-form verification.
* Confirmation that no Supabase migrations changed.
* Confirmation that no CRM files changed outside approved shared navigation boundaries.
* Vercel preview URL.
* Draft pull-request URL.

Statements such as “should work,” “appears correct,” or “implementation is complete” are not acceptable substitutes for verification.

⸻

0.23 Pull Request Requirements

The draft pull request must target:

preview

The pull-request description must include:

Summary

What was built.

Current-State Audit

What existing pages, sections, components, and content were inspected.

Architecture

How inner marketing pages remain isolated from homepage WebGL runtime.

Content

What content was preserved, extended, or corrected.

Routes Added

Complete new-route list.

Files Changed

Grouped by:

* Data.
* Components.
* Pages.
* Styling.
* SEO.
* Tests.

Validation

Exact results for:

pnpm test
pnpm build

Browser QA

Routes and viewports tested.

Regression Boundaries

Confirmation that CRM, Supabase, authentication, middleware, and production deployment configuration were not modified.

Known Limitations

Any incomplete or environment-dependent validation.

⸻

0.24 Stop Conditions

The agent must stop destructive implementation and report the blocker when:

* The repository cannot be identified.
* The current branch cannot be determined.
* The working tree contains unrelated changes that cannot be isolated.
* The preview branch cannot be accessed.
* Existing content required for implementation cannot be read.
* The contact-form implementation cannot be located.
* The current service definitions cannot be located.
* Required build dependencies cannot be installed.
* The production build cannot run for reasons that make validation unreliable.
* Repository write access is unavailable.

The agent must not stop merely because:

* File names differ from this document.
* Existing components require adaptation.
* Content needs to be synthesized from existing sections.
* Some implementation details require engineering judgment.
* A page does not yet exist.
* The task is large.

In those cases, the agent must continue using the current repository and this specification as combined guidance.

⸻

0.25 Final Agent Instruction

Upon reading this document:

Inspect the complete current implementation before editing. Treat current pages, sections, components, content, data, tests, and configuration as mandatory source material. Then implement the specification immediately in an isolated branch, preserve verified existing behavior, validate the complete system, and deliver the work through a draft pull request into preview.

Do not return another plan.

Do not begin from assumptions.

Read first, then implement.

Place this section before your existing Global Standards section. The rest of the plan then becomes the implementation requirements the agent must execute.