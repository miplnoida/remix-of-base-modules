# Benefits Domain (`bn_*`) — Enterprise Audit and Quarantine Report

**Status:** Audit + quarantine actions. Non-destructive. No schema changes.
**Date:** 2026-07-13
**Scope:** All `bn_*` tables, all Benefits-adjacent routes (`/bn/*`, `/nbenefit/*`, `/newbenefit/*`, `/benefits/*`), all Benefits services, and integration boundaries with Communication Hub, Finance/Ledger, Workflow, Legal, DMS, IP and ER.

Architectural framing is fixed: `/bn/*` and `bn_*` are canonical. Legacy PowerBuilder tables (`cl_*`, `au_cl_*`, `cn_*`, `au_cn_*`) and the mock/prototype namespaces (`/newBenefit/*`, `/nbenefit/*`, overlapping `/benefits/*`) are **not** alternative production architectures.

---

## 1. Executive summary

| Signal | Finding |
| --- | --- |
| `bn_*` tables (total) | 200 |
| `bn_*` tables populated (>0 rows) | ~110 |
| `bn_*` tables empty (0 rows) | **50** — see §4.2 |
| `bn_*` tables with RLS enabled | **0** |
| `bn_*` tables with policies | **0** |
| `bn_*` grants to `anon` | **0** (good) |
| Distinct `bn_*` write sites in `src/` (browser) | ~85 across insert/update/delete/upsert |
| Edge-function `bn_*` write sites | ~10 |
| Legacy PowerBuilder rows (`cl_*` + `cn_*` + `au_*`) | Millions (e.g. `cl_cheques` 2.4M, `cl_track` 1.4M, `cl_head` 381K) — historical only |
| Mock Benefits service in production bundle | `src/services/newBenefitService.ts` (in-memory singleton) |
| Contributor-facing pages backed by mock service | 6 pages under `src/pages/newBenefit/*` |

**Top risks**

1. **No RLS on any `bn_*` table.** All Benefits data is protected only by the absence of `anon` grants and by `authenticated`-role access. Any authenticated user can, in principle, read/write every `bn_*` row via PostgREST unless a Postgres GRANT restricts it. Direct browser writes (see §5) make this a real exposure.
2. **~40 direct browser write paths** to core Benefits tables (`bn_claim`, `bn_claim_event`, `bn_payment_instruction`, `bn_payment_batch`, `bn_issue_record`, `bn_batch_item`, `bn_product_version`, `bn_approval_policy`, `bn_letter`, …). No server-side authorization gate in front of them.
3. **`newBenefitService.ts` is a mock store** still imported by six production pages under `/newbenefit/*`. It is not a Benefits data source and must be labelled as such and retired.
4. **`bn_communication_log` (57 rows) and `bn_letter` (13 rows) are being written directly** by browser code. This bypasses the Communication Hub sending spine.
5. **50 empty `bn_*` tables** — several of them are declared canonical (e.g. `bn_overpayment`, `bn_life_certificate`, `bn_payment_reconciliation`, `bn_eft_file`, `bn_award_status_event`, `bn_calc_legacy_snapshot`, `bn_issue_record` and its dependents, `bn_medical_*` catalogues). Either the write path is missing or it is going to a legacy table.

---

## 2. Fixed architectural rules applied by this audit

- `bn_*` is canonical for Benefits. Do **not** replace with `core_*`, Legal, Compliance or legacy tables.
- Where a shared platform table exists and legitimately owns a different responsibility, define the boundary (§6). Do **not** delete the `bn_*` counterpart.
- Non-canonical implementations (`/newBenefit/*`, `/nbenefit/*`, overlapping `/benefits/*`, `newBenefitService`, mock stores, `cl_*`/`au_cl_*`/`cn_*`/`au_cn_*`) may be audited, referenced, mapped for migration, quarantined, redirected, or retired. They must **not** become independent production write paths or a second canonical.
- No new `bn_*` table without: search of existing `bn_*` by business meaning → column/relationship inspection → extend-first analysis → written justification → architecture approval.

---

