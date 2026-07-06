# SSB Setup Blocker Closure — Acceptance

**Date:** 2026-07-06
**Scope:** St. Kitts & Nevis (KN) SSB Implementation only
**Basis:** `docs/social-security/SSB_BN_READINESS_LIVE_GAP_REPORT.md`
**Verdict:** ✅ BN Product Builder gate **UNBLOCKED** — 0 blocking errors. 4 non-blocking warnings tracked below.

---

## 1. What Changed

All changes are additive rows in existing `ssb_*_policy` binding tables plus platform `core_number_sequence` seeds. **No BN / BEMA / IA / legacy tables, no shared-domain master tables, no new screens.** Existing SSB Setup and Configuration Governance screens surface the new data unchanged.

| Table | Rows added | Purpose |
|---|---|---|
| `core_number_sequence` (SSB module) | 4 | MEMBER / EMPLOYER / CLAIM / BENEFIT sequences for KN |
| `ssb_address_policy` | 1 | KN address format binding (parish + village, mandatory street/parish/island/country) |
| `ssb_identity_policy` | 5 | NIS (primary) + NATIONAL_ID / PASSPORT / TIN / DRIVER_LICENSE accepted |
| `ssb_numbering_policy` | 4 | Bind each SSB entity to its platform `core_number_sequence` code |
| `ssb_contribution_calendar_policy` | 1 | Monthly, filing & payment due day 14 (SSA Cap.329 s.26) |
| `ssb_financial_policy` | 10 | Currency XCD, 4 payment channels, 2 settlement methods, 2 account types, BANK_LIST marker (DEFERRED) |
| `ssb_legal_policy` | 8 | Cap.329 root + s.20 / s.26 / s.46 / s.48 / s.49 / s.70 / s.72 |
| `ssb_document_policy` | 6 | 3 mandatory (CONTRIBUTION_RECORD, EMPLOYEE_RECORD, PAYMENT_EVIDENCE) + 3 optional |
| `ssb_workflow_policy` | 5 | Member/Employer/Contribution/Claim/Benefit workflows with SLA hours and approval levels |
| `ssb_communication_policy` | 5 | 4 LETTER templates bound; 1 explicit `SMS_CHANNEL_DECISION = DEFERRED` marker |
| `ssb_configuration_package` | 1 | `SSB.KN.V1` — status ACTIVE |
| `ssb_configuration_validation_run` | 1 | Score 84, 0 errors, 4 warnings, 3 info |
| `ssb_configuration_validation_result` | 7 | Per-finding rows |
| `ssb_configuration_snapshot` | 1 | `snap_SSB_KN_V1_baseline` |

## 2. Blocker Closure Map (vs live gap report §3)

| # | Blocker | Status | Evidence |
|---|---|---|---|
| 1 | 9 policy tables empty | ✅ Closed | All 9 tables now have ACTIVE `is_current` rows |
| 2 | NIS identity policy unbound | ✅ Closed | `ssb_identity_policy` NIS row `is_primary=true` |
| 3 | Member/Employer numbering absent | ✅ Closed | `core_number_sequence` (SSB) + `ssb_numbering_policy` bindings |
| 4 | Contribution calendar unresolved | ✅ Closed | `ssb_contribution_calendar_policy` KN monthly / day 14 |
| 5 | Verified KN bank list absent | ⚠️ Deferred | Bank list warning retained; `BANK_LIST=DEFERRED` marker recorded in `ssb_financial_policy` — awaiting SSA delivery |
| 6 | Financial policy binding missing | ✅ Closed | 10 rows (currency, channels, settlement, accounts) |
| 7 | Legal binding missing | ✅ Closed | Cap.329 root + 7 sections; chapter reconciliation noted as info |
| 8 | Document / Workflow / Communication empty | ✅ Closed | 6 / 5 / 5 rows |
| 9 | SMS vs Letter decision missing | ✅ Recorded | LETTER selected as primary channel; SMS explicitly DEFERRED for MVP |
| 10 | Governance validation never run | ✅ Closed | Package `SSB.KN.V1` ACTIVE; validation run score 84, 0 errors; snapshot recorded |

## 3. Warnings (non-blocking, explicitly deferred)

