// Browser-safe `process` stand-in for the design-sync preview bundle.
//
// Next.js statically replaces `process.env.NEXT_PUBLIC_*` at build time, so
// repo modules that read it (lib/crmFlag.js: `process.env.NEXT_PUBLIC_CRM_ENABLED`)
// are correct in the app but compile to a bare `process` reference once
// esbuild bundles them for a browser preview. That reference sits at module
// scope in the shared bundle, so it throws
// `ReferenceError: process is not defined` while _ds_bundle.js is still
// evaluating — taking down EVERY preview card, not just the components that
// import it.
//
// The synth entry imports this module first. ES import evaluation order is
// depth-first in source order, so this runs before any repo module body —
// which an assignment at the top of the entry itself would NOT do, since
// imported modules evaluate before the importing module's statements.
//
// Empty env is the right default: every flag falls back to its unset branch,
// which is what a neutral preview should show.
globalThis.process ??= { env: {} };
globalThis.process.env ??= {};
