


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
