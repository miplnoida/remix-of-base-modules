## Fix: Populate SE/VC `ip_ss_amt` in `ip_wages` + Detail API Fallback

### Problem

When SSB Admin saves SE or VC C3 records internally, the `saveSelfContributorC3` and `saveVoluntaryContributorC3` functions hardcode `ip_ss_amt: null` in the `ip_wages` row. The SS contribution amount IS calculated and stored at the header level (`cn_c3_reported.emp_ss_amt_calc`), but never flows down to the wage row.

This means the 6 aggregate fields in the Detail API (`totalEmpSsContributions`, etc.) return `$0.00` for SE/VC records.

### Root Cause

- Lines 1248–1253 in `saveSelfContributorC3`: all contribution columns set to `null`
- Lines 1528–1533 in `saveVoluntaryContributorC3`: same pattern
- The public ingestion API (`c3-wages`) already accepts `ip_ss_amt` — so externally submitted SE records CAN have it populated if the C3-Wizard sends it

### Fix — Two changes

**1. `src/services/c3Service.ts` — Populate `ip_ss_amt` from header for SE/VC**

In both `saveSelfContributorC3` and `saveVoluntaryContributorC3`, change the wage record to use the header-level SS amount:

```typescript
// Before (line 1248):
ip_ss_amt: null,

// After:
ip_ss_amt: toNumericOrNull(record.emp_ss_amt_calc),
```

All other contribution columns (`ip_levy_amt`, `ip_pe_amt`, `er_ss_amt`, `er_levy_amt`, `er_ei_amt`) remain `null` — SE/VC only pay SS.

**2. Detail API fallback (database migration) — Backward compatibility for existing records**

Update `public_api_c3_detail` RPC: after computing the wage-level aggregates, if ALL 6 values are zero AND the header has non-zero `emp_ss_amt_calc`, fall back to header values:

```sql
-- After the existing aggregation query, add:
IF v_total_ip_ss = 0 AND v_total_er_ss = 0 AND v_total_ip_levy = 0 
   AND v_total_er_levy = 0 AND v_total_ip_pe = 0 AND v_total_er_pe = 0 THEN
  -- Fallback to header-level calculated fields
  v_total_ip_ss := COALESCE(v_record.emp_ss_amt_calc, 0);
  v_total_ip_levy := COALESCE(v_record.emp_levy_amt_calc, 0);
  v_total_ip_pe := COALESCE(v_record.emp_pe_amt_calc, 0);
  -- Employer-side remains 0 for SE/VC (no employer split)
END IF;
```

This ensures existing SE/VC records (already saved with NULL wage columns) still return correct totals without needing a data backfill.

### Files to Modify


| File                        | Change                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `src/services/c3Service.ts` | Set `ip_ss_amt: toNumericOrNull(record.emp_ss_amt_calc)` in SE and VC wage records |
| Database migration          | Add fallback logic in `public_api_c3_detail` RPC                                   |


### Message for C3-Wizard Team

> **Subject: SE/VC `ip_ss_amt` Now Populated + Detail API Fallback**
>
> We've made two changes:
>
> 1. **Going forward**: When SE/VC C3 records are saved in SSB Admin, the `ip_wages.ip_ss_amt` column is now populated from the header-level `emp_ss_amt_calc`. This means the `totalEmpSsContributions` aggregate field will return the correct SS amount for SE/VC records.
> 2. **Backward compatibility**: The Detail API now falls back to header-level fields (`emp_ss_amt_calc`, `emp_levy_amt_calc`, `emp_pe_amt_calc`) when all wage-level aggregates are zero. This covers existing SE records that were saved before this fix.
> 3. **For C3-Wizard SE submissions via the public API**: Your `c3-wages` payload already supports `ip_ss_amt`. Please include the SE SS contribution amount in this field when calling `/api/v1/c3-wages` with `payer_type: "SE"`. Other contribution fields (`er_ss_amt`, `ip_levy_amt`, etc.) should remain null for SE.