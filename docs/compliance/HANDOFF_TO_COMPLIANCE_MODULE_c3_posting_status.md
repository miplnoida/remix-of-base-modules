# Handoff to Compliance Module Owner — C3 Posting Status Vocabulary

**From:** C3 Management module
**To:** Compliance module owner
**Date:** 2026-07-15
**Priority:** Blocks Batch 1 UAT (Gap G5)

## Ownership boundary

- **C3 Management owns** `cn_c3_reported` and its lifecycle. The canonical status for a **Verified & Accepted** C3 filing is **`VAC`** (not `Posted`, not `POSTED`).
- **Compliance module owns** `ce_v_c3_unposted_to_ledger`, `ce_sync_c3_to_ledger`, `ce_c3_ledger_sync_log`, `ce_employer_financial_ledger`.

## Problem

`ce_v_c3_unposted_to_ledger` filters:
```sql
WHERE c3.posting_status::text = 'Posted'::text
```

C3 Management never emits `'Posted'`. All verified rows are `'VAC'`. Result: `ce_sync_c3_to_ledger` finds 0 rows to process, ledger stays empty, and downstream violation/overdue detection is starved of data.

Verified on live DB (project `xynceskeiiisiefqlgxo`):
```sql
SELECT DISTINCT posting_status FROM cn_c3_reported WHERE payer_id LIKE 'U010%';
-- 'VAC' (39/39 rows)
SELECT COUNT(*) FROM ce_employer_financial_ledger WHERE employer_id LIKE 'U010%';
-- 0
```

## Requested change (Compliance module side)

1. Update view `public.ce_v_c3_unposted_to_ledger` to filter on the C3-canonical value:
   ```sql
   WHERE c3.posting_status::text = 'VAC'::text
   ```
   (or `IN ('VAC','Posted')` during a transition window if legacy rows still exist).

2. Set `ce_c3_ledger_sync_log.posting_status_snapshot` to `'VAC'` in `ce_sync_c3_to_ledger` so the idempotency guard matches.

3. Re-run `ce-c3-ledger-sync` for the UAT payers (`payer_id LIKE 'U010%'`) and confirm `ce_employer_financial_ledger` populates.

## What C3 Management has done

- Corrected `scripts/compliance/uat/batch1_seed.sql` to insert `posting_status='VAC'` explicitly (matches production behaviour; previously wrote `POSTED` which was silently normalized).
- No changes to `cn_c3_reported` schema, triggers, or lifecycle. C3 vocabulary remains `VAC` as the verified-and-accepted terminal state.

## Not in C3 Management's scope

- Any change to `ce_*` tables, views, RPCs, or edge functions.
- Any change to violation-scan / overdue-detection filters that also read `cn_c3_reported.posting_status`.
