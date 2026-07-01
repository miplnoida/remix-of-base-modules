# Legal Admin Stabilization — Progress

## Done
- Phase 1: `lg_stage_document_rule.document_type_code` migration + sync trigger.
- Phase 1: Routing pre-save duplicate check.
- Phase 1: SLA Rules — LEGAL source, INT16 priority cap, required-numeric validation.
- Phase 2: Shared `src/lib/legal/adminValidation.ts` (zod schemas + `mapSupabaseError`).
- Phase 3a: `LegalCourtAdmin` — required-field guard + `mapSupabaseError` on save.
- Phase 3a: `LegalAdminTeams` — `codeSchema`/`nameSchema` validation on team save, duplicate-code guard, all error toasts routed through `mapSupabaseError`.

## Remaining (deferred to next pass)
- Fees / Fee Bundles / Waiver Policies: apply `positiveAmount` / `percentageSchema` / `amountRangeRefine` + `mapSupabaseError`.
- Legal Referral wizard: product/employer population, refer-amount vs outstanding guard, documents-step required indicator.
- Admin Users: cache invalidation on create, duplicate phone check, deactivate flow + fail-closed on permission checks, welcome-email hook.
- Templates page: remove duplicate "New Template" button.
- Permissions gating: extend `legalRouteCapabilities` for Litigation/Hearing Calendar/Employer/Legal Referral; sweep all mutation buttons for `LgActionButton` gating under `LEGAL_READ_ONLY`.
- Coming-soon pages (document-types, fee-bundles, audit, permissions): confirm hidden or move behind placeholder.
- Dev Info seed data refresh (`core_department_profile`, `lg_department_profile`, `lg_routing_*`, `lg_team*`).

## Open questions still pending
1. LEGAL_READ_ONLY — allowed screens (Dashboard, Workbench, Cases, Referrals, Reports)? Anything else?
2. Employer module in Legal Admin — full or read-only lookup?
3. Hearing Calendar — visible to which roles?
4. Coming-soon pages — hide or complete?

## Pass 2 additions (this turn)
- `LgFeeConfig` — saveRule / saveBundle now validated with `codeSchema` + `nameSchema`; FIXED rules require positive amount, PERCENTAGE rules validated as 0..1 ratio; min/max and effective-date sanity checks. Errors via `mapSupabaseError`.
- `LgFeeWaiverPolicyConfig` — savePolicy / removePolicy / saveTier / removeTier all wrapped with validation (code/name, 0..100 percentages, amount/percent range sanity) and `mapSupabaseError`.
- `UserCreate` — invalidates `user-profiles` + `admin-users` caches on successful creation so the list refreshes immediately; pre-check for duplicate `profiles.phone` runs before the edge-function call and surfaces a friendly inline error.

## Pass 3 additions (this turn)
- `CoreTemplateManagement` — removed duplicate "New Template" buttons in the Legal grid card header and the non-legal card toolbar; the top-of-page CTA remains the single primary trigger (LgDataGrid still exposes its inline Create action).
- `UserCreate` — added email-format validation and a pre-save duplicate `profiles.email` check with a friendly inline error, complementing the existing duplicate-phone guard.

## Still deferred (need business input)
- `LegalReferralWizard` (`src/pages/compliance/legal/LegalReferralWizard.tsx`) still runs against the mock `legalReferralService` with fallback `EMP-001`. Wiring it to the real `core_legal_referral_item` / `legal_referral` tables is a substantive rewrite; open questions #1–#4 (LEGAL_READ_ONLY scope, Employer visibility, Hearing Calendar audience, coming-soon page policy) block the remaining LEGAL_READ_ONLY sweep and coming-soon decision.
