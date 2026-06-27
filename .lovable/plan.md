# Plan: Module-Aware Text Block Library

## Goal
Pre-populate `core_text_block` with standard reusable blocks for every active module (Payments, C3, Compliance, Benefits, Legal, Employers, IP/Contributors, Self-Employed, Online Applications, Meetings, Notifications, Org/Admin) so Department Profile, Document Profile, templates, notices and letters can simply pick from a ready library instead of authors creating one-off blocks.

## Scope
- Seed data only (SEED- tagged via `text_block_code` prefix where appropriate, `module_code` set).
- Admin UI: improve grouping/filter by module + category.
- No change to resolver, schema, or downstream pages.

## Phase 1 — Catalogue (per module)
For each module, define a standard set covering: `disclaimer`, `notice`, `footer`, `instruction`, `consent`, `header`, `warning`. Examples:

| Module | Block codes |
|---|---|
| Global / Org | `GLOBAL.DISCLAIMER`, `GLOBAL.CONFIDENTIALITY`, `GLOBAL.PRIVACY_NOTICE`, `GLOBAL.APPEAL_RIGHTS`, `GLOBAL.FOOTER_ADDRESS`, `GLOBAL.SIGNATURE_BLOCK` |
| Payments | `PAY.RECEIPT_FOOTER`, `PAY.STATEMENT_DISCLAIMER`, `PAY.LATE_PAYMENT_NOTICE`, `PAY.REFUND_POLICY`, `PAY.PAYMENT_INSTRUCTIONS` |
| C3 Management | `C3.FILING_INSTRUCTIONS`, `C3.AMENDMENT_NOTICE`, `C3.DIRECTOR_DECLARATION`, `C3.LATE_FILING_WARNING` |
| Compliance | `CE.VIOLATION_NOTICE`, `CE.CASE_OPENING`, `CE.HEARING_NOTICE`, `CE.SETTLEMENT_TERMS`, `CE.LEGAL_ESCALATION` |
| Benefits (BN) | `BN.CLAIM_INSTRUCTIONS`, `BN.SICKNESS_DISCLAIMER`, `BN.MATERNITY_NOTICE`, `BN.PENSION_DECLARATION`, `BN.MEDICAL_PRIVACY`, `BN.REIMBURSEMENT_TERMS` |
| Employers | `ER.REGISTRATION_WELCOME`, `ER.CESSATION_NOTICE`, `ER.OBLIGATIONS_REMINDER` |
| Contributors / IP | `IP.REGISTRATION_WELCOME`, `IP.CARD_INSTRUCTIONS`, `IP.DEPENDANT_DECLARATION` |
| Self-Employed | `SE.REGISTRATION_WELCOME`, `SE.WAGE_CATEGORY_NOTICE` |
| Online Applications | `OA.SUBMISSION_RECEIPT`, `OA.APPROVAL_NOTICE`, `OA.REJECTION_NOTICE` |
| Meetings | `MT.AGENDA_HEADER`, `MT.MINUTES_FOOTER` |
| Notifications | `NOTIF.EMAIL_FOOTER`, `NOTIF.SMS_BRAND_TAG` |
| Legal | `LG.PRIVACY_POLICY`, `LG.TERMS_OF_USE`, `LG.DATA_RETENTION` |

Total: ~50 seed blocks. Each row stores `text_block_code`, `name`, `module_code`, `category`, `content_html` (rich placeholder text), `content_text` fallback, `language_code='en'`, `version_no=1`, `is_active=true`.

## Phase 2 — Seed migration
Single migration `INSERT … ON CONFLICT (text_block_code) DO NOTHING` so re-runs are safe and existing user-edited blocks are preserved.

## Phase 3 — Admin UX upgrades (`TextBlocksPage.tsx`)
- Add **Module filter** dropdown (All / each module) and **Category filter**.
- Group results by module with collapsible section headers + count badges.
- Show "Seed" badge for rows whose code starts with a known module prefix and have not been edited (compare `updated_at` ≈ `created_at`).
- Default sort: module → category → name.
- Replace plain HTML textarea with the existing `RichTextEditor` for `content_html`.

## Phase 4 — Wiring check
Department Profile legal-text selectors (`TextBlockSelectField`) already filter by category; confirm they also accept an optional `moduleCode` prop so the Benefits department only sees `GLOBAL.*` + `BN.*` blocks. Small additive change to the field component and its hook query.

## Phase 5 — Acceptance
- Text Blocks page lists 50+ seeded blocks grouped by module.
- Each module's Department Profile shows relevant suggestions first.
- No duplicate codes; re-running migration is a no-op.
- TypeScript build passes.

## Out of scope
- Translations beyond English (structure already supports `language_code`; can seed later).
- Workflow approval for text blocks (separate effort).
