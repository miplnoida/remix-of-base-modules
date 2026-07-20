# BN-AP-00 — Appeals & Disputes existing asset audit

Snapshot of every appeals-related asset present in the repository at the
start of the AP-00 epic, together with its post-AP-00 disposition.

## Database — schema present

| Table                             | AP-00 disposition |
|-----------------------------------|-------------------|
| `bn_appeal`                       | Direct browser access **revoked**. Physical delete **blocked**. `row_version` + `modified_at` now controlled by trigger. Unique active appeal per `(bn_claim_id, appeal_type_code)`. |
| `bn_appeal_ground`                | Direct browser access **revoked**. FK to `bn_appeal` moved to `ON DELETE RESTRICT`. |
| `bn_appeal_evidence`              | Direct browser access **revoked**. FK to `bn_appeal` moved to `ON DELETE RESTRICT`. |
| `bn_appeal_event`                 | Direct browser access **revoked**. Now **append-only** (UPDATE and DELETE forbidden). FK RESTRICT. |
| `bn_appeal_hearing_link`          | Direct browser access **revoked**. FK RESTRICT. |
| `bn_appeal_decision_snapshot`     | Direct browser access **revoked**. Immutable after insert. FK RESTRICT. |

## RPCs

| RPC                              | Status |
|----------------------------------|--------|
| `bn_appeal_submit_claimant`      | Retained. Ownership check via `external_user_person_link.user_id -> ssn` -> `bn_claim.ssn`. Continues to be the only write path for claimant submission. Hardening of the snapshot payload is deferred to AP-01. |

## Application code

| File / area | AP-00 disposition |
|---|---|
| `src/portals/claimant/appeals/AppealsPage.tsx` | Retained; consumes new camelCase DTO from `useMyAppeals`. |
| `src/hooks/bn/appeals/useMyAppeals.ts` | Rewired to `BN_APPEAL_GET_MY_APPEALS` via `useBenefitsQuery`. Client-supplied claim id list is ignored — the server is authoritative. |
| `src/services/bn/appeals/submitClaimantAppealService.ts` | Retained. Continues to invoke `bn-appeals-claimant-submit` edge function. |
| `src/hooks/bn/appeals/useSubmitClaimantAppeal.ts` | Retained. |
| `src/types/bn/appeals/appealCommands.ts` | Existing catalogue of 15 commands retained. Full state-machine parity audit lives in `APPEALS_COMMAND_TRANSITION_MATRIX.md`. |
| `src/types/bn/appeals/appealStateMachine.ts` | Retained. |
| `src/pages/bn/appeals/BnAppealsWorkspacePage.tsx` | Reachable at canonical `/bn/appeals`. Renders pilot notice — the operational workspace is delivered in AP-01. |
| `supabase/functions/bn-appeals-claimant-submit/index.ts` | Retained. |
| `supabase/functions/bn-benefits-query/index.ts` | Extended with 11 `BN_APPEAL_*` query codes and secure claimant handlers. |

## Route & menu

| Concern | Before AP-00 | After AP-00 |
|---|---|---|
| Canonical route | `/bn/appeals-workspace` | `/bn/appeals` (with `/new` and `/:appealId` reserved for AP-01). Legacy path redirects. |
| Menu placement | Benefits Management (leaf) | Benefit Management → Benefit Operations → Appeals & Disputes |
| Rollout state | `internal_pilot`, feature flag `bn.gap.appeals` | `internal_pilot`, `actions_enabled=false`, visible in menu |

## Feature flags

`bn.gap.appeals` remains true. Route map updated so hover-preview and menu
resolution both target `/bn/appeals`.

## Tests

- `src/__tests__/bn/gap-modules/appeals/submitClaimantAppealService.test.ts` — retained.
- `src/__tests__/bn/gap-modules/appeals/appealStateMachine.test.ts` — retained.
- `src/__tests__/bn/gap-modules/architectureNoDirectMutation.test.ts` — protects the mutation boundary.
- `src/__tests__/bn/appeals/appealsBoundary.test.ts` — added in AP-00 to assert the secure query registry contract.
