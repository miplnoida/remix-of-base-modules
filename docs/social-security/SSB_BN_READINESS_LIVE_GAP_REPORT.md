# SSB → BN Product Builder — Live Gap Report

**Date:** 2026-07-06
**Scope:** St. Kitts & Nevis (KN) SSB Implementation only
**Mode:** Read-only inspection. No code, schema, or data changed.
**Verdict:** ❌ **BN Product Builder remains ON HOLD.** Multiple hard blockers.

Sources inspected:
- `/admin/ssb-setup` — `SsbSetupPage.tsx`, `ssbImplementationConfigService.ts`
- `/admin/configuration-governance` — `ConfigurationGovernancePage.tsx`, `ssbConfigurationGovernanceService.ts`
- Live DB: `ssb_*_policy`, `ssb_configuration_*`, `ssp_*`, `core_number_sequence`, `core_template`, `core_dms_document_type`, `public_holidays`, `remittance_schedule`
- `docs/bn/BN_PRODUCT_BUILDER_SHARED_DOMAIN_CONSUMPTION_MAP.md`
- `docs/social-security/SSB_CONFIGURATION_GOVERNANCE_ACCEPTANCE.md`

---

## 1. Executive Summary

| Layer | State |
|---|---|
| SSB Implementation Profile (KN) | ✅ 1 row, active |
| Shared domain seed (Epic 2.5A / 2.5B) | ✅ mostly present |
| **SSB policy bindings (`ssb_*_policy`)** | ❌ **ALL EMPTY (0 rows across 9 policy tables)** |
| Governance registry (assets/dependencies) | ✅ 11 assets, 10 dependencies |
| Governance packages / validation runs / snapshots | ❌ 0 rows — **never executed** |
| BN Product Builder gate | ❌ Blocked — governance requires 0 errors; validation never run and policies missing |

Because every `ssb_*_policy` table is empty, the SSB resolver cannot bind ANY shared-domain value to an implementation rule. The Process Readiness panel on `/admin/ssb-setup` therefore shows `missing` / `partial` for every process, and Configuration Governance would produce a validation score of essentially 0 the moment it is run.

---

## 2. Gate-by-Gate Classification

Legend: **READY** = usable end-to-end · **PARTIAL** = shared-domain data present but no SSB binding · **MISSING** = neither side present · **DEFERRED** = out of current scope

| # | Gate | Status | Evidence | Blocker for BN? |
|---|---|---|---|---|
| 1 | KN default profile | ✅ READY | `ssb_implementation_profile` = 1 row, `country_code=KN` | — |
| 2 | Address policy | ⚠️ PARTIAL | `ssp_country_profile`=1, `ssp_geo_area` KN=16; **`ssb_address_policy`=0** | YES |
| 3 | NIS / SSN identity policy | ⚠️ PARTIAL | `ssp_identity_type`=5, `ssp_country_identity_rule` KN=5 (NIS primary); **`ssb_identity_policy`=0** | YES (hard — NIS binding is mandatory) |
| 4 | Member numbering | ❌ MISSING | `core_number_sequence` has NO rows for `MEMBER` / IP; **`ssb_numbering_policy`=0** | YES |
| 5 | Employer numbering | ❌ MISSING | `core_number_sequence` has NO rows for `EMPLOYER`; **`ssb_numbering_policy`=0** | YES |
| 6 | Benefit / Claim numbering | ❌ MISSING | No `BENEFIT`, `CLAIM`, or `BN` entries in `core_number_sequence` (only LEGAL_*, CE_* seeded) | YES (once benefits activated) |
| 7 | Contribution calendar | ❌ MISSING | `remittance_schedule`=0; **`ssb_contribution_calendar_policy`=0** | YES |
| 8 | Payment channels | ⚠️ PARTIAL | `ssp_payment_channel`=5; **`ssb_financial_policy`=0** (no binding of which channels SSB accepts) | YES |
| 9 | Bank list | ❌ MISSING | **`ssp_bank`=0, `ssp_bank_branch`=0** (per Epic 2.5A note: awaiting verified SSA list) | YES (BLOCKING — flagged in seed guide) |
| 10 | Relationship types | ❌ MISSING | Not evidenced in shared-domain seed for KN; no SSB binding table exists in this scope | Confirm — likely YES for dependants |
| 11 | Legal act / sections / chapter | ⚠️ PARTIAL | `ssp_legal_act` KN=2 (`SSA_CAP329` ACTIVE, `CONFIG_PENDING` SUPERSEDED); `ssp_legal_section`=11; `ssp_regulation`=1; **`ssb_legal_policy`=0** | YES (binding needed; content is minimum-viable) |
| 12 | Document policy | ⚠️ PARTIAL | `core_dms_document_type`=49; **`ssb_document_policy`=0** | YES |
| 13 | Workflow / SLA policy | ❌ MISSING | **`ssb_workflow_policy`=0**; no workflow templates confirmed for SSB processes | YES |
| 14 | Communication templates | ⚠️ PARTIAL | `core_template`=304; **`ssb_communication_policy`=0** | YES |
| 15 | SMS / Letter template decision | ❓ UNDECIDED | No decision recorded in `ssb_communication_policy` (empty). Channel strategy for KN not captured. | YES (decision + binding required) |
| 16 | Calendar / holidays | ⚠️ PARTIAL | `public_holidays`=18 rows (source not KN-verified in this pass); no SSB binding | YES (verify KN set + bind) |
| 17 | Benefit Setup resolver | ⚠️ PARTIAL | `getBenefitSetupConfig` exists in `ssbPolicyLifecycleService`; returns empty because underlying policies are empty | YES (unblocks once policies land) |
| 18 | Contribution / Claims / Payments resolvers | 🕓 DEFERRED (pending) | Explicitly rendered as "Resolver pending" in `ProcessReadinessPanel` — resolvers not yet implemented | Non-blocking for THIS gap sweep; blocks BN when contribution/claims wiring resumes |
| 19 | Governance validation run | ❌ MISSING | `ssb_configuration_validation_run`=0, `_result`=0 — never executed | YES (BN gate requires 0 errors) |
| 20 | Governance package + snapshot | ❌ MISSING | `ssb_configuration_package`=0, `ssb_configuration_snapshot`=0 | YES (release control) |