## 3. `bn_*` inventory by responsibility (canonical map)

The `bn_*` namespace splits cleanly into 12 responsibility groups. All are canonical.

| # | Responsibility | Representative tables | Live rows | Status |
| --- | --- | --- | --- | --- |
| 1 | **Product & versioning** | `bn_product`, `bn_product_version`, `bn_product_channel_config`, `bn_product_parameter`, `bn_product_amendment_policy`, `bn_product_test_case`, `bn_product_participant_config`, `bn_version_approval` | 23 / 36 / 57 / 81 / 23 / 54 / 21 / 15 | ✅ complete |
| 2 | **Rules & eligibility** | `bn_eligibility_rule`, `bn_eligibility_fact`, `bn_rule_catalogue`, `bn_rule_group`, `bn_rule_group_item`, `bn_rule_condition`, `bn_claim_eligibility`, `bn_derived_fact` | 195 / 73 / 51 / 24 / 67 / 42 / 31 / 31 | ✅ complete |
| 3 | **Formulas & calc trace** | `bn_formula_template`, `bn_formula_version`, `bn_formula_variable_registry`, `bn_product_formula_binding`, `bn_calc_run`, `bn_calc_trace`, `bn_calculation_rule`, `bn_claim_calculation` | 38 / 36 / 61 / 23 / 9 / 143 / 22 / 8 | ✅ complete |
| 4 | **Claims lifecycle** | `bn_claim`, `bn_claim_application`, `bn_claim_event`, `bn_claim_status_def`, `bn_claim_transition_rule`, `bn_claim_participant`, `bn_claim_decision`, `bn_claim_intake_validation`, `bn_claim_evidence`, `bn_claim_field_ownership` | 22 / 20 / 54 / 16 / 61 / 2 / 13 / 38 / 2 / 252 | 🟡 partial — `bn_claim_amendment_log`, `bn_claim_correction_request`, `bn_claim_correction_field`, `bn_claim_document`, `bn_claim_queue_assignment`, `bn_claim_detail` all empty despite write paths in code |
| 5 | **Awards & entitlement** | `bn_award`, `bn_award_beneficiary`, `bn_award_rate_history`, `bn_award_status_event`, `bn_award_suspension_event`, `bn_entitlement` | 3 / 0 / 0 / 0 / 0 / 4 | 🟡 partial — event/history tables empty; write path missing or bypassed |
| 6 | **Payments (canonical)** | `bn_payment_instruction`, `bn_payment_batch`, `bn_batch_item`, `bn_payment_schedule`, `bn_payment_exception`, `bn_payment_reconciliation`, `bn_payment_profile`, `bn_payment_source_account`, `bn_payment_method`, `bn_cheque_register`, `bn_cheque_stock`, `bn_eft_file`, `bn_eft_format`, `bn_eft_format_field`, `bn_issue_record` | 4 / 3 / 2 / 0 / 0 / 0 / 2 / 1 / 5 / 0 / 4 / 0 / 2 / 13 / 0 | 🟡 partial — many pipe stages empty; also see §6.2 |
| 7 | **Overpayment** | `bn_overpayment` | 0 | 🔴 disconnected — canonical exists, no writer, no consumer |
| 8 | **Medical** | `bn_medical_procedure`, `bn_medical_provider_type`, `bn_medical_facility`, `bn_medical_tariff_table`, `bn_medical_tariff_row`, `bn_medical_reimbursement_limit`, `bn_medical_reimbursement_calc`, `bn_medical_recommendation`, `bn_medical_claim_expense`, `bn_medical_review_schedule`, `bn_medical_expense_type`, `bn_medical_authorization_rule`, `bn_medical_referral_rule`, `bn_medical_location_type`, `bn_medical_facility_procedure` | mostly 0–6 | 🟡 catalogue populated, transactional tables empty |
| 9 | **Documents & evidence** | `bn_doc_requirement`, `bn_evidence_checklist`, `bn_evidence_audit`, `bn_claim_document`, `bn_service_doc_type`, `bn_document_profile` | 368 / 270 / 3 / 0 / 32 / 1 | 🟡 requirement catalogue solid; per-claim document link table empty |
| 10 | **Workflow (Benefits-owned)** | `bn_workflow_template`, `bn_workbasket`, `bn_workbasket_role`, `bn_role_bundle`, `bn_role_bundle_member`, `bn_role_delegation`, `bn_approval_policy`, `bn_escalation_policy`, `bn_escalation_policy_level`, `bn_escalation_event`, `bn_override_policy`, `bn_override_request`, `bn_override_request_event`, `bn_claim_queue_assignment` | 44 / 30 / 40 / 4 / 15 / 0 / 303 / 11 / 16 / 0 / 5 / 3 / 6 / 0 | 🟡 — see boundary §6.3 |
| 11 | **Communications (Benefits context)** | `bn_comm_event`, `bn_comm_mapping`, `bn_communication_log`, `bn_letter` | 19 / 824 / 57 / 13 | 🔴 boundary violation — see §6.1 |
| 12 | **Legal referral (Benefits view)** | `bn_legal_referral` | 3 | 🟡 boundary — see §6.4 |
| 13 | **Country / config packages** | `bn_country`, `bn_country_payment_config`, `bn_country_address_model`, `bn_country_id_rule`, `bn_country_participant_type`, `bn_country_config_package`, `bn_country_config_package_item` | 3 / 9 / 12 / 2 / 16 / 0 / 0 | 🟡 packages defined but empty |
| 14 | **Simulation** | `bn_sim_scenario`, `bn_sim_run`, `bn_sim_run_input`, `bn_sim_run_output`, `bn_sim_formula_trace`, `bn_sim_rule_trace`, `bn_sim_config_snapshot`, `bn_calc_simulation_preset` | 1 / 3 / 8 / 0 / 0 / 0 / 3 / 0 | 🟡 partial |

