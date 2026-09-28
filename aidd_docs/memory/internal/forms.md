# Forms

## Approach

- There is no form library: controlled React state, native `FormData`, and React `useActionState` / `useFormStatus` where a server action submits.
- Validation shared by client and server lives in `lib/` (for example `lib/contactForm.mjs`).

## Conventions

- Contact: `components/marketing/ContactForm.jsx` posts JSON to `/api/contact`. Server `errors` merge into the same field state.
- CRM project and brief forms submit to server actions and read `{ ok, error }`.
- CRM admin entity forms use `AdminFormShell` and write through the browser client under RLS.
- Errors show inline under the field with `aria-invalid` and `aria-describedby`. A honeypot plus optional hCaptcha guards public forms.
