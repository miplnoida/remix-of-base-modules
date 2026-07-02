# Legal Referral Workflow

End-to-end lifecycle of a referral raised from **Compliance** or
**Benefits** into the Legal Department for St. Kitts & Nevis SSB.

Related documents:
- `docs/legal/referral-state-machine.md` — allowed status transitions
- `docs/legal/permission-matrix.md` — full capability matrix

## Actors

| Actor                    | Origin      | Responsibility                                       |
| ------------------------ | ----------- | ---------------------------------------------------- |
| Compliance officer       | Compliance  | Raises referral from a case / arrears / arrangement. |
| Benefits officer         | Benefits    | Raises referral from an overpayment / fraud claim.   |
| Legal triage             | Legal       | Receives, assesses, requests info, accepts/rejects.  |
| Legal case owner         | Legal       | Runs the case once created.                          |
| Legal manager            | Legal       | Approves closure and escalation.                     |

## Steps

1. **Draft & submit (source module).**
   - Officer clicks **Refer to Legal** on the source screen
     (Case Detail, Ledger, Arrangement, Inspection, Claim 360, …)
     via `ReferToLegalButton`.
   - Wizard captures matter, exposure, primary entity, supporting
     documents, and creates a `legal_referral` row in `SUBMITTED_TO_LEGAL`.

2. **Received by Legal.**
   - The Legal Referrals Workbench shows the referral in the intake
     bucket. Opening the row calls `receiveReferral()` and transitions
     to `RECEIVED_BY_LEGAL`.

3. **Assessment.**
   - Legal officer moves the referral into `UNDER_LEGAL_REVIEW`
     (`acceptReferral({ finalizeReview: false })`) while investigating.

4. **Information request loop.**
   - If facts are missing, Legal raises a
     `legal_referral_info_request` and the referral moves to
     `INFO_REQUESTED`. SLA is tracked on the request row.
   - When the source module responds, the request status flips and the
     referral returns to `INFO_RESPONDED`.

5. **Decision.**
   - **Accept:** `acceptReferral({ finalizeReview: true })` →
     `ACCEPTED`.
   - **Reject:** `rejectReferral({ reason })` → `REJECTED`. The source
     row (`ce_legal_referrals` / `bn_legal_referral`) is updated to
     `REJECTED_BY_LEGAL` with the reason.

6. **Create Legal Intake and Case.**
   - `createIntakeFromReferral()` promotes the referral to a
     `lg_case_intake` row.
   - `createCaseFromReferral()` calls `acceptAndCreateCase()` which
     creates the `lg_case`, links it back to the referral
     (`legal_case_id`), and moves the referral to
     `LEGAL_CASE_CREATED`.

7. **Assign officer.**
   - `assignOfficerToReferral()` delegates to the assignment engine
     (`lg_assign_case` RPC). Requires that the case exists.
   - `reassignReferral()` updates team / workbasket on the referral row
     itself when the case has not yet been created.

8. **Escalate.**
   - `escalateReferral({ reason, raisePriorityTo })` raises priority,
     stamps `legal_referral_sla_event`, and marks any open info request
     as `ESCALATED`. Available on any non-terminal state.

9. **Close.**
   - `closeReferral({ reason })` marks the referral `CLOSED` (terminal).
     Requires `canApproveClosure`.

## Enforcement

- **State machine:** `lgReferralStateMachine.assertTransition()` is
  called from every mutation in `referralLifecycleService.ts`.
- **Permissions:** `useReferralLifecycle` guards every mutation with
  `useLegalCapability`; unauthorised users see an inline toast and
  never hit the network.
- **Audit:** every mutation writes to `legal_referral_audit` and, when
  the referral has been promoted, mirrors the event into the case
  timeline via `mirrorReferralEventToCase()`.
- **Realtime:** `useLegalReferralsRealtime` invalidates workbench
  queries the moment the source rows change, so the Workbench never
  needs a manual refresh.

## Screens

- `/legal/referrals-workbench` — `LegalReferralsWorkbench` (Legal side).
- `/compliance/legal-referral`, `/bn/legal-referral` — source wizards.
- `LgCaseDetail` — Source Link tab surfaces the originating referral,
  its audit trail, and any open info requests.