**No responsibility duplication was found inside `bn_*`.** Each business concept above has a single canonical header table. No merging or consolidation of `bn_*` headers is recommended.

---

## 4. Empty `bn_*` tables

### 4.1 Empty but wired-up (have write callers in code)

These have insert/update sites in the codebase but zero rows. Either the code path is untested in this environment, or the writer is behind a feature flag never turned on. **Action:** verify each writer with a smoke test before Benefits go-live; do not add new tables in these areas.

`bn_issue_record`, `bn_post_issue_task`, `bn_payment_exception`, `bn_payment_schedule`, `bn_claim_amendment_log`, `bn_claim_correction_request`, `bn_claim_correction_field`, `bn_claim_document`, `bn_claim_queue_assignment`, `bn_claim_detail`, `bn_calc_override`, `bn_calc_legacy_snapshot`, `bn_external_task`, `bn_external_task_audit`, `bn_external_task_document`, `bn_life_certificate`, `bn_eft_file`, `bn_award_rate_history`, `bn_award_status_event`, `bn_award_suspension_event`, `bn_award_beneficiary`, `bn_escalation_event`, `bn_module_events`, `bn_role_delegation`, `bn_product_calc_validation_report`, `bn_product_version_workflow`, `bn_product_participant_task_config`, `bn_derived_fact_event`, `bn_claim_source_map`, `bn_cheque_register`, `bn_sim_run_output`, `bn_sim_formula_trace`, `bn_sim_rule_trace`.

### 4.2 Empty and unused / disconnected

Canonical by design but with **no writer and no consumer** in the current codebase. **Action:** keep the table; add to §7 quarantine watch-list.

`bn_overpayment`, `bn_payment_reconciliation`, `bn_medical_reimbursement_calc`, `bn_medical_review_schedule`, `bn_medical_recommendation`, `bn_medical_claim_expense`, `bn_medical_expense_type`, `bn_medical_referral_rule`, `bn_medical_facility_procedure`, `bn_coverage_type_rule`, `bn_country_participant_proof_link`, `bn_country_config_package`, `bn_country_config_package_item`, `bn_eligibility_diagnostic`, `bn_calculation_trace` (superseded in practice by `bn_calc_trace`, 143 rows — **investigate merge**), `bn_calc_simulation_preset`.