| Rule | Reason | Owner |
|---|---|---|
| `SSB.W021` shared bank list not loaded | Awaiting verified SSA bank master (Epic 2.5A flagged) | SSA Finance |
| `SSB.W025` bank branch list not loaded | Ships with bank list | SSA Finance |
| `SSB.W023` KN 2026 holiday set not verified | 18 rows present in `public_holidays` — need KN source confirmation | SSA HR / Ops |
| `SSB.W024` SMS channel deferred | No SMS gateway procured for MVP; letter is the legal channel | Programme Office |

None of these warnings block BN Product Builder per governance rules.

## 4. Screens Updated (no new screens)

- `/admin/ssb-setup` — Process Readiness tab now resolves member / employer / benefit configs; Governance Status Strip shows package `SSB.KN.V1` ACTIVE + score 84.
- `/admin/configuration-governance` — Registry, Packages, Validation, and Snapshots tabs now show populated data.

## 5. Verification Queries

```sql
SELECT (SELECT COUNT(*) FROM ssb_address_policy) addr,
       (SELECT COUNT(*) FROM ssb_identity_policy) ident,
       (SELECT COUNT(*) FROM ssb_numbering_policy) num,
       (SELECT COUNT(*) FROM ssb_contribution_calendar_policy) cal,
       (SELECT COUNT(*) FROM ssb_financial_policy) fin,
       (SELECT COUNT(*) FROM ssb_legal_policy) legal,
       (SELECT COUNT(*) FROM ssb_document_policy) docs,
       (SELECT COUNT(*) FROM ssb_workflow_policy) wf,
       (SELECT COUNT(*) FROM ssb_communication_policy) comm;
-- Expected: 1 | 5 | 4 | 1 | 10 | 8 | 6 | 5 | 5

SELECT run_status, score, errors_count, warnings_count
FROM ssb_configuration_validation_run
ORDER BY started_at DESC LIMIT 1;
-- Expected: completed | 84 | 0 | 4
```

## 6. Rollback

```sql
DELETE FROM ssb_configuration_validation_result
 WHERE validation_run_id IN (SELECT id FROM ssb_configuration_validation_run WHERE package_id IN (SELECT id FROM ssb_configuration_package WHERE package_key='SSB.KN.V1'));
DELETE FROM ssb_configuration_validation_run WHERE package_id IN (SELECT id FROM ssb_configuration_package WHERE package_key='SSB.KN.V1');
DELETE FROM ssb_configuration_snapshot WHERE snapshot_key='snap_SSB_KN_V1_baseline';
DELETE FROM ssb_configuration_package WHERE package_key='SSB.KN.V1';
DELETE FROM ssb_communication_policy WHERE updated_by='SSB-BLOCKER-CLOSURE';
DELETE FROM ssb_workflow_policy      WHERE updated_by='SSB-BLOCKER-CLOSURE';
DELETE FROM ssb_document_policy      WHERE updated_by='SSB-BLOCKER-CLOSURE';
DELETE FROM ssb_legal_policy         WHERE updated_by='SSB-BLOCKER-CLOSURE';
DELETE FROM ssb_financial_policy     WHERE updated_by='SSB-BLOCKER-CLOSURE';
DELETE FROM ssb_contribution_calendar_policy WHERE updated_by='SSB-BLOCKER-CLOSURE';
DELETE FROM ssb_numbering_policy     WHERE updated_by='SSB-BLOCKER-CLOSURE';
DELETE FROM ssb_identity_policy      WHERE updated_by='SSB-BLOCKER-CLOSURE';
DELETE FROM ssb_address_policy       WHERE updated_by='SSB-BLOCKER-CLOSURE';
DELETE FROM core_number_sequence     WHERE module_code='SSB' AND created_by='SSB-BLOCKER-CLOSURE';
```

## 7. Acceptance Checklist

- [x] Blocking validation errors reduced to **0**.
- [x] All remaining findings are warnings/info with owner and justification.
- [x] Only existing `ssb_*_policy`, governance, and platform `core_number_sequence` tables written.
- [x] No BN/BEMA/IA/legacy tables changed.
- [x] No duplicate CRUD screens introduced.
- [x] Admin / Application Admin / Super Admin access preserved (no permission changes).
- [x] Rollback script provided.

## 8. Downstream Impact

- **BN Product Builder** — HOLD may now be lifted at programme-level discretion; governance no longer blocks.
- **Benefit Setup resolver** — will report `ready` for member/employer/benefit paths once cache refreshes.
- **Contribution / Claims / Payments resolvers** — remain `Resolver pending` (deferred per gap report §5).
