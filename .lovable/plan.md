# Legal + Admin QA / UAT Stabilization Plan

Scope: fix the QA issues from the uploaded `Legal Admin.xlsx` covering Legal Admin (Setup, Reference, Governance, Fees, Waivers, SLA, Templates, Stage Rules), Legal Referral, Legal Cases (Add Party), Admin Users, and permission/menu visibility. No redesign — existing components, hooks, services, and Supabase patterns only.

## Phase 1 — Critical (P1)

### 1.1 `stage-document-rules` schema + pagination
- Inspect actual `lg_stage_document_rule` columns via `supabase--read_query`.
- If `document_type_code` is missing → migration to add `document_type_code text` (nullable) alongside existing `document_category_code`.
- If the column exists but PostgREST cache is stale → confirm insert path in `LegalStageDocumentRules.tsx` sends the correct field name; adjust mapping.
- Wire proper pagination (page size selector + `.range()`) matching existing list patterns.

### 1.2 Permission / menu visibility (no flash of protected content)
- Extend `src/config/legalRouteCapabilities.ts` to cover Litigation, Litigation Admin, Hearing Calendar, Employer, Legal Referral.
- Filter sidebar menu items using the same capability map so entries hide before click (update `src/components/sidebar/menuItems/*`).
- `LegalRouteGuard` already blocks render — ensure sidebar uses `useLegalCapability` gate so the flash disappears.
- Legal Read Only: gate every mutation button via existing `LgActionButton` + `useLegalReadOnly`; audit Legal Referral, Cases, Advice, Contract Review screens and disable/hide create/edit/delete/submit/approve/assign.

### 1.3 Admin Users
- Immediate list refresh after create: invalidate the `admin-users` query key (or append to local state) inside the create-user mutation `onSuccess`.
- Duplicate phone check pre-save: query `profiles` for active users with same phone; block with field error.
- Deactivate action: call the existing update RPC/mutation, invalidate list, show status badge (Active/Inactive) in list + detail.
- Enforce inactive users cannot use permissions: check `is_active` in `useSupabaseAuth`/`useHasCapability` gate (fail-closed).
- Toasts on create/deactivate success + error.
- Email on create: if a notification template + edge function already exist, trigger it; otherwise add a clearly-named `sendUserCreatedEmail()` placeholder in `src/services/admin/userNotifications.ts` returning a no-op with TODO.

### 1.4 Routing duplicate + dropdown defaults
- In `LegalRouting`/routing service, before insert query `lg_routing_stage_override` for `(country_code, stage_code)` (and source where applicable); show friendly toast "A routing rule already exists for this country and stage."
- Fix dropdown defaults to render "Any source" / "Any" instead of dash when value is null.

## Phase 2 — Shared validation framework

Add `src/lib/legal/adminValidation.ts` exporting reusable Zod schemas + helpers:
- `codeSchema`, `nameSchema(maxLen)`, `positiveAmount`, `percentageSchema`, `dateRange`, `amountRange`, `priorityInt16`, `emailSchema`, `phoneSchema`, `countryCodeSchema`, `nonPlaceholderEnum`.
- `mapSupabaseError()` translating pg errors (unique_violation, value too long, out of range) to user-friendly messages.

Apply to forms:
- `/legal/admin/profile`, `/teams`, `/courts` (+ Judges/Officers), `/codesets`, `/legal-references`, `/fees`, `/fee-bundles`, `/waiver-policies`, `/sla-rules`, `/legal-referral` (Source/Items/Documents steps), `/legal/lg/cases` Add Party.
- Field-level error text under inputs; disable Save/Next until valid; block placeholder/dash submissions; enforce DB column lengths (e.g. varchar(64)).
- SLA Priority: clamp to smallint range (−32768..32767) with helper text.

## Phase 3 — Form/UI behavior fixes

- **Reset after save**: standard `form.reset(defaultValues)` + close modal state on all listed admin forms; edit flow reloads clean row.
- **Delete/Deactivate**: add delete for Teams; add remove for Add-Party rows in Legal Cases. Use existing `ConfirmDialog`. Invalidate query on success.
- **Active/Deactivated badges**: reuse existing status badge component in Teams, Users, Courts lists + detail.
- **Templates page**: remove duplicate "New Template" buttons; keep one per tab where creation is supported (Layout/Token/Channels/Categories get their own create; Completeness Report = no create button).
- **Coming-soon pages** (`document-types`, `fee-bundles`, `audit`, `permissions`): either wire up if service exists, else hide the menu entries via `menuItems` + return `LegalAccessDenied`-style "Not available" panel.
- **Validation report page**: improve Ready badge contrast (semantic token), add loading state + disabled button on Re-run, success/error toast.

## Phase 4 — Legal Referral, SLA, Dev Info

- **Legal Referral Source step**: populate Product + Employer from claim/person data hooks already in use for Benefits; if missing, show explicit warning and block "Next".
- **Refer Amount**: reject negatives and values > outstanding.
- **Documents step**: show required indicator + inline error when upload/override reason missing.
- **SLA Rules**: full validation (above), Escalation Workbasket becomes SearchableSelect from `core_workbasket`, add "Legal" to Source Module dropdown (since `legal_referral_sla_rule` supports legal-scoped rules).
- **Legal/admin/workflow vs /policy**: split route mapping so each renders its own screen.
- **Developer Information mapping**: for Profile, Routing, Teams — update `dev_info_screens`/`dev_info_table_maps` seed data to reference actual tables (`core_department_profile`, `lg_department_profile`, `lg_routing_*`, `lg_team`, `lg_team_member`, `lg_team_workbasket`). If none used, clear the mapping.

## Technical implementation notes

- Migrations only for `lg_stage_document_rule.document_type_code` (if missing) and `dev_info_*` seed corrections. No RLS changes (project uses NO-RLS policy).
- All new validation via zod, following `src/lib/legal/*` conventions.
- Reuse `useBlockingMutation`, `SearchableSelect`, `ConfirmDialog`, `LgActionButton`.
- All timestamps and audit fields use `user_code` per project standards.
- Run `tsgo --noEmit` after each phase.

## Deliverables

1. Files changed list.
2. Bugs fixed vs QA row IDs.
3. Items still needing business confirmation (e.g. exact set of Legal Read Only allowed screens, whether Legal Admin should really see Employer module, whether Hearing Calendar is Manager-visible).

## Open questions before build

Before I start, please confirm:
1. **Legal Read Only** — is the allowed set exactly: Dashboard, Workbench (read), Cases (read), Referrals (read), Reports? Anything else viewable?
2. **Employer module for Legal Admin** — should Legal Admin see the full Employer module, or only a read-only Employer lookup inside Legal screens?
3. **Hearing Calendar** — visible to which roles? (Officer + Senior + Manager + Admin, or Manager+Admin only?)
4. **`document-types` / `fee-bundles` / `audit` / `permissions` pages** — hide from menu for this release, or attempt to complete? (Hiding is faster and safer.)

Once confirmed I'll execute phases 1 → 4 in order.