### 4.3 Only real intra-`bn_*` overlap flag

- `bn_calc_trace` (143 rows, active) vs `bn_calculation_trace` (0 rows, no callers). **Recommendation:** treat `bn_calculation_trace` as deprecated; do not write to it; schedule removal in a future migration once verified.

No other `bn_*` table performs the same responsibility as another `bn_*` table.

---

## 5. Direct browser writes & authorization posture

- **RLS is disabled on every `bn_*` table** (0 of 200).
- **No policies exist on any `bn_*` table** (0 of 200).
- Access is presently controlled only by:
  - `anon` role having no `bn_*` grants (verified).
  - `authenticated` role grants (unaudited here; likely `GRANT ALL`).
  - Application-layer permission checks in React/services.

**Top direct browser writers** (from `src/**`, `.from('bn_*').(insert|update|delete|upsert)`):

| Count | Statement |
| --- | --- |
| 28 | `bn_claim_event.insert` |
| 9 | `bn_payment_instruction.update` |
| 9 | `bn_payment_batch.update` |
| 9 | `bn_issue_record.update` |
| 8 | `bn_batch_item.update` |
| 7 | `bn_post_issue_task.update` |
| 6 | `bn_product_version.update`, `bn_payment_exception.insert`, `bn_claim.update` |
| 5 | `bn_claim_decision.insert` |
| 4 | `bn_payment_schedule.insert`, `bn_letter.update`, `bn_evidence_audit.insert` |
| 3 | `bn_version_approval.insert`, `bn_approval_policy.insert`, `bn_communication_log.update`, `bn_doc_requirement.delete`, `bn_evidence_checklist.insert` |

**Finding.** Every one of these paths writes to production `bn_*` from the client with no server-side authorization boundary and no RLS backstop. This is the single largest security exposure in the Benefits domain and blocks Benefits production sign-off independent of anything else in this audit.

**Recommendation (blocking, but out of scope for this quarantine PR).**

1. Enable RLS on every `bn_*` table.
2. Add `GRANT SELECT` (read) + `GRANT` on the narrow set of mutation columns needed, gated by `authenticated`.
3. Move every mutating call to a `SECURITY DEFINER` RPC (`bn_claim_event_append`, `bn_claim_decision_record`, `bn_payment_instruction_update`, …) that centralises auth + audit.
4. Client code should call only these RPCs; direct `.from('bn_...')`.`insert|update|delete` from the browser should be lint-blocked.
5. Every RPC must write a `bn_claim_event` (or equivalent) audit trail row and a `core_audit_log` entry.

---

## 6. Integration boundaries

### 6.1 Benefits ↔ Communication Hub

**Boundary.**
- **Benefits owns:** the *business event* that triggers a communication (award granted, claim rejected, life certificate due, medical review scheduled), the recipient references, and the domain payload.
- **Communication Hub owns:** template selection, active version, branding/letterhead/signature/footer/disclaimer, sender profile, approval requirement, queueing, dispatch, retry, delivery event log, communication audit log.

**Current state.**
- `bn_comm_event` (19 rows) and `bn_comm_mapping` (824 rows) are legitimate Benefits catalogues — the event registry and the event→template mapping for Benefits. **Keep.**
- `bn_communication_log` (57 rows) and `bn_letter` (13 rows) currently receive **direct browser writes**. This bypasses Communication Hub.

**Rule (already codified in `mem://features/communication-hub/guardrails`).**
Benefits modules must not:
- insert into `notification_queue` / `notification_logs` directly, or
- insert into `bn_communication_log` / `bn_letter` as the primary send path.

**Required change.** Every place that inserts/updates `bn_communication_log` or `bn_letter` must instead call:

```ts
sendCommunication({
  moduleCode: 'BENEFITS',
  departmentCode: 'BN',
  eventCode: 'bn.<event_code>',
  channels,
  recipient,
  data,
  reference: { claimId, awardId },
  idempotencyKey,
});
```

`bn_communication_log` and `bn_letter` become **projection tables** populated by a Communication Hub → Benefits event handler, not primary write paths.

