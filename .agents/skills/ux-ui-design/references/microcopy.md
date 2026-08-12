# Microcopy Guide

Words are UI. Labels, buttons, and error messages are designed artifacts that do real work — they orient, instruct, reassure, and recover. Write them for real states, with real strings. No lorem ipsum, no placeholder errors, no "TODO copy."

## Voice principles
- **Clear over clever.** The user is mid-task, not reading for fun. A pun that costs a re-read is a bug.
- **Concise.** Cut every word that doesn't help the user act. Front-load the important word.
- **Human, calm, blame-free.** Speak to a person. Never blame the user ("you entered it wrong"); the system shares responsibility.
- **Consistent.** One term per concept across the whole product. Don't alternate "remove / delete / clear" for the same action. Keep a term list.
- **User's language, not the system's.** No internal IDs, table/model names, codes, or developer phrasing. Mirror how the user describes the thing.
- **Active voice, present tense, second person.** "Add a card," not "A card can be added."

## Buttons & actions
- **Verb + object describing the outcome:** "Create project", "Send invite", "Save changes". The user should predict what happens before clicking.
- **Avoid bare "OK / Submit / Yes / No"** in consequential dialogs — restate the action: "Delete project" / "Keep project".
- Keep button text short (1–3 words) but specific. "Get started" beats "Submit" for a first action.
- The **primary** button = the main forward action; at most one per view. Secondary/cancel are visually quieter and clearly labeled ("Cancel", not a bare X when consequences exist).
- Destructive button names the destruction ("Delete 3 files"), and is not the default focus.

## Labels & helper text
- **Label = the noun the user expects** ("Email address", not "User identifier").
- Show **format/constraints up front** as helper text, not as a post-submit error: "8+ characters, including a number." Don't make the user fail to learn the rule.
- Mark the minority (required *or* optional), consistently.
- Don't use the placeholder as the label — it vanishes on focus and fails accessibility. Placeholders are for *example* values ("e.g. jane@work.com"), used sparingly.

## Error messages — the recovery formula
A good error answers three things, in plain language: **what happened → why (if useful) → how to fix it.** Tie it to the specific field/cause, and never expose a raw code or stack trace.

| Don't | Do |
|---|---|
| "Invalid input." | "Enter a valid email, like jane@work.com." |
| "Error 422." | "That username is taken. Try another." |
| "Something went wrong." | "We couldn't save your changes. Check your connection and try again." |
| "Password incorrect." (after wiping the field) | "That password didn't match. Try again — your email is saved." |
| "Field required." | "Add a project name to continue." |
| "Payment failed." | "Your card was declined. Check the number or try another card." |

Rules:
- **Specific, not generic.** Name the field and the constraint.
- **Constructive.** Always offer the next step (retry, edit, choose another, contact).
- **Preserve the user's input.** Never clear what they typed because one field failed.
- **Locate the error** at the field, plus a summary + focus-move for multi-error forms.
- **Don't moralize.** No "oops!", no exclamation pile-ups, no cute mascots in front of a blocked task.
- For system/server errors the user can't fix, say so honestly and give a path: retry, status page, or support — with a reference ID *for support*, not as the whole message.

## Empty states (the most-skipped, highest-leverage copy)
An empty state is an onboarding opportunity, not a dead end. It must say **what goes here, why it's worth it, and the one action to fill it.**

- **First-run empty:** "No projects yet. Create your first to start tracking work." + a primary `[Create project]` button. Optionally a one-line value hint or example.
- **No-results empty (search/filter):** confirm the query, suggest a fix, offer recovery: "No results for 'invoce'. Check spelling or [clear filters]." Never identical to first-run.
- **Cleared / all-done empty:** acknowledge positively: "All caught up — no pending tasks." Not an error tone.
- Always pair the explanation with a way forward. "No data" alone is a failure.

## Confirmations & destructive actions
- Name the **specific object and consequence**: "Delete 'Q3 Budget'? This permanently removes 14 entries and can't be undone."
- Prefer **undo over confirm** for reversible actions ("Deleted. [Undo]") — it's faster and less interrupting. Reserve modal confirmation for the truly irreversible.
- Confirm/cancel labels restate the action; the **safe** option is the default.

## Success & status
- Confirm completion visibly and briefly: "Saved", "Invite sent to jane@work.com". Include the relevant detail (what, to whom, when) when it aids trust.
- For long operations, say what's happening and roughly how long, not just a spinner.
- Toasts confirm; they don't carry critical or actionable info as the only home.

## Numbers, dates, and units
- Humanize where it helps ("2 minutes ago", "Yesterday") but show exact values on demand (tooltip/title).
- Pluralize correctly ("1 item" / "2 items"); never "1 items" or "item(s)".
- Localize formats; respect the user's locale for dates, numbers, currency.
- Be precise where precision matters (money, legal, medical) — don't fuzz exact figures.

## Tone-matching
Calibrate formality to context and stakes. A children's app, a tax tool, and a hospital chart want different registers. **High-stakes or error moments → drop the playfulness and be plain.** Never make a blocked or anxious user read jokes.

## Microcopy checklist
- [ ] Every button names its outcome (verb + object); one primary per view
- [ ] No bare "Submit/OK" on consequential actions; destructive buttons name the destruction
- [ ] Labels in user vocabulary; format/requirements shown before submit
- [ ] No placeholder-as-label; no jargon, IDs, or raw codes anywhere in the UI
- [ ] Every error: what + how-to-fix, field-specific, input preserved, blame-free
- [ ] Empty states explain what-goes-here + a way forward (first-run ≠ no-results)
- [ ] Destructive actions: undo where possible, else specific confirm with safe default
- [ ] One term per concept across the product
- [ ] Plurals, dates, numbers, and currency formatted/localized correctly
- [ ] Tone matches stakes; no jokes in front of blocked tasks

Cross-reference: which states need copy → `state-inventory.md`; voice/visual tone alignment → `[[website-designer]]`; audience vocabulary and mental models → `[[market-research-expert]]`.
