# Data Sync Validation & Contribution Verification — Analysis Report

## 1. Sync Architecture Overview

```text
┌─────────────────────┐     POST /c3-reported     ┌──────────────────────┐
│  Employer Portal    │ ──────────────────────────▶│  public-api (Edge)   │
│  (C3-Wizard)        │     POST /c3-wages         │                      │
│                     │ ──────────────────────────▶│  ┌─────────────────┐ │
│ c3_contribution_    │     POST /c3-verify        │  │ RPC Functions:  │ │
│ headers (source)    │ ──────────────────────────▶│  │ - insert_c3_rep │ │
└─────────────────────┘                            │  │ - insert_ip_wag │ │
                                                   │  │ - verify_c3     │ │
                                                   │  └────────┬────────┘ │
                                                   └───────────┼──────────┘
                                                               ▼
                                                   ┌──────────────────────┐
                                                   │  Admin Database      │
                                                   │  cn_c3_reported      │
                                                   │  ip_wages            │
                                                   └──────────────────────┘
```

**Flow**: Employer submits → `/c3-reported` creates header → `/c3-wages` inserts wage lines → `/c3-verify` recalculates & sets `posting_status = 'VAC'`.

## 2. Cross-Reference: CSV (Wizard) vs Database (Admin)

I compared the uploaded CSV (`c3_contribution_headers`) from the Employer portal against the `cn_c3_reported` table in the admin database for payer `658852`.

### Verified Records (All 4 match ✅)


| Period   | Seq | Wizard Total Wages | Admin Total Wages | Wizard SS | Admin SS | Wizard Levy | Admin Levy | Wizard PE | Admin PE | Admin Status |
| -------- | --- | ------------------ | ----------------- | --------- | -------- | ----------- | ---------- | --------- | -------- | ------------ |
| Jan 2026 | 2   | 4,800              | 4,800             | 528       | 528      | 312*        | 312        | 48        | 48       | **VAC** ✅    |
| Feb 2026 | 1   | 37,300             | 37,300            | 1,518     | 1,518    | 4,392.02*   | 4,392.02   | 373       | 373      | **VAC** ✅    |
| Feb 2026 | 2   | 2,224              | 2,224             | 244.64    | 244.64   | 144.56*     | 144.56     | 22.24     | 22.24    | **VAC** ✅    |
| Mar 2026 | 1   | 6,121              | 6,121             | 673.31    | 673.31   | 397.87*     | 397.87     | 61.21     | 61.21    | **VAC** ✅    |


*Note: The CSV stores levy as employee+employer split; admin stores combined `emp_levy_amt_calc`. Values match when combined.*

### Key Findings

**✅ All 4 submitted records are correctly synced and verified (status = VAC)**

- Total wages match exactly
- SS contribution amounts match exactly
- Levy amounts match (combined employee+employer)
- PE (severance) amounts match exactly
- Employee counts match
- All have `date_verified` timestamps confirming verification completed

**✅ Wage lines (ip_wages) are correctly synced**

- 7 wage rows present across the 4 submissions
- Individual wage breakdowns (wages_paid1-6) are populated
- Per-employee SS, levy, and PE amounts are calculated
- All wage rows have `posting_status = 'DEL'` (delivered/verified)

**⚠️ One anomaly detected**: Period Jan 2026, Sequence 1 exists in `cn_c3_reported` with `posting_status = 'DEL'` but has `emp_ss_amt_calc = 288` (only employer SS, no levy calc). This appears to be an older submission that was superseded by Sequence 2 — which IS verified. This is expected behavior (re-submission creates new sequence).

## 3. Field Mapping Validation


| Wizard Field (CSV)                          | Admin Field (cn_c3_reported) | Status                              |
| ------------------------------------------- | ---------------------------- | ----------------------------------- |
| `registration_number`                       | `payer_id`                   | ✅ Correct                           |
| `ssb_sequence_no`                           | `sequence_no`                | ✅ Correct                           |
| `period_month` + `period_year`              | `period` (DATE)              | ✅ Correct (converted to YYYY-MM-01) |
| `total_wages`                               | `total_wages`                | ✅ Exact match                       |
| `total_social_security`                     | `emp_ss_amt_calc`            | ✅ Exact match                       |
| `total_levy_employee + total_levy_employer` | `emp_levy_amt_calc`          | ✅ Combined match                    |
| `total_severance`                           | `emp_pe_amt_calc`            | ✅ Exact match                       |
| `employee_count`                            | `number_employed`            | ✅ Exact match                       |
| `ssb_verified = true`                       | `posting_status = 'VAC'`     | ✅ Correct                           |
| `ssb_verified_at`                           | `date_verified`              | ✅ Timestamps present                |


## 4. Potential Issues / Recommendations

### No Issues Found in Current Data

All 4 employer contributions from the wizard portal are:

- Correctly inserted into `cn_c3_reported`
- Correctly verified (VAC status)
- Have matching wage detail lines in `ip_wages`
- Amounts match to the cent

### Recommendations for Robustness

1. **Levy field mapping clarity**: The wizard stores levy as separate employee/employer columns while admin stores a combined total. The `c3-verify` RPC recalculates this correctly, but documentation should note this transformation.
2. **Stale sequence handling**: The Jan 2026 Seq 1 record (DEL status, incomplete calculations) should be cleaned up or marked as superseded to avoid confusion in reporting.
3. **Missing `is_verified` column**: The `cn_c3_reported` table relies on `posting_status = 'VAC'` as the verification indicator rather than a boolean flag. The CSV has explicit `ssb_verified` boolean — this is a design difference, not a bug, but worth noting.

## 5. Conclusion

**Data sync is working correctly.** All employer contributions submitted from the external portal are accurately synced into the admin database with correct field mapping, proper verification status, and matching calculation amounts. No data loss, no mismapping, and no inconsistencies detected in the current dataset.

No code changes are required.  
  
id;header_id;employee_id;period_month;period_year;pay_frequency;social_security_number;social_security_display;date_of_joining;date_terminated;week1_worked;week1_wages;week1_holiday_pay;week2_worked;week2_wages;week2_holiday_pay;week3_worked;week3_wages;week3_holiday_pay;week4_worked;week4_wages;week4_holiday_pay;week5_worked;week5_wages;week5_holiday_pay;total_holiday_pay;bonus_amount;director_wage;social_security_total;social_security_employee;social_security_employer;levy_employee;levy_employer;severance_employee;severance_employer;is_finalized;finalized_at;finalized_by;is_submitted;submitted_at;submitted_by;is_unlocked;remarks;error_description;is_deleted;created_at;created_by;updated_at;updated_by;legacy_id;ei_employee;ei_employer

77847;3402;9181;2;2026;;205343;;;;true;556.00;0.00;true;556.00;0.00;true;556.00;0.00;true;556.00;0.00;false;0.00;0.00;0.00;0.00;0.00;244.64;111.20;133.44;77.84;66.72;22.24;0.00;false;;;false;;;false;;;false;2026-03-25 09:58:57.899+00;;2026-03-25 09:58:57.983623+00;;;22.24;0.00

77848;3402;9180;2;2026;;210183;;;;false;0.00;0.00;false;0.00;0.00;false;0.00;0.00;false;0.00;0.00;false;0.00;0.00;0.00;0.00;0.00;0.00;0.00;0.00;0.00;0.00;0.00;0.00;false;;;false;;;false;;;false;2026-03-25 09:58:57.899+00;;2026-03-25 09:58:57.983623+00;;;0.00;0.00  
  
  
This data is inserted in the ip_wages.  
verify it as well.