### 6.2 Benefits ↔ Finance / Ledger

**Boundary.**
- **Benefits owns:** `bn_award`, `bn_entitlement`, `bn_payment_instruction`, `bn_payment_batch`, `bn_batch_item`, `bn_payment_schedule`, `bn_payment_exception`, `bn_cheque_register`, `bn_eft_file`, `bn_overpayment` (liability), `bn_issue_record`.
- **Finance / Ledger owns:** `core_ledger_head`, `core_ledger_payment_allocation`, `core_payment_allocation`, `core_payment_arrangement*`, `core_employer_ledger_*`, GL postings, reconciliation with bank.

**No competing table found.** `bn_payment_instruction` and `core_payment_allocation` cover different responsibilities (instruction to pay a beneficiary vs. GL allocation of received money). **Keep both.**

**Rule.**
- Benefits raises payment instructions and batches; Finance/Ledger posts the corresponding GL entries.
- `bn_overpayment` records the *Benefits liability* (which claim/award, which period). The offsetting AR ledger row and payment plan live in Finance (`core_employer_ledger_*` and `core_payment_arrangement*`) — Benefits references them by ID, does not duplicate.
- `bn_payment_reconciliation` (currently empty) is the Benefits-side reconciliation view; the master reconciliation and bank matching remain in Finance.

### 6.3 Benefits ↔ Workflow

**Boundary.**
- **Benefits owns:** `bn_workflow_template`, `bn_approval_policy`, `bn_escalation_policy*`, `bn_workbasket`, `bn_workbasket_role`, `bn_override_policy`, `bn_role_bundle*`. These describe Benefits-specific workflow, approval and escalation rules.
- **Core Workflow owns:** `core_workflow_definition`, `core_workflow_instance`, `core_workflow_step`, `core_workflow_task`, `core_workflow_action_log`, `core_workflow_transition`, `core_workbasket`. These are the platform's execution engine and task inbox.

**Current state.** `bn_workflow_template` (44 rows) and `bn_workbasket` (30 rows) are populated. `core_workflow_*` also exists.

**Rule.**
- Benefits defines **what** must be approved/escalated and by which role bundle.
- Core Workflow executes **how** and stores the runtime instance, tasks, and per-user inbox.
- `bn_workbasket` is a Benefits-facing view configuration (columns, filters, SLA) that projects a slice of `core_workflow_task`. It is not a competing task table.

### 6.4 Benefits ↔ Legal / DMS / IP / ER

**Legal.**
- Benefits owns `bn_legal_referral` (3 rows) — the Benefits-side handoff record referencing the appealed decision, the Benefits impact, and reinstatement rules.
- Legal owns `lg_case`, `lg_appeal`, `lg_hearing`, `lg_order`, `lg_recovery_*`, `la_matter*` — the formal proceedings and their lifecycle.
- **Rule.** `bn_legal_referral` links out to `lg_case` by ID. Benefits must never write to `lg_*` tables directly.

**DMS.**
- Benefits owns `bn_claim_document`, `bn_doc_requirement`, `bn_evidence_checklist`, `bn_evidence_audit`, `bn_service_doc_type`, `bn_document_profile` — the *link* between a claim/product/participant and a required document and its verification state.
- DMS owns `core_dms_*`, `core_document_profile`, `core_generated_document` — the actual file bytes, storage policy, retention, and provenance of generated PDFs.
- **Rule.** Benefits stores a DMS `document_id` foreign reference only. File content, versioning, retention, and access audit are DMS concerns.

**IP (Insured Persons).**
- IP owns `ip_master`, `ip_depend`, `ip_wages`, `ip_employer`, `ip_names`, `ip_self_employ` and the SSN identity truth.
- Benefits owns `bn_claim_person_snapshot` (19 rows) and `bn_claim_participant` (2 rows) — snapshots and roles **specific to the claim as at claim date**.
- **Rule.** Snapshots are canonical for Benefits history. Live person truth belongs to IP. Benefits must not overwrite IP.

