# Forms

## Approach

- There is no form library: controlled React state, native `FormData`, and React `useActionState` / `useFormStatus` where a server action submits.
- Validation shared by client and server lives in `lib/` (for example `lib/contactForm.mjs`).

## Conventions

- Contact: `components/marketing/ContactForm.jsx` posts JSON to `/api/contact`. Server `errors` merge into the same field state.
- Production request (homepage, default tab of `components/sections/ContactIntake.jsx`): `components/marketing/ProductionRequestForm.jsx` posts the same route with `kind: 'production'`. `lib/contactForm.mjs` holds a separate validator (`validateProductionRequest`) and `validateContactSubmission` picks one by `kind`; the web-brief validator and its six-key `data` shape are untouched. Production `data` is a superset of that shape (`brief` is composed from category, size, quantity, artwork link and notes; `budget` and `company` are empty), so the webhook, `create_lead_from_contact` (`p_source: 'website_production_request'`) and the emails need no migration. Artwork (up to 3 files, 10 MB each, 25 MB together; limits in `lib/contactArtwork.mjs` and mirrored in migration 0053) uploads in two phases: `/api/contact` stores the lead and returns signed upload URLs (`lib/contactArtworkServer.js`), the browser PUTs straight to the private `contact-artwork` bucket (`lib/uploadContactArtwork.js`), then `/api/contact/artwork/complete` checks size and file signature and attaches the files to the CRM deal. Admins download through `/api/admin/contact-artwork/<id>` (60 second signed URL). The form also accepts an optional share link. `ContactIntake` keeps typed input when the visitor switches tabs.
- CRM project and brief forms submit to server actions and read `{ ok, error }`.
- CRM admin entity forms use `AdminFormShell` and write through the browser client under RLS.
- Errors show inline under the field with `aria-invalid` and `aria-describedby`. A honeypot plus optional hCaptcha guards public forms.
