# Reference Numbering Schemes

## 1. Screen Overview
- **Screen name**: Reference Numbering Schemes
- **Route/path**: `/compliance/admin/settings/number-templates`
- **Page component**: `src/pages/compliance/settings/NumberTemplates.tsx`
- **Parent menu location**: Compliance → Admin → Settings (`app_modules.name = 'ce_number_templates'`, sort_order 6)
- **Screen type**: Settings / List with inline preview + Dialog editor

## 2. Business Function
Configures the **auto-generated reference numbers** stamped on every compliance artefact: violations, cases, inspections, notices, legal referrals, waivers and payment plans. Each scheme is a pattern (e.g. `VIO-{YYYY}-{NNNNN}`) plus padding and reset frequency (yearly / monthly / never). One scheme per `applies_to` value can be marked default; the system uses that default to generate sequential numbers.

Used by **Compliance Admins** at set-up and on the rare occasion of a numbering policy change (e.g. switching from yearly to never-reset to avoid duplicate-looking refs across years).

## 3. Primary User Roles
- **Access / Edit**: Compliance Admin only (high-impact configuration).
- **View only**: Supervisor with read-only role grant.
- No approval workflow.

## 4. UI Responsibilities
- Header with `Add Scheme` button.
- **Pattern variables card** — shows the supported tokens: `{YYYY}`, `{MM}`, `{NNNNN}`, `{NNNN}`, `{NNN}`, `{TERRITORY}` (SK or NV).
- List of schemes (cards): name, `applies_to` badge, reset-frequency badge, default badge, raw pattern + live preview (`generateExample()` substitutes today's date and `00001`).
- Per row: `is_active` switch, edit, deactivate.
- **Add/Edit dialog**: scheme name, description, applies-to, reset frequency, prefix (auto-builds pattern → `${prefix}-{YYYY}-{NNNNN}`), padding length (3/4/5/6), pattern (free-text override), `is_default`, `is_active`. Live preview rendered as you type.
- **Deactivate confirmation** AlertDialog (soft-delete only).

## 5. Main Actions and Business Outcomes
| Action | Effect | DB Impact | Downstream |
|---|---|---|---|
| **Add Scheme** | INSERT after duplicate-name check. | `ce_number_templates` | Available as a numbering option for the chosen applies-to type. |
| **Edit** | UPDATE row. | UPDATE | New numbering applies to *future* refs only — already-issued refs are not retroactively changed. |
| **Toggle Active** | `is_active` switch. | UPDATE | Engine excludes the scheme from candidate pool for new refs. |
| **Deactivate** | `softDeactivateNumberTemplate`. | UPDATE | Same effect as toggling off. |
| **Set Default** | Checkbox in dialog. | UPDATE | The scheme becomes the picked default for that `applies_to` (no enforcement of "only one default" — see §12). |

No hard delete.

## 6. Data Model / Tables Used
| Table | R/W | Why | Key fields | Reused in |
|---|---|---|---|---|
| `ce_number_templates` | RW | Pattern + sequence config | `name`, `template_pattern`, `description`, `applies_to` (Violation/Case/Inspection/Notice/Referral/Waiver/PaymentPlan), `is_default`, `padding_length`, `prefix`, `reset_frequency` (yearly/monthly/never), `is_active` | Number-generation logic in violation/case/notice/inspection creation flows; legal referrals; arrangements |

> **Sequence storage**: Where the actual *next-number counter* is stored is **not on this table**. It is presumed to live in a sibling table (`ce_number_sequence` or similar) keyed by (scheme_id, period). This screen does not expose or reset the sequence value. **Assumption / needs confirmation** — verify in migrations.

## 7. Services / Hooks / Queries Used
- `complianceSettingsService.ts` — `withAuditFields`, `checkDuplicateNumberTemplate`, `softDeactivateNumberTemplate`, `validationToastConfig`.
- `useUserCode`.
- `@tanstack/react-query` — list query + mutations.
- `@/integrations/supabase/client` — direct CRUD.

## 8. Validation Rules
| Rule | Where |
|---|---|
| `name` required, unique (case-insensitive) | UI + service `checkDuplicateNumberTemplate` |
| `template_pattern` required | UI |
| `applies_to` ∈ enum (Violation, Case, Inspection, Notice, Referral, Waiver, PaymentPlan) | UI Select |
| `reset_frequency` ∈ {yearly, monthly, never} | UI Select |
| `padding_length` ∈ {3,4,5,6} | UI Select |
| `is_default` enforcement (one default per applies-to) | **Not enforced** — see §12 |

No DB-level CHECK constraints identified.

## 9. Workflow / Approval / Notification Logic
- None — saves are immediate.
- No notifications.
- No history beyond `updated_by`/`updated_at`.

## 10. Linkages to Other Screens
- **Violations** (workbench / case detail) — uses `applies_to='Violation'` default.
- **Cases** — uses `applies_to='Case'` default.
- **Inspections** — uses `applies_to='Inspection'`.
- **Communication / Notices** — uses `applies_to='Notice'`.
- **Legal Referrals** — uses `applies_to='Referral'`.
- **Arrangements (Payment Plans)** — uses `applies_to='PaymentPlan'`.
- Patterns generated here are referenced wherever a new compliance record is created.

## 11. Audit Trail / Logging
- Inline `created_by`, `updated_by`, `updated_at` only.
- No history table for pattern changes (which is risky — see §12).

## 12. Technical Risks / Gaps / Assumptions
- **`is_default` is not enforced as exclusive** — two schemes with the same `applies_to` can both be `is_default=true`. The first match returned by the engine wins, which may be non-deterministic.
- **Changing `template_pattern` mid-year** can break uniqueness assumptions for issued references; there's no warning when editing a scheme that has already produced references.
- **`reset_frequency` change** does not reset the underlying counter (counter table is separate and not exposed here).
- **`{TERRITORY}` token** assumes a global "current territory" context (SK / NV) — that resolution lives in the number generator, not in this UI.
- **Hard-coded preview substitutions** (`00001`, etc.) — could mislead admins about real next number.
- **No "show me a real next preview"** that reads the live counter.
- **No deletion blocked when scheme is in use**: deactivating a scheme that is the *only* default for its applies-to leaves the engine without a default and downstream creation flows may fall back to ad-hoc numbering or error.

## 13. Recommended Improvements
1. Enforce single-default per `applies_to` via a partial unique index `WHERE is_default AND is_active`.
2. Show the *actual* current sequence and next value (read from the counter table) on each card.
3. Block deactivation of the only default for an `applies_to`.
4. Warn (and require confirmation) when editing a pattern that has already issued references.
5. Add a Pattern Test panel that calls the actual number-generator function once, in a read-only / dry-run mode.
6. Add a `ce_number_template_history` table for compliance defensibility.

## 14. File References
- Route: `src/components/routing/AppRoutes.tsx` (line ~1080)
- Page: `src/pages/compliance/settings/NumberTemplates.tsx`
- Service: `src/services/complianceSettingsService.ts`
- Hook: `src/hooks/useUserCode.ts`
- Migrations: `supabase/migrations/*ce_number_templates*` (and any `ce_number_sequence` migration for the counter table)
- Types: `src/integrations/supabase/types.ts`
