# Compliance — Role → Tab Visibility Matrix

Source of truth for which My Work Queue tabs each operational role sees.
Implemented in `src/pages/compliance/MyWorkQueue.tsx` via `useHasCapability`
against the bundles defined in `src/lib/compliance/capabilities.ts`.

## Roles

| Code         | Display name          |
| ------------ | --------------------- |
| `inspector`  | Compliance Inspector  |
| `senior`     | Senior Inspector      |
| `head`       | Compliance Head       |
| `other`      | No compliance role    |

Legacy fallback: any user with the `manage_compliance` permission, or the
`Admin` role, passes every capability check (Phase-1 compatibility).

## Tabs → Capability

| Tab                                       | Capability                              |
| ----------------------------------------- | --------------------------------------- |
| Assigned Violations                       | `compliance.violations.manage`          |
| Violations Awaiting Verification          | `compliance.violations.manage` + toggle `violations.verificationQueue` |
| Assigned Cases                            | `compliance.cases.manage`               |
| Notices Awaiting Approval                 | `compliance.enforcement.notices`        |
| Employer Responses Awaiting Review        | `compliance.enforcement.notices`        |
| Payment Arrangements Awaiting Approval    | `compliance.enforcement.arrangements`   |
| Waiver Requests                           | `compliance.enforcement.arrangements`   |
| Inspection Findings Awaiting Review       | `compliance.field.report` + toggle `inspections` |
| Legal Escalation Recommendations          | `compliance.enforcement.legal` + toggle `legal.approvedEscalations` |
| Workflow Tasks                            | always visible                          |

## Resulting visibility

✅ = visible · — = hidden

| Tab                                | inspector | senior | head | other |
| ---------------------------------- | :-------: | :----: | :--: | :---: |
| Assigned Violations                | ✅        | ✅     | ✅   | —     |
| Violations Awaiting Verification   | ✅        | ✅     | ✅   | —     |
| Assigned Cases                     | ✅        | ✅     | ✅   | —     |
| Notices Awaiting Approval          | ✅        | ✅     | ✅   | —     |
| Employer Responses Awaiting Review | ✅        | ✅     | ✅   | —     |
| Payment Arrangements (Approval)    | —         | ✅     | ✅   | —     |
| Waiver Requests                    | —         | ✅     | ✅   | —     |
| Inspection Findings (Review)       | —         | ✅\*   | ✅   | —     |
| Legal Escalation Recommendations   | —         | ✅     | ✅   | —     |
| Workflow Tasks                     | ✅        | ✅     | ✅   | ✅    |

\* Senior gets `FIELD_REPORT` (their own findings); approval of others' findings
sits behind `FIELD_APPROVE_REPORTS` which is a senior+head capability.

If a role has zero visible tabs the page renders an empty-state explaining the
restriction instead of a blank tab strip.

## Updating this matrix

1. Edit capability bundles in `src/lib/compliance/capabilities.ts`.
2. Adjust the `useHasCapability` wiring in `src/pages/compliance/MyWorkQueue.tsx`.
3. Update the tables above so docs match code.
