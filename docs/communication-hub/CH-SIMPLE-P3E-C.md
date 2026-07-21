# CH-SIMPLE-P3E-C — Controlled Live Panel and Approved Real-Email Certification

Status: **P3E_CONTROLLED_LIVE_CERTIFIED_WITH_MANUAL_DELIVERY_CONFIRMATION**
(stub-provider automated + manual admin inbox verification path landed;
real-email test remains gated behind `COMM_HUB_REAL_EMAIL_TEST=true` and
an explicit typed operator phrase, per Step 7).

## Summary

- Database: `communication_controlled_live_certification` table + three
  SECURITY DEFINER RPCs (`record_controlled_live_certification`,
  `record_controlled_live_manual_verification`,
  `get_controlled_live_certification`). Table access is revoked from
  `authenticated`/`anon`; the client interacts only through the RPCs.
  Evidence fields are protected by an immutability trigger.
- Orchestrator: `comm-hub-controlled-live-test` now issues a
  certification when the provider path succeeds (`PROVIDER_ACCEPTED`,
  `DELIVERY_PENDING`, `DELIVERED`) and enforces the real-email gate.
- Frontend: reusable `ControlledLivePanel` embedded (per requirements)
  after `DryRunPanel` on the Pilots page. No new top-level route.
- Manual inbox verification: administrator-only, executed against the
  certification record via `record_controlled_live_manual_verification`
  RPC, which also writes to `communication_hub_control_audit`.

## Real-email gate (Step 7)

Real email is refused unless **all** of the following are true:

1. Body flag `allowRealEmail === true`
2. Body field `panelConfirmation === "SEND ONE CONTROLLED LIVE EMAIL"`
3. Environment variable `COMM_HUB_REAL_EMAIL_TEST === "true"` on the
   `comm-hub-controlled-live-test` function
4. Body field `confirmation === "CONFIRM CONTROLLED LIVE"` (from P3E-A)
5. All canonical readiness gates pass (recipient policy, preview
   approval, dry-run certification, template/sender/provider, no
   emergency stop, operating mode ∈ {DRY_RUN, CONTROLLED_LIVE})

Any failure results in a `BLOCKED` envelope with a distinct blocker
code (`real_email_disabled`, `panel_confirmation_mismatch`, etc.).

## Certification lifecycle

```
                         (record_controlled_live_certification, service role)
                             ─────────────────────────────────────────▶
                            /
   Provider stub / real ───▶  PROVIDER_ACCEPTED  ───────┐
   returns DELIVERED    ───▶  DELIVERY_CONFIRMED         │  admin manual
   returns PENDING      ───▶  PROVIDER_ACCEPTED          │  verification RPC
                                                        ▼
                                       DELIVERY_CONFIRMED_MANUALLY
```

- Certification `INSERT` is idempotent on `execution_id` — a replay
  returns the same certification row.
- Manual verification is only permitted while status is
  `PROVIDER_ACCEPTED`; further verification attempts fail loudly.
- `INVALIDATED`/`REVOKED` transitions are reserved for future admin
  workflows.

## Client access rules

- The frontend NEVER calls `record_controlled_live_certification`. It
  is `GRANT EXECUTE ... TO service_role` only.
- The frontend reads a certification through
  `get_controlled_live_certification(uuid)`, which filters to the
  operator that requested the execution (or any admin).
- The frontend records manual verification through
  `record_controlled_live_manual_verification(jsonb)`, which enforces
  the admin role via `has_role(auth.uid(), 'admin')`.

## Files

- Migration: `communication_controlled_live_certification` +
  `clc_no_seq` sequence + immutability trigger + RPCs.
- Edge function: `supabase/functions/comm-hub-controlled-live-test/index.ts`
- Client:
  - `src/platform/communication-hub/controlledLiveCertificationService.ts`
  - `src/platform/communication-hub/controlledLiveTestService.ts` (extended)
  - `src/pages/admin/communicationHub/controlCenter/ControlledLivePanel.tsx`
  - `src/pages/admin/communicationHub/CommunicationHubPilotsPage.tsx` (embed)
- Tests:
  - `src/platform/communication-hub/__tests__/CommHubP3ECCertification.test.ts`

## Remaining work for the unified Go Live page (P3E follow-up)

- Wire `previewApprovalId`/`dryRunCertificationId` and `operatingMode`
  from the canonical send-decision context into the panel — the Pilots
  placeholder passes nulls, which correctly forces the panel into a
  non-actionable state.
- Real-email dispatch requires an approved sender + verified domain in
  the target environment plus `COMM_HUB_REAL_EMAIL_TEST=true`; the
  first real send belongs to the operator sign-off ceremony, not the
  Pilots page.
