# BN Gap Modules — Contract Test Strategy

## Objective

Prove that behaviour is identical between the Supabase-hosted implementation TODAY and the future ASP.NET Core / SQL Server implementation TOMORROW.

## Fixture shape

Every fixture is a plain data record: initial state → envelope → expected result / events / audit / state transition.
See `src/services/bn/gap/contract-tests/fixtureFramework.ts` for the interface.

```ts
interface BnGapContractFixture {
  id: string;
  title: string;
  moduleCode: BnGapModuleCode;
  category: 'happy_path' | 'validation' | 'authorisation' | 'concurrency'
          | 'idempotency' | 'maker_checker' | 'state_transition'
          | 'calculation' | 'integration';
  actor: { userId, userCode, roles, capabilities };
  existing: FixtureExistingEntity[];
  envelope: BnGapCommandEnvelope;
  expected: {
    status: BnGapCommandStatus;
    errors?: FixtureExpectedError[];
    warningsInclude?: string[];
    events?: FixtureExpectedEvent[];
    audit?: FixtureExpectedAudit;
    data?: Partial<TData>;
  };
}
```

## Runners

Two runners bind the fixture to a backend:

- `SupabaseContractRunner` (today) — replays fixtures via the `bn-gap-command` edge function against a seeded test project.
- `DotNetContractRunner` (future) — replays the SAME fixtures against `Misha.Benefits.Api`.

Both call `reconcileFixture(fx, result)` and MUST report zero problems.

## Coverage areas

For each of the six modules, the fixture library MUST cover:

1. **Happy path** — one full state-machine traversal per module.
2. **State transitions** — every allowed transition and one rejected reverse transition.
3. **Authorisation** — one denial per capability variant (read/write/decide/admin/extended).
4. **Validation** — one INVALID case per required field.
5. **Concurrency** — one CONFLICT case using stale `expectedRowVersion`.
6. **Idempotency** — one REPLAYED case with an exact retry.
7. **Maker-checker** — one REJECTED case for self-approval.
8. **Calculation** — module-specific:
   - Overpayments: balances after recalculation.
   - Means-tests: pass/fail thresholds.
   - Uprating: rate application, exclusion counts.
   - Mortality: payment-after-death overpayment amount.
   - Risk: risk score bands.
9. **Integration** — one fixture per canonical flow in `integrationFlows.ts`.

## Golden calculation tests

Currency values are stored as `decimal` server-side. Fixtures assert amounts as **strings** to avoid FP precision loss on the wire:

```json
"expected": { "data": { "recalculatedBalance": "1234.56" } }
```

## Denial matrix

For each command, generate a denial fixture for EACH of these missing capabilities:

- module disabled
- routes disabled
- actions disabled
- wrong module code
- unmapped capability
- capability denied

The result is a `denial_matrix_<module>.fixtures.ts` file; total fixtures per module = commandCount × denial-modes.

## Golden files

Store fixture inputs and expected outputs under
`src/services/bn/gap/contract-tests/fixtures/<module>/*.json`. Fixtures are hand-authored, code-reviewed, and version-pinned to a `commandVersion`.

## CI enforcement

- PR CI runs the fixture suite against the Supabase test project.
- Nightly job replays the same suite against the .NET shadow deployment (post-Stage 2 of the migration sequence).
- Any drift produces a red build; fix EITHER the implementation or the fixture — never both silently.

## Success bar for cutover

Per-module cutover requires:

- 100% fixture pass on .NET.
- Zero drift for 7 consecutive nights.
- Ledger + audit reconciliations match to the cent.