**ER (Employer Register).**
- ER owns `er_master`, `er_owner`, `er_locations`, `er_visit`, `er_suit`.
- Benefits owns `bn_claim_employer_snapshot` (10 rows) — the employer facts frozen at the moment of a claim.
- **Rule.** Same as IP — Benefits stores a snapshot; ER stays the master.

---

## 7. Non-canonical Benefits surfaces — quarantine map

### 7.1 `/newBenefit/*` + `newBenefitService.ts` (mock)

- Route mounts: 12 live routes in `src/components/routing/AppRoutes.tsx` (`~2465-2487`) plus 6 pages using the mock service.
- Data source: `src/services/newBenefitService.ts` — **in-memory singleton with hard-coded persons, claims, payments**. Not connected to any `bn_*` table.
- Redirected already: `/newbenefit/worklists`, `/newbenefit/intake`, `/newbenefit/pension-admin`, `/newbenefit/payments`, `/newbenefit/communications`, `/newbenefit/auditor`.
- Still live (portal-style contributor/employer/staff prototypes): `/newbenefit/dashboard`, `/apply`, `/apply/:benefitType`, `/new-referral`, `/new-verification`, `/verification/:verificationId`, `/my-claims`, `/reports`, `/inbox`, `/claim-360/:claimId`, `/medical-board`, `/employer-hub`, `/admin`.

**Quarantine decision.**
- Do **not** rip these routes yet — they double as UX references for the still-being-built external portal (`src/portals/*`).
- Mark `newBenefitService.ts` and `NewBenefitAuthContext.tsx` with a canonical-status banner (done in this PR — see §9).
- Every remaining live `/newbenefit/*` page is treated as **not production**. It must never be linked from menus, never referenced from `/bn/*` pages, and must be migrated into `src/portals/*` (with real Cloud calls via `sendCommunication` and `bn_*` RPCs) before any external release.

### 7.2 `/nbenefit/*`

- 63 route mounts. Already **~55%** redirected to `/bn/*` or `/admin/notification-templates`.
- Still live legacy pages: `nbenefit/application/:benefitType` (real form engine — retained), `nbenefit/config/rules/:id` and `/edit` (legacy `BenefitRuleEditor`), `nbenefit/config/medical/*`, `nbenefit/long-term/*` (AgeBenefit, InvalidityBenefit, AssistanceBenefit, SurvivorsBenefit, LifeCertificateManagement, BeneficiaryRegistry, BeneficiaryDetail), `nbenefit/non-contributory/*`, `nbenefit/short-term/*` (Sickness, EmploymentInjury, Maternity, FuneralGrant), `nbenefit/shared/*`.

**Quarantine decision.**
- These are **legacy staff screens**. Where a `/bn/*` equivalent already exists (rules, engine, awards, life certificates, workflows, medical rules), the redirect is already in place. Do not force redirects for the rest until a per-page parity check is done.
- Every remaining live `/nbenefit/*` page must be prefixed with a "Legacy: not canonical" banner in a follow-up UI pass and removed from the top-level nav.
- `src/pages/nbenefit/_legacy/*` is correctly quarantined under `_legacy` — do not consume from `/bn/*`.

### 7.3 `/benefits/*`

- All 10 remaining `/benefits/*` route mounts in `AppRoutes.tsx` are already `<Navigate to="/bn/*">` redirects **except** `/benefits/reports/payments-by-type`, `/benefits/reports/claims-volume`, `/benefits/reports/overpayments` (three legacy report pages) and `/finance/accounts-payable/benefits-verification` (Finance-owned, not a Benefits duplicate).

**Quarantine decision.**
- Keep the three legacy report pages until `/bn/*` has equivalent reports; then redirect.
- `/finance/accounts-payable/benefits-verification` is correctly Finance-owned — not a Benefits duplicate.

### 7.4 Legacy `cl_*` / `au_cl_*` / `cn_*` / `au_cn_*`

