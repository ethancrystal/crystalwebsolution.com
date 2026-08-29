// Shared type surface for the JSDoc-typed .js/.jsx codebase. These re-export
// the @typedef declarations that live next to their data (lib/projects.js,
// lib/services.mjs, lib/site.js, lib/crm/project-contract.mjs) rather than
// duplicating the shape here, so the type and the data it describes can
// never drift apart. Per CLAUDE.md this repo stays plain JSX + JS — this
// file exists only for `tsc --noEmit` checking, no runtime TypeScript.

export type Project = import('../lib/projects.js').Project;

export type Service = import('../lib/services.mjs').Service;

export type NavLink = import('../lib/site.js').NavLink;
export type SiteConfig = import('../lib/site.js').SiteConfig;

export type ProjectCategoryValue = import('../lib/crm/project-contract.mjs').ProjectCategoryValue;
export type ProjectStatus = import('../lib/crm/project-contract.mjs').ProjectStatus;
export type RecordVisibility = import('../lib/crm/project-contract.mjs').RecordVisibility;
export type TaskStatus = import('../lib/crm/project-contract.mjs').TaskStatus;
export type TaskPriority = import('../lib/crm/project-contract.mjs').TaskPriority;
export type ApprovalStatus = import('../lib/crm/project-contract.mjs').ApprovalStatus;
export type DeliverableStatus = import('../lib/crm/project-contract.mjs').DeliverableStatus;
export type AttachmentStatus = import('../lib/crm/project-contract.mjs').AttachmentStatus;
export type ProjectRole = import('../lib/crm/project-contract.mjs').ProjectRole;

export type Review = import('../lib/reviews.js').Review;

/** The slide shape Stories.jsx derives from a Review and passes to ReviewCarousel. */
export interface ReviewSlide {
  id: string;
  reviewer: string;
  credit: string;
  rating: number;
  date: string;
  accent: string;
  quote: string;
  reviewHref: string;
}
