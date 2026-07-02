# Department Referrals — State Machine

Canonical reference for the Legal Referrals Workbench lifecycle. Every action
in the workbench (accept, reject, request info, create intake, create case,
assign, reassign, escalate, close) is implemented as a guarded transition
against this state machine.

- Source of truth for statuses: `legal_referral.status`
- Transition guard: `src/services/legal/referralLifecycleService.ts` →
  `canTransition()` / `assertTransition()`
- Mutations + cache/toast: `src/hooks/legal/useReferralLifecycle.ts`
- UI: `src/components/legal/lg/referral-actions/ReferralLifecycleDialogs.tsx`
- Audit log: every mutation writes to `legal_referral_audit`
  (`event_module = 'LEGAL'`, `event_code = REFERRAL_*`, `metadata` snapshots
  before/after values). Timeline mirrors also land in
  `legal_referral_sla_event` (escalations) and `lg_case_intake_audit` (when
  the intake mirror is updated).

## States

| Code | Meaning | Terminal |
|---|---|---|
| `DRAFT` | Source module is still preparing the referral. Never seen by Legal. | no |
| `SUBMITTED_TO_LEGAL` | Source has submitted; Legal has not opened it. | no |
| `RECEIVED_BY_LEGAL` | A legal user opened it (triage). | no |
| `INFO_REQUESTED` | Legal has asked source for more information. | no |
| `INFO_RESPONDED` | Source answered the info request. | no |
| `UNDER_LEGAL_REVIEW` | Actively under review by an officer. | no |
| `ACCEPTED` | Review complete, ready to be promoted to a case. | no |
| `LEGAL_CASE_CREATED` | Case exists; further work happens on the case. | no |
| `REJECTED` | Sent back to source. | **yes** |
| `CLOSED` | No further legal action. | **yes** |

## Allowed transitions

```
DRAFT               → SUBMITTED_TO_LEGAL

SUBMITTED_TO_LEGAL  → RECEIVED_BY_LEGAL
                    → INFO_REQUESTED
                    → REJECTED

RECEIVED_BY_LEGAL   → UNDER_LEGAL_REVIEW
                    → INFO_REQUESTED
                    → ACCEPTED
                    → REJECTED
                    → LEGAL_CASE_CREATED

INFO_REQUESTED      → INFO_RESPONDED
                    → REJECTED
                    → CLOSED

INFO_RESPONDED      → UNDER_LEGAL_REVIEW
                    → ACCEPTED
                    → REJECTED
                    → INFO_REQUESTED   (follow-up request)
                    → LEGAL_CASE_CREATED

UNDER_LEGAL_REVIEW  → ACCEPTED
                    → REJECTED
                    → INFO_REQUESTED
                    → LEGAL_CASE_CREATED
                    → CLOSED

ACCEPTED            → LEGAL_CASE_CREATED
                    → CLOSED

LEGAL_CASE_CREATED  → CLOSED

REJECTED            → (terminal)
CLOSED              → (terminal)
```

Invalid attempts throw `Invalid referral transition: X → Y` from
`assertTransition()` and are surfaced to the user as an error toast. The
workbench menu also **hides** actions that would violate the machine so
invalid clicks are rare.

## Actions

Every action goes through `useReferralLifecycle()`. All of them:
- check the caller's `useLegalCapability()` flag,
- call the service (which validates the transition),
- write an audit record,
- invalidate the workbench + detail react-query caches,
- show a success or error toast.

