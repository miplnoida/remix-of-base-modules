# BN Gap Modules — Domain State Machines

Canonical state machines. TypeScript source of truth lives under
`src/types/bn/gap/<module>/*StateMachine.ts`; each is mirrored 1:1 in the
future .NET domain layer (`Misha.Benefits.Domain`).

## Appeals (`bn_appeal.status`)

Full transitions in `src/types/bn/gap/appeals/appealStateMachine.ts`.

```
DRAFT ──▶ SUBMITTED ──▶ ACKNOWLEDGED ──▶ ADMISSIBILITY_REVIEW
  │           │             │                     │
  │           │             │        ┌────────────┴──────────┐
  ▼           ▼             ▼        ▼                       ▼
WITHDRAWN   WITHDRAWN     WITHDRAWN ADMISSIBLE            INADMISSIBLE
                                     │                       │
                                     ▼                       ▼
                          HEARING_SCHEDULED/REFERRED_TO_LEGAL/CLOSED
                                     │
                                     ▼
                             HEARING_HELD ──▶ RECOMMENDED ──▶ DECIDED
                                                                 │
                                       ┌─────────────────────────┼──────────────────┐
                                       ▼                         ▼                  ▼
                                 IMPLEMENTATION_PENDING       CLOSED         REFERRED_TO_LEGAL
                                       │
                                       ▼
                                   IMPLEMENTED ──▶ CLOSED
```

Terminal: `CLOSED`. Reverse transitions never permitted.

## Mortality (`bn_mortality_event.status`)

```
REPORTED ──▶ PENDING_VERIFICATION ──▶ VERIFIED ──▶ AWARDS_HELD ──▶ AWARDS_TERMINATED
                     │                                                      │
                     ▼                                                      ▼
                 DISPUTED / REJECTED                              SURVIVOR_ASSESSMENT
                                                                            │
                                                                            ▼
                                                                 FUNERAL_OPPORTUNITY
                                                                            │
                                                                            ▼
                                                                  ESTATE_REFERRAL ──▶ CLOSED
```

Guardrail: `AWARDS_TERMINATED` is only reachable from `AWARDS_HELD`.

## Overpayments (`bn_overpayment.status`)

```
DRAFT ▶ ASSESSED ▶ NOTIFIED ─┬─▶ DISPUTED ─▶ ASSESSED (recalc)
                             ├─▶ ARRANGEMENT_PROPOSED ─▶ ARRANGEMENT_ACTIVE
                             ├─▶ RECOVERED ─▶ CLOSED
                             └─▶ REFERRED_TO_LEGAL ─▶ CLOSED
```

`ARRANGEMENT_ACTIVE` ↔ `ARRANGEMENT_BREACHED` cycle; write-off is terminal.

## Means-Tests (`bn_means_test.status`)

```
DRAFT ▶ EVIDENCE_PENDING ▶ ASSESSED ─┬─▶ PASSED ─▶ ELIGIBILITY_RERUN ─▶ AWARD_CREATED
                                      └─▶ FAILED ─▶ APPEALED ─▶ OVERTURNED ─▶ ELIGIBILITY_RERUN
```

## Risk (`bn_risk_signal.status`)

```
DETECTED ─▶ TRIAGED ─┬─▶ ENHANCED_VERIFICATION ─▶ INVESTIGATION
                     ├─▶ INVESTIGATION
                     └─▶ CLEARED
INVESTIGATION ─┬─▶ PAYMENT_HELD ─▶ CLEARED ─▶ HOLD_RELEASED
               ├─▶ SYSTEM_ERROR_CONFIRMED ─▶ CLAIM_CORRECTED ─▶ OVERPAYMENT_AVOIDED
               └─▶ REFERRED_TO_LEGAL
```

## Uprating (`bn_uprating_run.status`)

Linear happy path with hard gate at APPROVE:

```
DRAFT ▶ PARAMETERISED ▶ ELIGIBILITY_SNAPSHOT ▶ EXCLUSIONS_APPLIED
      ▶ DRY_RUN ▶ AWAITING_APPROVAL ▶ APPROVED ▶ EXECUTING
      ▶ SCHEDULES_REBUILT ▶ COMMUNICATIONS_ISSUED ▶ RECONCILED ▶ CLOSED
```

Failure branch: `EXECUTING → FAILED → ROLLED_BACK → CLOSED`.

## Enforcement

State-machine invariants are enforced by:
1. TypeScript command handlers (client contracts).
2. Server-side pipeline (`gapCommandPipeline`) `INVALID_STATE_TRANSITION` errors.
3. SQL Server `CHECK (status IN (...))` constraints.
4. C# domain aggregate methods raising `InvalidStateTransitionException`.
