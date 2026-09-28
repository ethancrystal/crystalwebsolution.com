// Feature flag controlling whether the CRM (client/employee/admin portals,
// auth pages) is reachable on this deployment. Defaults to enabled so local
// dev and the `preview` branch behave exactly as they always have; production
// can set NEXT_PUBLIC_CRM_ENABLED=false (Vercel Project Settings -> Environment
// Variables -> Production) to hide the portals and show only the landing page
// and contact form. The CRM launched 2026-08-27.
// NEXT_PUBLIC_ so the same build-time value is available in both the edge
// middleware and client components (Nav/Menu) without a network round trip.
export const CRM_ENABLED = process.env.NEXT_PUBLIC_CRM_ENABLED?.trim().toLowerCase() !== 'false';
