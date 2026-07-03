# Legal V1 — UAT Sign-Off Checklist

**Version:** 1.0  
**Purpose:** Formal business acceptance of Legal V1.

---

## A. Entry gates (all must be YES)

- [ ] Environment: Test/UAT stable, no outage in last 24 h.
- [ ] Seed data present per `LEGAL_SEED_VALIDATION_REPORT.md`.
- [ ] CE→LG real flow validated per `CE_FLOW_ENRICHMENT_VALIDATION.md` (Scenarios A, B, C).
- [ ] All UAT roles provisioned.
- [ ] Legal V1 route freeze confirmed (`LEGAL_V1_FINAL_ARCHITECTURE_REPORT.md`).
- [ ] Typecheck clean at UAT start commit.

## B. Module coverage (all must be COMPLETE)

- [ ] Module A — Compliance → Legal Referral (12 cases)
- [ ] Module B — Legal Intake (10 cases)
- [ ] Module C — Matter Workspace (14 cases)
- [ ] Module D — Recoverable Liabilities (12 cases)
- [ ] Module E — Court Operations (10 cases)
- [ ] Module F — Appeals (6 cases)
- [ ] Module G — Post-Judgment Recovery (10 cases)
- [ ] Module H — Dashboards & Reports (8 cases)
- [ ] Module I — Security & Permissions (12 cases)
- [ ] Negative tests (18 cases)

## C. Financial validation

- [ ] All invariants in `UAT_FINANCIAL_VALIDATION.md §1` return 0 rows.
- [ ] Every seeded matter reconciles to `v_lg_case_financials`.
- [ ] FIN-001..015 all PASS.

## D. Security validation

- [ ] SEC-001..025 matrix complete.
- [ ] Route-guard tests SEC-R-001..005 PASS.
- [ ] Server-side (defence-in-depth) tests SEC-S-001..004 PASS.
- [ ] Data-scope tests SEC-D-001..004 PASS.

## E. Defect status

- [ ] Zero Blocker defects OPEN.
- [ ] Zero Major defects OPEN (or explicit business waiver attached).
- [ ] Minor defects triaged and either fixed or accepted as backlog.
- [ ] Enhancement requests logged to V2 backlog.

## F. Documentation

- [ ] `UAT_TEST_CASES.md` updated with Actual/Pass-Fail.
- [ ] `UAT_EXECUTION_TRACKER.md` closed.
- [ ] `UAT_DEFECT_LOG_TEMPLATE.md` populated and closed.
- [ ] Evidence archived under `docs/legal/UAT/evidence/`.

## G. Sign-Off

| Party | Name | Role | Signature | Date |
|---|---|---|---|---|
| Business Owner | | | | |
| Legal Lead | | | | |
| Compliance Lead | | | | |
| QA Lead | | | | |
| Product / Delivery | | | | |
| IT / Security | | | | |

**Decision:** ☐ Accepted for production · ☐ Conditional accept (list conditions) · ☐ Rejected (return to fix)

Conditions / notes:
_____________________________________________________________________
_____________________________________________________________________