---

## 3. Hard Blockers (must close before BN Product Builder HOLD is lifted)

1. **All 9 `ssb_*_policy` tables empty.** No implementation binding exists for KN. Every gate downstream fails.
2. **NIS identity policy not bound** (`ssb_identity_policy`) — Member/Employer/Claims cannot resolve identifier rules.
3. **Member and Employer numbering sequences absent** from `core_number_sequence`, and no `ssb_numbering_policy` row selects one.
4. **Contribution calendar unresolved** — `remittance_schedule` empty AND `ssb_contribution_calendar_policy` empty.
5. **Verified KN bank & branch list absent** (`ssp_bank` = 0). Flagged BLOCKING in Epic 2.5A; must come from SSA.
6. **Financial policy binding missing** — payment channels seeded but SSB has not declared which apply.
7. **Legal binding missing** — `SSA_CAP329` is seeded but `ssb_legal_policy` does not tie it to penalty/interest formulas.
8. **Document, Workflow, Communication policies all empty** — no SSB-side selection of DMS types, SLAs, or templates.
9. **SMS vs Letter channel decision not recorded** for KN.
10. **Governance validation never run** — no baseline score, no snapshot, no package. BN gate cannot be evaluated.

## 4. Soft Blockers / Verify

- Public holidays: 18 rows present — verify they are the KN 2026 set and bind via a KN calendar policy.
- Relationship types (dependant categories) — confirm the shared-domain source table and whether an SSB binding table is required.
- Legal content depth: 11 sections and 1 regulation for KN — confirm they cover every section BN penalty/interest engines will cite.

## 5. Deferred (explicitly out of scope for this sweep)

- Contribution, Claims, and Payments resolvers — surfaced as "Resolver pending" in `ProcessReadinessPanel`. Do not treat as blockers here; treat as follow-on work once Benefit Setup resolver is green.

---

## 6. Recommended Close-Out Order (no work performed in this task)

1. Seed `core_number_sequence` for `MEMBER`, `EMPLOYER`, `CLAIM`, `BENEFIT` (KN).
2. Obtain and load verified KN `ssp_bank` / `ssp_bank_branch`.
3. Author `ssb_identity_policy` (NIS primary), `ssb_address_policy`, `ssb_numbering_policy` bindings.
4. Author `ssb_financial_policy` (bank+channels+settlement), `ssb_contribution_calendar_policy`, `ssb_legal_policy`, `ssb_document_policy`, `ssb_workflow_policy`, `ssb_communication_policy` (including SMS/Letter decision).
5. Run first `ssb_configuration_validation_run`; iterate until errors = 0.
6. Create `ssb_configuration_package` v1 → snapshot → activate.
7. Lift BN Product Builder HOLD.

---

## 7. Acceptance

- [x] Live inspection of `/admin/ssb-setup`, `/admin/configuration-governance`, `ssb_*_policy`, `ssb_configuration_validation_*`, and shared-domain tables.
- [x] Each gate classified READY / MISSING / PARTIAL / DEFERRED with row-level evidence.
- [x] Exact remaining blockers listed (Section 3).
- [x] No code, schema, or data changed.
- [x] BN Product Builder remains **ON HOLD** until Section 3 blockers are closed and a clean validation run produces 0 errors with an active configuration package.
