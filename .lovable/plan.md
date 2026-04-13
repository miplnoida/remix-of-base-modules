## Fix: Duplicate Key Violation on C3 Save (SE, ER, VC)

### Problem

When saving a C3 form without a `record.id` (treated as "new"), the code does a plain `.insert()` on `cn_c3_reported`. If a record with the same `(payer_id, payer_type, sequence_no, period)` already exists (e.g., user previously saved then returned to create again), the unique constraint `cn_c3_reported_payer_period_unique` rejects it.

All three save functions are affected:

- `saveC3Draft` (Employer — line 431)
- `saveSelfContributorC3` (SE — line 1196)
- `saveVoluntaryContributorC3` (VC — line 1477)

### Root Cause

The `record.id` check is the sole mechanism to decide insert vs update. If the UI doesn't pass the existing record's `id` (e.g., navigating to the form fresh for a payer+period that already has a draft), the code always inserts.

### Fix Strategy

For all three functions, before inserting a new record, query `cn_c3_reported` for an existing row matching `(payer_id, payer_type, sequence_no, period)`. If found and editable (DFT/PEN), treat it as an update instead.

### Changes — `src/services/c3Service.ts`

**Add a shared helper function:**

```typescript
async function findExistingC3(payerId: string, payerType: string, sequenceNo: number, period: string): Promise<string | null>
```

- Queries `cn_c3_reported` for matching `(payer_id, payer_type, sequence_no, period)` with `posting_status` in `('DFT','PEN')`
- Returns the existing record's `id` if found, else `null`

**Update the "else" (new record) branch in all three functions:**

1. Before inserting, call `findExistingC3(...)`
2. If an existing editable record is found, switch to the update path (set `modified_by`, `modified_date`, use `.update().eq('id', existingId)`)
3. If an existing non-editable record is found (VAC/REJ/DEL), return a clear error: "A C3 for this payer/period/schedule already exists and cannot be overwritten"  
important NOte :- If any c3 for the same period already exists for the same payerid and the sttaus is verified then it should give the pop up to say A c3 for this payer and period already exists you wantt to create a (existing schedule no. +1 ) scheudle for this.  
basically if the verified c3 is laready exist then it show the create c3 for another schedule basically icresed by 1 if 1 is laready created then it shoudl show for 2.
4. If no existing record, proceed with insert as before with schedule 1.  
basically theres a first c3 for any period and payertype then it should always create a schueld 1.

This approach is the safest — no schema changes needed, preserves the audit trail, and handles all three contributor types identically.