# Ledger Help & SOP (Help Center)

**Route:** `/compliance/admin/settings/ledger-help`
**Component:** `src/pages/compliance/settings/LedgerHelpCenter.tsx`
**Sub-section:** Compliance → Admin → Integrations & Ledger
**Generated doc:** `docs/compliance/admin/integrations-ledger/ledger-help-and-sop.md`

---

## 1. Purpose

Static, client-rendered knowledge base that documents:

- **Role-based SOPs** for the 5 user types involved in ledger posting (C3 Operator, Cashier, Supervisor/Finance, Compliance/Statement Support, Technical Support/Admin).
- **Help Manual** — long-form explainers about the ledger model, posting jobs, statement dependencies, failure identification, escalation.
- **PDF export** of the entire content via `jsPDF` + `jspdf-autotable`.

It is a **read-only documentation surface**; no DB tables are queried.

---

## 2. Business Purpose

The compliance ledger pipeline involves multiple roles whose actions are interdependent (e.g., a cashier failing to close a batch blocks a payment from ever appearing on a statement). Operators need a co-located SOP they can:
- Read at the start of a shift.
- Hand to a new starter.
- Print/export when training off-system.

This screen is the project's answer.

---

## 3. Data Tables Used

**None.** All content is hardcoded as TypeScript constants:
- `ROLE_SOPS` — array of 5 role objects with responsibilities, daily tasks, common failures, warnings.
- `HELP_SECTIONS` — array of long-form sections.

This is intentional (knowledge content, not transactional data) but conflicts with the project's central knowledge-base architecture (memory `features/global-help-and-knowledge-base`) which stores articles in DB. *See risks.*

---

## 4. Validations

None — purely a content viewer.

---

## 5. Actions Available

| Action | Control | Effect |
|---|---|---|
| Search | Search input | Client-side filter across SOPs and help sections |
| Switch role | Tabs | Renders the matching `ROLE_SOPS` entry |
| Expand sections | Accordion | Standard UI expand/collapse |
| Download PDF | `Download` button | Generates a multi-page PDF using `jsPDF` and `jspdf-autotable` |

---

## 6. Services / Hooks / APIs Involved

- `jsPDF` and `jspdf-autotable` for export.
- No data hooks, no Supabase queries, no edge functions.

---

## 7. Calling / Dependent Screens

### Referenced *from* this screen (in copy)
- **Ledger Operations Dashboard** — referenced repeatedly in SOP steps ("Go to Ledger Operations → Queue Monitor…").
- **Ledger Posting Framework (Admin)** — referenced for Job History.
- **Job Configuration** (`/compliance/admin/automation/job-configuration`) — referenced for enabling LEDGER-* jobs.
- **Employer 360 → Statement** — referenced for verification.
- **Cashier → Batch Management** — referenced for batch close.
- **C3 Management** — referenced for amending source records.

### Calls *into* this screen
- *None observed in code.* It is reachable only via the sidebar route `/compliance/admin/settings/ledger-help`. *Assumption: also linked from `HelpCircle` icons on the dashboards — needs grep confirmation.*

---

## 8. Where the Same Tables Are Reused

N/A — no tables.

---

## 9. Audit / Logging Behaviour

- No DB writes.
- No analytics event recorded for "PDF downloaded" or "section opened" — *opportunity for usage telemetry*.

---

## 10. Notable Risks & Gaps

1. **Content lives in source code, not in the central KB**. Updating an SOP requires a code deploy. Inconsistent with `features/global-help-and-knowledge-base` standards.
2. **No versioning** of the SOP content. A printed PDF has no version number / "last reviewed" date.
3. **Role list is static** — does not match the dynamic role system (`useComplianceRole`).
4. **Branding gap on PDF** — must verify the Misha Infotech branding standard (memory `design/document-branding`) is applied. *Assumption: needs confirmation by reading the export code.*
5. **No deep links** from the SOP steps — references like "Go to Ledger Operations → Queue Monitor" are plain text, not clickable.
6. **No print-friendly stylesheet** beyond the PDF export.

---

## 11. Assumptions / Needs Confirmation

- Whether the PDF export includes the Misha Infotech logo and footer per project standard.
- Whether content should migrate to the global KB tables so non-developers can edit it.
- Whether usage analytics (per-role view counts, PDF downloads) is desired.
