# BN Gap Modules — Migration Sequence (PG → SQL Server / .NET)

## Guiding principle

**Adapter swap, not big-bang.** Because the UI already depends on
`BenefitsGapApiClient` and only issues wire-neutral command envelopes,
each module can be migrated independently behind a feature flag.

## Prerequisite state

- All six modules registered in `app_modules`.
- Portable envelope + result stable (contract version pinned).
- OpenAPI schema published as a NuGet + npm package.
- Contract test fixtures green against Supabase (baseline).

## Cutover sequence

1. **Provision Misha.Benefits SQL Server database.**
   - Apply DDL in migration order (see `SQL_SERVER_DATA_MODEL_MAPPING.md`).
   - Seed reference / catalogue tables from PG dumps.

2. **Stand up Misha.Benefits.Api in shadow mode.**
   - Deployed but not fronting user traffic.
   - Contract-test fixtures replayed nightly against .NET.
   - Success gate: 100% fixture parity with Supabase.

3. **Bidirectional data sync (module-by-module).**
   - CDC or triggered replication from PG → SQL Server for each aggregate.
   - Idempotency + audit tables replicate first.

4. **Shadow reads.**
   - `DotNetBenefitsGapAdapter` deployed to production behind flag `dotnet_reads_bn_appeals`.
   - Adapter issues READ requests to both backends; compares; logs mismatches.
   - Success gate: <0.1% mismatch rate for 7 consecutive days.

5. **Cutover writes per module.**
   - Order (lowest blast radius first):
     1. Appeals (lowest financial impact)
     2. Means-Tests
     3. Risk Management
     4. Mortality
     5. Overpayments (ledger-writing)
     6. Uprating (batch runtime)
   - Per module: flip flag `dotnet_writes_<module>`; PG becomes read-only for that aggregate.
   - Success gate: 24h with zero command failure rate above baseline; ledger reconciled daily.

6. **Retire Supabase adapter for the module.**
   - Remove `Supabase*Handler` for that module from the handler registry.
   - PG data retained read-only for regulatory retention window.

7. **Full retirement.**
   - After all six migrated: `SupabaseBenefitsGapAdapter` is removed; the barrel returns `DotNetBenefitsGapAdapter` by default.
   - React changes required: **none**.

## Rollback strategy

- Each per-module cutover is reversible: flip flag back to `supabase_writes_<module>`.
- Sync reverses direction: SQL Server → PG for that aggregate.
- Idempotency keys are shared across backends, so retries land safely.

## Data integrity gates

- Row-count parity per table.
- Aggregate-hash parity (SHA-256 over sorted rows).
- Financial reconciliation: sum(overpayments), sum(uprating adjustments) match to the cent.
- Audit chain continuity across the cutover boundary (correlation_id preserved).
