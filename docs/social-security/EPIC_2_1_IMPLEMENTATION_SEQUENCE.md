# Epic 2.1 — Implementation Sequence

Planning only. Executes under the Enterprise Registration Pipeline v1.0 and the Phase 2 Programme waves. No code, schema, routes, menus, app_modules or permissions in this epic.

## Sequencing Principles

1. Adopt before extend — every wave first exposes a canonical façade over existing assets before any additive schema is proposed.
2. Legacy first — BEMA-backed entities (Member, Employer, Employment, Contribution Period, Dependant, Payment-Inbound) are surfaced via adapter views before any new domain is written.
3. Consolidate duplicates second — Contribution Type, Benefit Product, Benefit Category, Nominee, Payment-Outbound, Recovery.
4. Introduce missing canonicals last — Scheme, Scheme Membership, Investigation (each requires additive `ss_*` tables proposed via the Pipeline; never inside BEMA).
5. Retarget consumers only after the façade is live and registered in `enterprise_capability_registry`.

## Wave Alignment

| Wave | Focus | Entities addressed | Deliverable class |
|---|---|---|---|
| 1 | Identity + Participant foundation | Member, Employer, Dependant | Adapter views + `useMember` / `useEmployer` / `useMemberDependants` façades |
| 2 | Contribution foundation | Employment, Contribution Period, Contribution Type, Payment (inbound), Ledger | Adapter views + consolidation of `contribution_type` reference group |
| 3 | Benefits foundation | Benefit Category, Benefit Product, Claim, Award, Benefit, Payment (outbound), Nominee | Façades over `bn_*` + consolidation of product/category configuration |
| 4 | Case, Appeal, Recovery, Investigation | Case, Appeal, Recovery, Investigation | Façades over `lg_*`, composed `v_investigation`, unified Recovery façade |
| 5 | Canonical additions | Scheme, Scheme Membership | New `ss_scheme`, `ss_scheme_membership` proposed under the Pipeline (additive only) |

## Ordered Backlog (candidate epics — for later prompts)

1. **Epic 2.2 — Participant Façade Wave**: publish `v_member`, `v_member_identity`, `v_member_status`, `v_member_dependant`, `v_employer`, `v_employer_location`; register in capability registry; retarget one pilot consumer.
2. **Epic 2.3 — Contribution Façade Wave**: publish `v_employment`, `v_contribution_period`, `v_payment_inbound`; consolidate `contribution_type` reference group; retarget Cashier and C3 read paths.
3. **Epic 2.4 — Benefits Consolidation Wave**: expose `useBenefitProduct`, `useBenefitCategory`, `useClaim`, `useAward`, `useBenefit`, `useNominee`; deprecate duplicate configuration surfaces.
4. **Epic 2.5 — Payments Convergence Wave**: publish unified `usePayment` with direction discriminator; align `core_ledger_*` as the shared ledger surface.
5. **Epic 2.6 — Case Plane Wave**: publish `useCase`, `useAppeal`, `useRecovery`, `useInvestigation`; canonicalise `lg_appeal` vs `bn_claim_correction_request` boundary.
6. **Epic 2.7 — Scheme Canonicals**: propose additive `ss_scheme` and `ss_scheme_membership` via the Pipeline; migrate implicit scheme flags to the new canonical.
7. **Epic 2.8 — Consumer Retargeting**: BN, Contributions, Compliance, Legal, Payments modules switch to shared façades exclusively; direct-table-access restrictions from the Common Consumption Model become enforced.

## Gate Criteria Between Waves

Before advancing, each wave must show:
- Façade published and registered in `enterprise_capability_registry`.
- Consumers listed in the Common Consumption Matrix updated.
- Adapter views verified read-only against BEMA.
- No parallel screen or static menu introduced.
- If any BEMA table is touched structurally, `BEMA_LEGACY_TABLE_IMPACT_NOTE.md` exists and is approved (default: not touched).

## Out of Scope for Epic 2.1

- Any DDL, DML, view creation, hook implementation, route registration, menu entry, permission grant, or capability registry insert.
- Any change to BEMA (`ip_*`, `er_*`, `cn_*`, `tb_*`) — structural or otherwise.
- UI redesign of existing shells; consumers are only retargeted, not rebuilt.

## Acceptance

- Sequence expressed as ordered candidate epics.
- Each wave has a clear entity set, deliverable class and gate criteria.
- Additive schema deferred to Wave 5 and later, and only via the Registration Pipeline.
