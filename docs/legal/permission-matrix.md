# Legal Permission Matrix

Central authority for **who can do what** across the Legal module.
Source of truth: [`src/hooks/legal/useLgAccess.ts`](../../src/hooks/legal/useLgAccess.ts) → `LG_BASE_MATRIX`.

All Legal screens gate actions through the same hook:

```ts
const access = useLgAccess();
if (!access.can("createCase")) return <LegalAccessDenied />;
```

Never hard-code role checks (`role === "LEGAL_MANAGER"`) in components — use `access.can(<capability>)` so the matrix stays the only place to change policy.

---

## Role Types

Real system roles are mapped to role-types via the `lg_role_type_mapping` table (fallback in `useLgAccess`).

| Role type | Purpose |
| --- | --- |
| `LG_READ_ONLY` | View cases only, no writes. |
| `LG_LEGAL_ASSISTANT` | Prepares drafts (notices, fees, bundles). No approval or dispatch. |
| `LG_CASE_HANDLER` | Owns cases, takes substantive legal actions short of final approval. |
| `LG_REVIEWER` | Reviews assistant drafts before approver sign-off. |
| `LG_APPROVER` | Final legal sign-off — accept referral, approve notice, close case, approve settlement. |
| `LG_ADMIN` | Everything approvers can do **plus** configuration (templates, fees, policy, mappings). |

System role `ADMIN` / `SYSTEMADMIN` / `SUPERADMIN` / `LEGALADMIN` receive every role type automatically.

---

## Capability Matrix

Legend: ✅ granted &nbsp;·&nbsp; blank = denied

| # | Capability | Read Only | Assistant | Case Handler | Reviewer | Approver | Admin |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|
| 1 | `viewLegalModule` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | `viewCase` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3 | `createCase` | | | ✅ | | ✅ | ✅ |
| 4 | `editCase` | | | ✅ | ✅ | ✅ | ✅ |
| 5 | `closeCase` | | | | | ✅ | ✅ |
| 6 | `acceptReferral` | | | | | ✅ | ✅ |
| 7 | `rejectReferral` | | | | | ✅ | ✅ |
| 8 | `requestInformation` | | ✅ | ✅ | | ✅ | ✅ |
| 9 | `assignOfficer` | | | | | ✅ | ✅ |
| 10 | `reassignCase` | | | | | ✅ | ✅ |
| 11 | `generateNotice` | | ✅ | ✅ | | ✅ | ✅ |
| 12 | `approveNotice` | | | | ✅ | ✅ | ✅ |
| 13 | `sendNotice` | | | | | ✅ | ✅ |
| 14 | `uploadDocument` | | ✅ | ✅ | | ✅ | ✅ |
| 15 | `viewConfidentialDocuments` | | | | ✅ | ✅ | ✅ |
| 16 | `addHearing` | | | ✅ | | ✅ | ✅ |
| 17 | `addOrder` / `createOrder` | | | ✅ | | ✅ | ✅ |
| 18 | `addSettlement` / `createSettlement` | | | ✅ | | ✅ | ✅ |
| 19 | `approveSettlement` | | | | | ✅ | ✅ |
| 20 | `linkPaymentArrangement` | | | ✅ | | ✅ | ✅ |
| 21 | `exportData` | | | ✅ | | ✅ | ✅ |
| 22 | `manageTemplates` / `configureFees` / `configurePolicy` / `manageRoleMapping` | | | | | | ✅ |
| 23 | `viewLegalDocuments` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 24 | `generateLegalDocument` | | ✅ | ✅ | ✅ | ✅ | ✅ |
| 25 | `approveLegalDocument` | | | | | ✅ | ✅ |
| 26 | `issueLegalDocument` | | | | | ✅ | ✅ |
| 27 | `manageLegalTemplates` | | | | | | ✅ |

Capabilities 23-27 govern the Legal Document Automation workspace at
`/legal/lg/documents` (EPIC-08 / 08A / 08B). Route-level access is
`view`; per-action gates are enforced in `LegalDocumentsWorkspace.tsx`.

The 18-item list from the original requirements maps to capabilities 1-22.

---

## Usage Rules

1. **Gate every mutating button** with `access.can(<capability>)`. Prefer `<LgActionButton capability="…">` which auto-disables + shows tooltip.
2. **Gate routes** through `LegalRouteGuard` — it checks `viewLegalModule` first, then any additional capability supplied.
3. **Server-side enforcement** — the client capability check is UX; the underlying service (`legalCaseStateMachine`, `lgOrderStateMachine`, `lgNoticeService`, etc.) re-verifies via `canTransitionLegalCase(from, to, userCapability)` and throws on violation.
4. **Never store role checks in components.** If a new action is needed, add a capability to `LgCapability`, extend `LG_BASE_MATRIX`, and update this document — in the same change.
5. **Confidential documents**: the `viewConfidentialDocuments` capability is checked in `LegalCaseDocumentsTab` and `DocumentCenter` before revealing documents whose `confidentiality_level` ≥ `RESTRICTED`.
6. **Error messages**: blocked actions surface via toast — `"You do not have permission to <verb>."` — and the service layer throws `PermissionError` for defence in depth.

---

## Changing the Matrix

1. Edit `LG_BASE_MATRIX` in `src/hooks/legal/useLgAccess.ts`.
2. Update this table.
3. If a new capability is introduced, add it to the `LgCapability` union.
4. If a system role should map differently, update `lg_role_type_mapping` (DB) — do **not** hard-code in `FALLBACK_MAPPING` unless it's a permanent default.
