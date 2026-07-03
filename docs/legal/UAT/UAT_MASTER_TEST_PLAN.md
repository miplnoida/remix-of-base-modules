# Legal V1 — UAT Master Test Plan

**Version:** 1.0  
**Status:** Ready for Business UAT  
**Scope:** Legal V1 (technically frozen). Compliance → Legal end-to-end.  
**Environment:** Test / UAT  
**Prepared:** 2026-07-03

---

## 1. Purpose

Validate that Legal V1 meets the documented business capabilities end-to-end using real
Compliance-originated data and previously seeded matters, prior to Business Sign-Off.

Legal V1 is technically frozen — this UAT pack validates **business fitness**, not
architecture. Defects raised will be triaged as UAT-blocker, UAT-major, UAT-minor, or
post-V1 backlog.

## 2. In-Scope Modules

| # | Module | Screens |
|---|---|---|
| A | Compliance → Legal Referral | Compliance Case → Legal Referral Wizard |
| B | Legal Intake & Qualification | `/legal/lg/intake`, Intake Detail, Qualification Wizard |
| C | Matter Workspace (Case 360) | `/legal/lg/cases`, `/legal/lg/matter/:id` |
| D | Recoverable Liabilities | Liability tab, Retrofit Tool |
| E | Court Operations | `/legal/lg/hearings`, Court Registry |
| F | Judicial Orders & Appeals | `/legal/lg/orders`, Appeals workbench |
| G | Post-Judgment Recovery | `/legal/lg/recovery`, `/legal/lg/enforcement`, External Counsel |
| H | Dashboards & Reports | `/legal/lg/dashboard`, `/legal/reports` |
| I | Security & Permissions | Route guards, role gating |

## 3. Out of Scope

- New feature development.
- Architectural changes.
- Deletion of `@deprecated` legacy pages (scheduled next release cycle).
- Mobile responsiveness beyond desktop.

## 4. Test Data

### 4.1 Compliance-originated (real flow — validated in `CE_FLOW_ENRICHMENT_VALIDATION.md`)

| Compliance Case | Referral | Intake | Legal Case |
|---|---|---|---|
| CC-2024-0002 | CMP-LR-SKN-2026-000002 | LG-INT-SKN-2026-000017 | LG-SKN-2026-000017 |
| CC-2024-0007 | CMP-LR-SKN-2026-000003 | LG-INT-SKN-2026-000018 | LG-SKN-2026-000018 |
| A Fulton & Co (654548) | CMP-LR-SKN-2026-000004 | LG-INT-SKN-2026-000019 | LG-SKN-2026-000019 |

### 4.2 Direct-seeded (screen coverage — see `LEGAL_SEED_VALIDATION_REPORT.md`)

| Matter | Liabs | Assessed | Paid | Outstanding | Purpose |
|---|---|---|---|---|---|
| SEED-LG-2026-0001 | 3 | 51,750.00 | 25,875.00 | 25,875.00 | Judgment + partial recovery |
| SEED-LG-2026-0002 | 2 | 34,500.00 | 11,500.00 | 23,000.00 | Enforcement / appeal |
| SEED-LG-2026-0003 | 1 |  8,500.00 |  8,500.00 |      0.00 | Consent order fully paid |

## 5. Roles Under Test

Aligned with `docs/legal/permission-matrix.md`:

- LG_READ_ONLY
- LG_LEGAL_ASSISTANT (Legal Officer — junior)
- LG_CASE_HANDLER (Senior Legal Officer)
- LG_REVIEWER
- LG_APPROVER (Legal Manager)
- LG_ADMIN (Legal Admin)
- SYSTEMADMIN

## 6. Entry Criteria

- Legal V1 route freeze completed (see `LEGAL_V1_FINAL_ARCHITECTURE_REPORT.md`).
- Seed data present (`LEGAL_SEED_VALIDATION_REPORT.md`).
- CE→LG real-flow scenarios A, B, C validated.
- Typecheck clean.
- All UAT roles provisioned in Test environment.

## 7. Exit Criteria

- ≥100 UAT test cases executed.
- Zero UAT-blocker defects open.
- Financial validation reconciles to `v_lg_case_financials`.
- Permission tests pass for every listed role.
- Business sign-off recorded on `UAT_SIGNOFF_CHECKLIST.md`.

## 8. Defect Severity

| Severity | Meaning | Response |
|---|---|---|
| Blocker | Blocks core Compliance→Legal→Recovery flow | Immediate fix required |
| Major | Wrong data / broken screen but workaround exists | Fix before sign-off |
| Minor | Cosmetic, label, sort order | Backlog acceptable |
| Enhancement | New behavior request | V2 backlog |

## 9. Deliverables

- `UAT_TEST_CASES.md` — 100+ scripted cases (§A–I + negatives)
- `UAT_ROLE_WISE_SCENARIOS.md` — day-in-the-life per role
- `UAT_FINANCIAL_VALIDATION.md` — money reconciliation
- `UAT_SECURITY_PERMISSION_TESTS.md` — capability matrix tests
- `UAT_DEFECT_LOG_TEMPLATE.md` — defect capture
- `UAT_SIGNOFF_CHECKLIST.md` — final sign-off
- `UAT_EXECUTION_TRACKER.md` — daily execution progress

## 10. Schedule

| Day | Activity |
|---|---|
| D1 | Kickoff, environment walkthrough, role provisioning |
| D2 | Modules A–B (Referral, Intake) |
| D3 | Modules C–D (Matter, Liabilities) |
| D4 | Modules E–F (Court, Orders, Appeals) |
| D5 | Module G (Recovery, Enforcement) |
| D6 | Modules H–I (Dashboards, Security) |
| D7 | Negative tests + regression |
| D8 | Defect fixes + retest |
| D9 | Business sign-off |
