---
name: ttml-ui-design-expert
description: Provide product UI guidance, wireframe text, Tailwind-ready component outlines, and accessibility checks for the TTML React 19 + Vite 7 + Tailwind v4 + shadcn/ui + wouter frontend.
license: MIT
metadata:
  version: "1.1.0"
---
# TTML UI Design Expert

## Overview
Turn vague product asks into **clear flows, wireframe copy, and component outlines** for the canonical TTML frontend: **React 19 + Vite 7 + TypeScript + Tailwind CSS v4 (OKLCH tokens) + shadcn/ui + wouter** routing, with TanStack Query for server state. Include a11y notes.

## When to Use
- New screen or flow, ambiguous UX, or copy overhaul.
- Requests for Tailwind component breakdowns.
- Role-specific dashboards (`/dashboard`, `/employee`, `/attorney`, `/admin`).

## Output Contract
Return Markdown with sections:
- **User Goals & Risks**
- **Happy Path Flow (steps 1–N)**
- **Edge Cases & Empty States**
- **Components (shadcn/ui)** with Tailwind class hints (v4 OKLCH tokens)
- **Copy Deck** (microcopy only; no brand claims)
- **A11y Checklist** (contrast, focus order, labels, error text)
- **Handoff Notes** (test ids, analytics events, wouter route path)

## Guardrails
- No claims about "AI drafting" — always frame as "attorney-drafted" or "attorney-reviewed"
- Keep copy concise and legally safe
- Respect payment gate UX: full letter body is blurred/truncated before payment, with a clear unlock CTA
- Respect status machine: use the real states from `shared/types/letter.ts` in any status pill or timeline

## Example Prompts
- "Design the letter timeline with the full status machine (submitted → researching → drafting → generated_locked → pending_review → under_review → approved → client_approval_pending → client_approved → sent); add empty and failure states."
- "Onboarding for employee discount codes — include redemption UX and errors."
