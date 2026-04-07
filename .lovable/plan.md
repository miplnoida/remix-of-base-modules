

## Fix: C3 Detail API Field Mapping + Payment Sync for NWD

### Context
The C3-Wizard team raised two isolated queries about SSB Admin's public APIs.

---

### Query 1: Missing Aggregate SS/Levy/Severance Fields in C3 Detail API — ✅ DONE

Updated `public_api_c3_detail` RPC to include 6 new aggregate fields in `c3Header`:
- `totalEmpSsContributions` — SUM of `ip_ss_amt` from `ip_wages`
- `totalErSsContributions` — SUM of `er_ss_amt` from `ip_wages`
- `totalEmpLevyContributions` — SUM of `ip_levy_amt` from `ip_wages`
- `totalErLevyContributions` — SUM of `er_levy_amt` from `ip_wages`
- `totalEmpPeContributions` — SUM of `ip_pe_amt` from `ip_wages`
- `totalErPeContributions` — SUM of `er_ei_amt` from `ip_wages`

### Query 2: Payment Sync Gap — Deferred (message prepared for C3-Wizard team)

### Query 3: SE/VC ip_wages Contribution Columns NULL — ✅ DONE

**Problem**: SE/VC C3 saves hardcoded `ip_ss_amt: null` in `ip_wages`, so aggregate fields returned $0.

**Fix applied**:
1. `c3Service.ts`: `saveSelfContributorC3` and `saveVoluntaryContributorC3` now set `ip_ss_amt: toNumericOrNull(record.emp_ss_amt_calc)` — populates SS contribution from header.
2. `public_api_c3_detail` RPC: Added fallback — when all 6 wage-level aggregates are zero, falls back to header-level `emp_ss_amt_calc`, `emp_levy_amt_calc`, `emp_pe_amt_calc`. Covers existing records without data backfill.

**Verified**: Payer 100039 (SE, May 2026) now returns `totalEmpSsContributions: 30.00` via fallback.