- Enormous historical row counts (millions in `cl_cheques`, `cl_track`, `cl_head`, `cl_cheques_survivor`, `cl_head_wages`, `cl_detail_sib`, `cl_wages_credited`, `cl_bank_acct`, `cl_head_2014`, `cl_detail_matern`, `cl_head_recalc`, `cl_detail_me`, `cl_detail_pen`, `cl_void`, `cl_detail_sb`).
- These tables are **read-only historical / migration-source**. No new `/bn/*` write path should target them.
- `cn_c3_reported`, `cn_payment`, `cn_receipt`, `cn_batch` remain the contribution/collection PowerBuilder tables — they are C3/collection concerns, not Benefits.

**Quarantine decision.**
- No changes. These stay as migration sources per the fixed architectural rules. Any future Benefits migration reads from them into `bn_*` via a controlled `mig_migration_*` batch, never from a live `/bn/*` code path.

---

## 8. Extend-first checklist for new `bn_*` requests

Any proposal to add a new `bn_*` table must document all seven:

1. Business meaning search across all `bn_*` — attach ripgrep output.
2. Column/relationship inspection of candidate incumbents.
3. Why `bn_claim`, `bn_award`, `bn_entitlement`, `bn_payment_instruction`, `bn_payment_batch`, `bn_issue_record`, `bn_post_issue_task`, `bn_overpayment`, `bn_letter`, `bn_communication_log`, or the closest existing table cannot be extended.
4. Whether the responsibility actually belongs outside Benefits (Communication Hub, Finance, Workflow, Legal, DMS, IP, ER, Core Reference) — see §6.
5. Whether the underlying concept is already served by one of the 50 empty canonical tables in §4.
6. Row-level security, grant plan, RPC plan, audit plan.
7. Written architecture approval reference.

Do not create two `bn_*` headers for the same business concept. **This audit found none today.** Keep it that way.

---

## 9. Quarantine actions performed in this PR

1. Added a deprecation banner to **`src/services/newBenefitService.ts`** marking it explicitly non-canonical and reserved for prototype/portal reference.
2. Added a deprecation banner to **`src/contexts/NewBenefitAuthContext.tsx`** marking it non-canonical.
3. This audit report (`docs/bn/enterprise-domain-audit.md`).

Not performed in this PR (called out for a follow-up, not silently done):

- Redirecting the 12 remaining live `/newbenefit/*` pages — deferred until `src/portals/*` picks them up.
- Redirecting the ~30 remaining live `/nbenefit/*` legacy staff pages — needs per-page parity check.
- Enabling RLS on `bn_*` — needs a coordinated migration + RPC pass; see §5.
- Retiring `bn_calculation_trace` in favour of `bn_calc_trace` — needs verification.
- Redirecting direct browser writes to `bn_communication_log` / `bn_letter` through `sendCommunication` — needs a Communication Hub work order.

---

## 10. NEEDS_REVIEW

- **RLS enablement plan for `bn_*`.** This is the biggest gap. Recommend a dedicated epic (`BN-SEC-1`) that enables RLS + moves every mutating client call to `SECURITY DEFINER` RPCs, ordered by write-site frequency (§5 table).
- **`bn_communication_log` and `bn_letter` primary write path.** These 4 direct browser writers must be re-routed through Communication Hub before any Benefits production live event.
- **50 empty `bn_*` tables.** Confirm intent for each: (a) reserved but not yet wired, (b) obsolete, (c) `_legacy_snapshot`-style migration sink. Update this table quarterly.
- **`bn_calculation_trace` vs `bn_calc_trace`.** Confirm the latter is canonical; schedule removal of the former.
- **`newBenefitService.ts` retirement date.** Set the target release once `src/portals/*` covers contributor/employer flows against real Cloud endpoints.
- **`/nbenefit/*` per-page parity** for Sickness, EmploymentInjury, Maternity, FuneralGrant, AgeBenefit, InvalidityBenefit, SurvivorsBenefit, AssistanceBenefit, LifeCertificateManagement, BeneficiaryRegistry, BeneficiaryDetail, non-contributory pension pages — assign owners.
- **Reports `/benefits/reports/payments-by-type|claims-volume|overpayments`** — target `/bn/*` report parity or redirect to canonical BN reporting.
