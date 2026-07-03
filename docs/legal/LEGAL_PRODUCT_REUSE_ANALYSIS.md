# Legal Platform — Product Reuse Analysis

**Version:** 1.0

---

## 1. Capability Reuse Matrix

| Capability | SSB-Specific | Generic Legal | Revenue | Prison | Police | Immigration | Med. Cannabis | Licensing | FIU | Tax |
|---|---|---|---|---|---|---|---|---|---|---|
| Intake & Qualification | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Matter Management | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Court Operations | — | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ |
| Judicial Orders | — | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ |
| Appeals | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Enforcement | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Post-Judgment Recovery | — | ✅ | ✅ | — | — | — | — | — | — | ✅ |
| External Counsel | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Legal Cost Recovery | — | ✅ | ✅ | — | — | — | — | — | ✅ | ✅ |
| Liability (Recoverable) | Partial (SSB fund model) | ✅ w/ adapters | ✅ | — | — | — | — | ✅ | — | ✅ |
| Compliance Referral bridge | ✅ SSB | Configurable | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reference Data (courts, fees, refs) | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## 2. Productisation Opportunities

1. **Legal Platform Core** — Intake, Matter, Court Ops, Orders, Appeals, Enforcement, Counsel, Cost, Reference Data, Security, Audit. Ship as multi-tenant baseline.
2. **Recovery Add-On** — Post-judgment recovery + workload rules + campaigns. Sell to Revenue/Tax.
3. **Liability Adapter Framework** — Replace SSB-specific fund/liability shape with a pluggable liability adapter so Revenue/Tax/Licensing plug their own assessment models into `v_*_case_financials` view pattern.
4. **Compliance-to-Legal Bridge** — Generalise `ce_legal_referrals` → `lg_case_intake` handshake as a "Regulatory Referral Bus" reusable by any upstream regulator (Police, Immigration, Cannabis, FIU).
5. **Court Registry Service** — Standalone `lg_court*` micro-domain shareable across all justice-facing agencies (Prison, Police, Immigration).
6. **Fee/Waiver Engine** — `lg_fee_rule/bundle/waiver_policy` is generic; usable by Licensing and Revenue for statutory fee/penalty structures.

## 3. Non-Reusable (SSB-specific)
- Compliance C3/BEMA specifics feeding `ce_legal_referrals`.
- Fund taxonomy in `lg_recoverable_liability` (component fields tuned to SSB contribution model).
- SSB benefit interactions (out of Legal scope but visible via cross-module).

## 4. Reuse Roadmap
| Phase | Action |
|-------|--------|
| P1 | Extract Legal Core as npm workspace / cloud template |
| P2 | Publish Recovery Add-On |
| P3 | Ship Liability Adapter contract + reference implementations |
| P4 | Tenant onboarding automation (reference data seeds per agency) |