| Action | Service fn | Capability | Allowed from | Resulting status | Notes |
|---|---|---|---|---|---|
| View | — | `canViewWorkbench` | any | (no change) | Opens the workspace url. |
| Accept (start review) | `acceptReferral({finalizeReview:false})` | `canAcceptReferral` + `perms.can_accept` | `SUBMITTED_TO_LEGAL`, `RECEIVED_BY_LEGAL`, `INFO_RESPONDED` | `UNDER_LEGAL_REVIEW` | Mirrors intake to `PENDING_REVIEW`. |
| Accept (finalize) | `acceptReferral({finalizeReview:true})` | same | `RECEIVED_BY_LEGAL`, `UNDER_LEGAL_REVIEW`, `INFO_RESPONDED` | `ACCEPTED` | Mirrors intake to `ACCEPTED`. |
| Reject | `rejectReferral({reason})` | `canAcceptReferral` + `perms.can_reject` | any non-terminal | `REJECTED` | Requires ≥5-char reason. Mirrors `ce_legal_referrals` / `bn_legal_referral` back to source. |
| Request Information | `requestInfoAtomic` (existing SLA service) | `canRequestInfo` + `perms.can_request_info` | `RECEIVED_BY_LEGAL`, `INFO_RESPONDED`, `UNDER_LEGAL_REVIEW` | `INFO_REQUESTED` | Creates `legal_referral_info_request` + source task + notification. |
| Receive Info Response | Automatic via `respondInfoRequest` from source | `canViewWorkbench` | `INFO_REQUESTED` | `INFO_RESPONDED` | Written by source portal; workbench refreshes via realtime. |
| Create Intake | `createIntakeFromReferral` | `canAcceptReferral` + `perms.can_create_case` | any non-terminal without existing intake | (no status change; sets `lg_intake_id`) | Creates `lg_case_intake` and back-links to referral. |
| Create Case | `createCaseFromReferral` | same | intake exists, referral in `RECEIVED_BY_LEGAL` / `UNDER_LEGAL_REVIEW` / `INFO_RESPONDED` / `ACCEPTED` | `LEGAL_CASE_CREATED` | Uses `acceptAndCreateCase` — creates `lg_case`, parties, back-links source module. |
| Assign to Officer | `assignOfficerToReferral` | `canAssignCase` / `canReassignCase` + `perms.can_reassign` | `LEGAL_CASE_CREATED` (case must exist) | (no change) | Delegates to `lg_assign_case` RPC on the linked case. |
| Reassign Team / Workbasket | `reassignReferral` | `canReassignCase` + `perms.can_reassign` | any non-terminal | (no change) | Updates `legal_team_code` / `legal_workbasket_code`. |
| Escalate | `escalateReferral({reason, raisePriorityTo})` | `canApproveEscalation` (falls back to `canAcceptReferral`) | any non-terminal (typically overdue) | (no change) | Bumps priority, sets `sla_status='ESCALATED'` on any pending info request, writes `legal_referral_sla_event`. |
| Close | `closeReferral({reason})` | `canApproveClosure` | any non-terminal | `CLOSED` | Terminal. |

## Permission surface

Two layers must both allow an action for the button to appear/execute:

1. **Role-based capability** (`useLegalCapability`) — derived from the user's
   `LEGAL_*` role in `user_roles`. Enforces org-level authority (e.g.,
   only `LEGAL_MANAGER`/`LEGAL_ADMIN` can escalate, close, or reassign).
2. **Workspace permissions** (`LegalMatterWorkspacePermissions`) — derived
   from the individual referral's current lifecycle + assignment. Enforces
   per-row context (e.g., you cannot accept your own referral if it's
   already terminal).

The workbench adapter reads both. Missing either hides the menu item.

## Audit contract

Every mutation writes exactly one row to `legal_referral_audit`:

```
{
  legal_referral_id: uuid,
  event_code: 'REFERRAL_ACCEPTED' | 'REFERRAL_REJECTED' | 'REFERRAL_CLOSED'
            | 'REFERRAL_ESCALATED' | 'REFERRAL_REASSIGNED'
            | 'INTAKE_CREATED' | 'LEGAL_CASE_CREATED'
            | 'OFFICER_ASSIGNED' | 'STATUS_<NEW_STATUS>',
  event_module: 'LEGAL',
  actor: user_code,
  notes: reason | null,
  metadata: { from, to, priority, lg_case_id, ... }
}
```

Info request / response flows additionally write into
`legal_referral_audit` via the atomic RPC `create_legal_info_request` and
into `lg_case_intake_audit` when the intake mirror is updated.

## Cache invalidation

Every mutation invalidates:
- `["legal-matter-workspace-workbench"]` — the workbench grid
- `["legal-referrals-workbench"]` — realtime + legacy consumers
- `["legal-referrals-info-open"]`
- `["legal-referral-info-requests"]`
- `["legal-referral", id]` and `["legal-referral-audit", id]` — detail views

This keeps the workbench, referral detail page, and any embedded timelines
in sync with a single mutation call.

## Adding a new action

1. Add the service function in `referralLifecycleService.ts` — reuse
   `assertTransition` and `audit()`.
2. Expose it as a mutation in `useReferralLifecycle`, guarded by the right
   capability flag, with the same toast + invalidation pattern.
3. If it needs input, add a dialog in `ReferralLifecycleDialogs.tsx`.
4. Wire it into `LegalReferralsWorkbenchAdapter.actions()` with the correct
   permission + terminal-state check.
5. Update this document.
