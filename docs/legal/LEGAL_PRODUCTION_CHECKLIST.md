# Legal Production Readiness Checklist (ERP-01 · Part 14)

Date: 2026-07-03

## Go / No-Go Gates

| Gate | Owner | Status |
|---|---|---|
| Relationship audit clean (Part 1) | Engineering | ✅ |
| Financial single-source proven (Part 2) | Engineering | ✅ |
| Multi-period / multi-component scenarios pass (Part 3) | Engineering | ✅ |
| All workflow state machines guarded (Part 4) | Engineering | ✅ |
| Master data 100% consumed on operational screens (Part 5) | Engineering | ✅ (Phases A–D complete; legacy mapping UI live) |
| Every screen certified (Part 6) | Engineering | ✅ |
| Reporting totals reconcile (Part 7) | Engineering | ✅ |
| No orphans / duplicates / cycles (Part 8) | Engineering | ✅ (SQL verified) |
| Performance sweep (Part 9) | Engineering | ✅ 3 composite indexes added 2026-07-03 |
| Security review (Part 10) | Engineering | ✅ Route + capability guards on every path |
| UAT dataset shape signed off (Part 11) | Business | ⏳ pending sign-off |
| Legacy route retirement wave scheduled | Ops | ⏳ Wave 2 |
| Runbook + on-call rota | Ops | ⏳ |

## Pre-cutover Actions

1. ~~Apply 3 index additions (Part 1 §5)~~ — ✅ **Applied 2026-07-03**.
2. ~~Add `v_lg_case_financials` DB view~~ — ✅ **Applied 2026-07-03**.
3. ~~Legal data reset + UAT seed pack~~ — ✅ **Delivered 2026-07-03** as `scripts/legal/01_reset.sql` … `04_validate.sql` (Test only, outside migration pipeline). See `docs/legal/LEGAL_DATA_RESET_AND_SEEDING.md` and `docs/legal/LEGAL_SEED_VALIDATION_REPORT.md`. Run manually via Cloud → Run SQL (Test).
4. Kick off UAT with the 3 seeded scenarios; add appeal / enforcement / external-counsel scenarios as `05_extra_scenarios.sql` when business signs off on the seeded shape.
5. Publish legacy-route retirement notice; flip Wave 2 to redirect after 30 days.

## Post-cutover Monitoring

- Command Centre error rate < 0.5%.
- Rollup drift check (paid vs sum(allocations)) — schedule nightly assertion; alert on any drift.
- Legacy free-text ingestion — the `lg_list_unmapped_reference_values` RPC should stay at 0 growth after all admin mapping.

## Non-functional confirmations

- Single currency (XCD) — cross-currency dormant (Part 2 F-02).
- No AI insights in scope this phase — confirmed.
- No new business features — confirmed.

## Sign-off

- [ ] Engineering Lead
- [ ] Legal Business Owner
- [ ] Compliance / Data Governance
- [ ] Ops / SRE
