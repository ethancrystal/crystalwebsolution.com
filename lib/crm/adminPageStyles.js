// Shared tw:-prefixed Tailwind class strings for the admin CRUD list pages
// (companies/contacts/deals/tasks/...). These replace the identical
// crm-admin-page/crm-table/crm-button styled-jsx block each page used to
// carry independently — same idea as lib/easing.js for GSAP tokens.

export const ADMIN_PAGE =
  'tw:min-h-screen tw:bg-gradient-to-br tw:from-crm-bg tw:to-crm-bg2 tw:p-8 tw:text-crm-text';

export const ADMIN_HEADER =
  'tw:mx-auto tw:mb-8 tw:flex tw:max-w-[1200px] tw:items-center tw:justify-between';

export const ADMIN_HEADER_TITLE = 'tw:text-[2rem] tw:text-crm-cyan';

// The :disabled variants only ever match real <button> elements (never the
// <Link>/<a> usages on list pages), so they're safe to fold into one shared
// constant rather than keeping a separate form-only button.
export const BUTTON =
  'tw:inline-block tw:cursor-pointer tw:rounded-md tw:border-0 tw:bg-gradient-to-br tw:from-crm-cyan tw:to-[#5bb8ff] tw:px-6 tw:py-3 tw:text-[1rem] tw:font-semibold tw:text-crm-bg tw:no-underline tw:transition-all tw:duration-200 tw:[transition-timing-function:ease] tw:hover:-translate-y-0.5 tw:hover:shadow-[0_4px_16px_rgba(100,200,255,0.3)] tw:disabled:cursor-not-allowed tw:disabled:opacity-60 tw:disabled:hover:translate-y-0';

export const TABLE_CONTAINER =
  'tw:mx-auto tw:max-w-[1200px] tw:overflow-hidden tw:rounded-xl tw:border tw:border-[rgba(100,200,255,0.1)] tw:bg-[rgba(30,35,60,0.8)] tw:backdrop-blur-[10px]';

export const TABLE = 'tw:w-full tw:border-collapse';
export const TABLE_HEAD = 'tw:border-b tw:border-[rgba(100,200,255,0.2)] tw:bg-[rgba(15,20,40,0.6)]';
export const TABLE_TH = 'tw:p-4 tw:text-left tw:font-semibold tw:text-crm-cyan';
export const TABLE_TD = 'tw:border-t tw:border-[rgba(100,200,255,0.1)] tw:p-4 tw:text-[#ccc]';
export const TABLE_ROW_HOVER = 'tw:hover:bg-[rgba(100,200,255,0.05)]';

export const ACTIONS = 'tw:flex tw:gap-4';

export const LINK =
  'tw:text-[0.9rem] tw:text-crm-cyan tw:no-underline tw:transition-colors tw:duration-200 tw:[transition-timing-function:ease] tw:hover:text-[#5bb8ff] tw:hover:underline';

export const EMPTY_STATE = 'tw:px-4 tw:py-12 tw:text-center';
export const EMPTY_STATE_P = 'tw:mb-4 tw:text-[#999]';

export const ERROR =
  'tw:mx-auto tw:mb-4 tw:max-w-[1200px] tw:rounded-md tw:border tw:border-[rgba(255,100,100,0.3)] tw:bg-[rgba(255,100,100,0.1)] tw:p-4 tw:text-crm-red';

export const LOADING =
  'tw:flex tw:min-h-screen tw:items-center tw:justify-center tw:text-[1.2rem] tw:text-crm-cyan';

// Form/detail pages (new/[id]/[id]/edit) share a second boilerplate family,
// narrower (700px) than the list pages' 1200px shell.
export const FORM_HEADER =
  'tw:mx-auto tw:mb-8 tw:flex tw:max-w-[700px] tw:items-center tw:justify-between';

export const FORM_ERROR =
  'tw:mx-auto tw:mb-4 tw:max-w-[700px] tw:rounded-md tw:border tw:border-[rgba(255,100,100,0.3)] tw:bg-[rgba(255,100,100,0.1)] tw:p-4 tw:text-crm-red';

export const FORM_CARD =
  'tw:mx-auto tw:max-w-[700px] tw:rounded-xl tw:border tw:border-[rgba(100,200,255,0.2)] tw:bg-[rgba(30,35,60,0.8)] tw:p-8 tw:backdrop-blur-[10px]';

export const FIELD = 'tw:mb-6 tw:flex tw:flex-1 tw:flex-col tw:gap-2';
export const FIELD_ROW = 'tw:flex tw:gap-6';
// Margin-top varies by page (2rem on new/edit forms, 1rem on the read-only
// detail page) so it's applied locally — this constant is gap+flex only.
export const FORM_ACTIONS = 'tw:flex tw:gap-4';
export const FIELD_LABEL =
  'tw:text-[0.85rem] tw:font-semibold tw:uppercase tw:tracking-[0.5px] tw:text-[#999]';
export const INPUT =
  'tw:rounded-md tw:border tw:border-[rgba(100,200,255,0.2)] tw:bg-[rgba(15,20,40,0.6)] tw:p-3 tw:text-[1rem] tw:text-crm-text tw:focus:border-crm-cyan tw:focus:outline-none';

export const BUTTON_SECONDARY =
  'tw:inline-block tw:rounded-md tw:border tw:border-[rgba(100,200,255,0.3)] tw:bg-[rgba(100,200,255,0.1)] tw:px-6 tw:py-3 tw:text-[1rem] tw:font-semibold tw:text-crm-cyan tw:no-underline tw:transition-all tw:duration-200 tw:[transition-timing-function:ease] tw:hover:bg-[rgba(100,200,255,0.2)]';

export const DELETE_BUTTON =
  'tw:ml-auto tw:cursor-pointer tw:rounded-md tw:border tw:border-[rgba(255,100,100,0.3)] tw:bg-[rgba(255,100,100,0.1)] tw:px-6 tw:py-3 tw:text-[1rem] tw:font-semibold tw:text-crm-red tw:transition-all tw:duration-200 tw:[transition-timing-function:ease] tw:hover:bg-[rgba(255,100,100,0.2)] tw:disabled:cursor-not-allowed tw:disabled:opacity-60';

export const VALUE = 'tw:text-[1rem] tw:text-crm-text';
export const NOTES_WRAP = 'tw:mx-auto tw:mt-6 tw:max-w-[700px]';

// Shared shape for contacts' and tasks' status pills. Deliberately excludes
// color/background/border-color: two Tailwind utilities that both set the
// same CSS property (e.g. two different bg-[...] arbitrary values) race on
// generated-stylesheet order, not on className string order, so each
// consumer must supply one complete, non-overlapping color variant per
// status rather than layering a "default color" class under an override.
export const STATUS_BADGE_BASE =
  'tw:inline-block tw:rounded-full tw:border tw:px-3 tw:py-1 tw:text-[0.8rem] tw:capitalize';
