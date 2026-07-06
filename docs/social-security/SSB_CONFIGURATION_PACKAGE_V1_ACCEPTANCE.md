# SSB Configuration Package v1.0 — Acceptance

**Date:** 2026-07-06
**Scope:** St. Kitts & Nevis (KN) SSB Implementation only
**Basis:** `docs/social-security/SSB_SETUP_BLOCKER_CLOSURE_ACCEPTANCE.md`
**Verdict:** ✅ **BN Product Builder cleared to UNBLOCK.** Package `SSB.KN.V1` active, revalidated with 0 blocking errors.

---

## 1. Revalidation Result

| Metric | Value |
|---|---|
| Package | `SSB.KN.V1` — status **active** |
| Latest validation run | `completed` |
| Score | **84 / 100** |
| Blocking errors | **0** |
| Warnings | 4 (all deferred with owner) |
| Info | 3 |
| Snapshot | `snap_SSB_KN_V1_baseline` (active) |

Two validation runs are recorded for `SSB.KN.V1`: the baseline written at package activation, and the Prompt-3 revalidation checkpoint. Both agree.

## 2. Findings

### Warnings (non-blocking, explicitly deferred)

| Rule | Asset | Reason | Owner |
|---|---|---|---|
| `SSB.W021` | `ssb.financial` | Shared KN bank list not yet loaded (`ssp_bank`=0) | SSA Finance |
| `SSB.W025` | `ssb.financial` | Bank branch list not yet loaded (`ssp_bank_branch`=0) | SSA Finance |
| `SSB.W023` | `ssb.contribution_calendar` | KN 2026 public holiday set not yet verified | SSA HR / Ops |
| `SSB.W024` | `ssb.communication` | SMS channel deferred for MVP (no gateway procured) | Programme Office |

### Info

- `SSB.I030` — BN Product Builder gate is unblocked.
- `SSB.I031` — Legal coverage minimum-viable (Cap.329 + 7 sections).
- `SSB.I033` — Package `SSB.KN.V1` revalidated at prompt-3 checkpoint.

## 3. Lifecycle Actions Performed

1. **Validation** — `runSsbSetupValidation()` ruleset executed against all 9 `ssb_*_policy` tables.
2. **Package** — `SSB.KN.V1` already existed in `active` status (from blocker-closure); no new package created — v1 kept.
3. **Package validation** — errors_count = 0 → package remains **active**.
4. **Snapshot** — `snap_SSB_KN_V1_baseline` exists with full asset/dependency/policy-count JSON.
5. **BN Product Builder HOLD** — **eligible to lift** at programme-level discretion.

## 4. What Users See

- **`/admin/configuration-governance`** → Validation tab shows the latest run (score 84, 0 errors, 4 warnings); Packages tab shows `SSB.KN.V1` as active; Snapshots tab lists `snap_SSB_KN_V1_baseline`.
- **`/admin/ssb-setup`** → Governance Status Strip surfaces package `SSB.KN.V1` **ACTIVE** and score 84; Process Readiness resolves member / employer / benefit paths.

## 5. Verification Queries

```sql
SELECT package_key, status FROM ssb_configuration_package;
-- SSB.KN.V1 | active

SELECT run_status, score, errors_count, warnings_count, info_count
FROM ssb_configuration_validation_run
ORDER BY started_at DESC LIMIT 1;
-- completed | 84 | 0 | 4 | 3

SELECT snapshot_key FROM ssb_configuration_snapshot;
-- snap_SSB_KN_V1_baseline
```

## 6. BN Product Builder Decision

**Decision:** UNBLOCK eligible.

- Governance gate requires `errors_count = 0` on the active package. ✔ satisfied.
- All remaining findings are warnings/info with recorded owners; none marked `blocking = true`.
- Contribution / Claims / Payments resolvers remain `Resolver pending` (deferred per gap report §5) — this is orthogonal to the BN Product Builder gate and does not block Wave 1.

Programme sign-off may now proceed to BN Product Builder Consumption Refactor — Wave 1.

## 7. Rollback

See rollback in `docs/social-security/SSB_SETUP_BLOCKER_CLOSURE_ACCEPTANCE.md §6`. The Prompt-3 revalidation run can be removed with:

```sql
DELETE FROM ssb_configuration_validation_result
 WHERE validation_run_id IN (
   SELECT id FROM ssb_configuration_validation_run
   WHERE package_id = (SELECT id FROM ssb_configuration_package WHERE package_key='SSB.KN.V1')
 );
```

## 8. Acceptance Checklist

- [x] Validation re-run through the governance ruleset.
- [x] `errors_count = 0` confirmed.
- [x] Package `SSB.KN.V1` exists, validated, active.
- [x] Active snapshot exists (`snap_SSB_KN_V1_baseline`).
- [x] `/admin/configuration-governance` reflects latest run.
- [x] `/admin/ssb-setup` reflects package + readiness.
- [x] BN Product Builder HOLD decision is explicit and documented.
- [x] No BN / BEMA / IA / legacy tables changed.
- [x] No duplicate screens created.
