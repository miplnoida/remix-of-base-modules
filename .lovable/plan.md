## Social Security Self-Service Portal — Persona-Based Redesign

The current `/claimant/*` shell is a flat list of pages. We will keep the existing theme (cards, badges, tables, side nav, status chips, timelines — no new design language) but rebuild it as a persona-driven self-service portal grouped into 8 menu sections. The route prefix stays `/claimant/*`; every user-visible label changes to **Social Security Self-Service Portal**.

Foundation from the prior turn is reused: `external_user_person_link`, `external_persona_audit`, `portalPersonaService.resolvePortalPersonas`, `useClaimantPersona`, `useProductApplicability`, `RequirePersonaFlag`, `seedSelfLinkIfMissing`, `LinkSsnPage`.

### Delivery plan (4 PRs)

**PR-1 · Shell, header, menu groups, dashboard rewrite**
- Rename brand → "Social Security Self-Service Portal" everywhere (`ExternalPortalShell` prop, landing page, page titles, breadcrumbs).
- New header block: person name · primary SSN (masked) · persona badges (`INSURED PERSON`, `CLAIMANT`, `BENEFICIARY`, `PENSIONER`, `GUARDIAN`, `PAYEE`, `REPRESENTATIVE`).
- Replace flat `NAV` array with grouped nav model `{ group, items[], visibleIf(flags) }` rendered via existing side-nav.
- Groups: My Account, My Social Security (insured only), Benefits, People I Manage (guardian/payee/rep only), Compliance, Communications, Documents, Appeals.
- Dashboard sections: Claim Activity · Benefits · Payments · Compliance · Communications · Social Security Summary (insured only). Every card hyperlinks into the new module.

**PR-2 · Persona resolver completion + My Account + Relationships**
- Extend `portalPersonaService` so PAYEE, REPRESENTATIVE, PENSIONER, BENEFICIARY are also driven by data signals (not only links): `bn_award.payee_ssn`, `bn_award.payee_user_id`, `bn_award_beneficiary.beneficiary_ssn`, active award status. Output stays the same `PortalPersonaContext` shape.
- My Account tabs: Personal Profile · Addresses · Contacts · Identity Documents · Relationships · Authorized Representatives · Communication Preferences. Source from `ip_master`, `ip_documents`, `ip_depend`, `external_user_person_link`, `user_notification_preferences`. Read-only first; edit screens come later.
- Relationships page: Spouse / Children / Dependants / Guardian-of / Beneficiary-of / Payee-of. Each row shows the role, since-date, and a "history" drawer using `external_persona_audit` + `ip_depend` history.

**PR-3 · Benefits stack: Claims · Entitlements · Payments · Eligibility Estimator · Apply**
- **Claims** module with tabs My Own / Submitted By Me / Managed Claims / As Beneficiary. Bound to `bn_claim` + `bn_claim_participant` filtered by persona context. Columns: claim# · product · status · role · submitted · current stage.
- **Entitlements** (rename of Awards/Pensions) tabs Active / Pending / Suspended / Historical from `bn_award` + `bn_award_status_event`. Shows benefit type, start date, amount, status, payee, frequency.
- **Payments** tabs Upcoming / History / Returned / Statements / Tax Certificates from `bn_payment_instruction` + `bn_payment_schedule`.
- **Apply for Benefits** already split (self / for others) — keep, just regroup under "Benefits".
- **Eligibility Estimator** new page: pick product → runs the existing `eligibilityEngine` in dry-run mode against the persona's snapshot → returns Likely / Potentially / Insufficient Data. Never creates a claim.

**PR-4 · Compliance · Document Center · Communications · Appeals · Contribution Statements · Audit**
- **Compliance** module merging Life Certificates · School Certificates · Verification Requests · Outstanding Requirements (from `bn_life_certificate`, `bn_external_task`, `bn_claim_evidence`).
- **Document Center** tabs Uploaded By Me / Requested / Claim Docs / Benefit Docs / Official Letters / Generated Forms — uses the existing document-proxy edge function for preview.
- **Communications** tabs Inbox / Letters / Notifications / Tasks / Archive from `bn_letter`, `bn_communication_log`, `in_app_notifications`, `bn_external_task` with PDF viewing via document-proxy.
- **Appeals / Reconsideration** wired to `bn_claim_decision` reopen flow.
- **Contribution Statements** generator (insured only): Annual Statement, Contribution Certificate, Insurable Earnings — branded PDFs (Misha Infotech, India, per project rule). Each generation logs to `external_persona_audit` + `system_audit_trail`.
- **Audit wiring**: every view/edit/upload/download/generate emits a `system_audit_trail` row and a `external_persona_audit` row. Add a thin `auditPortalAction(eventType, payload)` helper used across modules.

### Security model (cross-PR, enforced from PR-1)
- Insured-person data (`Contributions`, `Employment History`, `Insurable Earnings`, `Contribution Statements`, `Social Security Summary` dashboard card) is wrapped in `<RequirePersonaFlag flag="canViewContributions">` and the matching server hooks reject without a verified SELF link.
- Guardians, funeral applicants, beneficiary-only users never see contribution sections — denials emit `CONTRIB_VIEW_DENIED` audit rows.
- "People I Manage" group only renders for GUARDIAN/PAYEE/REPRESENTATIVE personas.
- Server side: extend `useExternalContributions` / `useExternalEmploymentHistory` hooks to early-return when `flags.canViewContributions === false` and to call edge functions with the SSN being requested for cross-check.

### Test matrix (PR-4 closing)
Insured Person · Claimant-only · Beneficiary-only · Guardian · Pensioner · Insured+Guardian · Insured+Beneficiary — each scenario verifies menu groups visible, dashboard cards shown, contribution gating, audit events written. Drive by creating seven distinct `external_user_person_link` configurations against existing seed SSNs; no hardcoded personas in code.

### Technical notes
- Route prefix `/claimant/*` is preserved internally to avoid breaking existing deep links; the visible brand becomes "Social Security Self-Service Portal".
- All new pages use existing primitives: `Card`, `Tabs`, `Table`, `Badge`, `Timeline`, `SearchableSelect`, `ExternalPortalShell`. No new design tokens.
- No mock data — all reads use Supabase tables already in the schema. Any seed rows tagged `SEED-`.
- Type-check + the seven-scenario manual test gate at the end of PR-4.

Approve and I will start with PR-1 (shell, header, menu groups, dashboard).
