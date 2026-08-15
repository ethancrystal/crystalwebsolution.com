# User Flow & UX Principles: CRM Client Portal

## User Flow: Client Milestone and Asset Collaboration

**Entry Point**: Client logs in at `/login/client` or navigates to `/dashboard`.

**Flow Steps**:
1. **Workspace Dashboard**
   - High-level project health card: Status indicator (e.g. *In Progress*, *Under Review*).
   - Milestone progress bar (e.g. *3 of 5 milestones complete*).
   - Primary action list: "Action Required" items (e.g., approve design, upload logo).

2. **Milestone Details & Timeline**
   - Expanding milestones reveals detailed deliverables and history.
   - Dynamic stage camera links: Clicking a milestone shows target details.

3. **Asset Collaboration & File Exchange**
   - File attachment list with status labels (*Pending Upload*, *Needs Review*, *Approved*).
   - Client actions: "Upload File" and "Approve/Reject File" with verification.
   - Writes trigger background reservations (`reserve_project_attachment`) and finalize upon successful storage bucket upload (`finalize_project_attachment`).

4. **Sign-off / Resolution**
   - Prompt confirming milestone complete when all required actions are satisfied.

---

## Design Principles

1. **Progressive Disclosure**
   - Keep details hidden by default. Avoid overwhelming clients with technical migration or schema details; present simple, actionable items.

2. **Real-time Integrity**
   - Leverage Supabase Realtime listeners to push status changes and milestone updates instantly without manual page refreshes.

3. **Status Transparency**
   - Always state "Who has the ball" (e.g., *Waiting on CWS Team* vs *Waiting on Client Action*).

---

## Accessibility Requirements for CRM Portals
* **Keyboard Navigation**: All interactive milestone cards and file inputs must be focusable and operable via `Tab`, `Space`/`Enter`, and `Escape`.
* **Contrast Requirements**: Text and icons in status badges (e.g., Orange for Action Required, Green for Approved) must satisfy WCAG AA contrast limits against dark backgrounds.
* **ARIA Attributes**: Use `aria-expanded` on accordion panels and `aria-live="polite"` for real-time status notifications.
