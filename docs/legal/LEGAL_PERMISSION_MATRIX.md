# Legal Module — Permission Matrix

_Last updated: EPIC-03A Finalization (Navigation Integration & Administrator Full Permissions)._

This document is the single source of truth for how access is granted across
the Legal module. It supersedes the earlier `permission-matrix.md` note and
should be kept in sync with:

- `src/hooks/legal/useLgAccess.ts`
- `src/hooks/legal/useLegalCapability.ts`
- `src/config/legalRouteCapabilities.ts`
- `public.app_modules`  (DB-driven sidebar)
- `public.lg_role_type_mapping`  (system-role → legal-role-type overrides)

---

## 1. Navigation structure

The sidebar is DB-driven from `public.app_modules`. The active Legal tree is:

```
Legal Enforcement
├── Command Centre
│   └── Legal Dashboard                → /legal/lg/dashboard
├── My Work
│   ├── My Tasks                       → /legal/lg/tasks?view=my
│   └── Team Queue                     → /legal/lg/tasks?view=team
├── Recovery Workbench
│   └── Recovery Workbench             → /legal/lg/recovery
├── Referrals
│   ├── Referral Queue                 → /legal/referrals-workbench
│   ├── Referral from Compliance       → /compliance/legal-referral/launcher
│   ├── Referral from Benefits         → /bn/legal-referral/launcher
│   ├── Intake & Qualification         → /legal/lg/intake
│   └── Supervisor Review              → /legal/lg/intake?preset=supervisor_review
├── Cases
│   ├── Legal Matters                  → /legal/lg/cases
│   ├── New Matter                     → /legal/lg/cases/new
│   └── Legal Workbench                → /legal/workbench
├── Hearings
│   └── Hearing Calendar               → /legal/lg/hearings
├── Orders & Judgments
│   └── Orders                         → /legal/court-orders
├── Recovery & Payments
│   └── Recovery Actions               → /legal/enforcement
├── Settlements
│   └── Payment Arrangements           → /legal/payment-plans
├── Tasks & SLA
│   └── My Tasks                       → /legal/lg/tasks
├── Documents & Notices
│   └── Document Centre                → /legal/documents
├── Advisory & Contract Review
│   └── Services Hub                   → /legal/services
├── Analytics
│   └── Legal Reports                  → /legal/reports
└── Administration
    └── Administration Hub             → /legal/admin
```

`/legal/lg/referrals` is a canonical alias that redirects to
`/legal/referrals-workbench`. All legacy deep links continue to work.

---

## 2. Role catalogue

Two orthogonal role families cooperate to gate the Legal module:

| Family                    | Purpose                                      | Source                                                                                 |
|---------------------------|----------------------------------------------|----------------------------------------------------------------------------------------|
| **System roles**          | Coarse system-wide access & impersonation    | `public.user_roles.role`                                                               |
| **Legal role types**      | Fine-grained Legal workflow capabilities     | `useLgAccess.ts` + `public.lg_role_type_mapping`                                       |

### 2.1 Legal role types (`LgRoleType`)

| Code                 | Description                                                                 |
|----------------------|-----------------------------------------------------------------------------|
| `LG_READ_ONLY`       | View only — no writes                                                       |
| `LG_LEGAL_ASSISTANT` | Prepares drafts (notices, hearings, fees). Cannot approve or send.          |
| `LG_CASE_HANDLER`    | Owns cases end-to-end for substantive legal actions                         |
| `LG_REVIEWER`        | Reviews assistant drafts before approval                                    |
| `LG_APPROVER`        | Final sign-off (lawyer)                                                     |
| `LG_ADMIN`           | Full legal admin — every capability including configuration                 |

### 2.2 System role → Legal inheritance

The following system roles automatically inherit **every** Legal capability
without needing an explicit `LEGAL_*` role or a row in
`lg_role_type_mapping`:

- `ADMIN`
- `SYSTEMADMIN` / `SYSTEM_ADMIN` / `SYSTEM ADMIN`
- `SUPERADMIN` / `SUPER_ADMIN` / `SUPER ADMIN`
- `LEGALADMIN`

Enforcement is centralized:

- `useLegalCapability.ts` promotes these roles to `LEGAL_ADMIN`, which
  unlocks every `LegalCapability.*` flag consumed by the route guard.
- `useLgAccess.ts` short-circuits `can(cap)` to `true` when `isAdmin` is
  detected, so future capabilities added to `LgCapability` are automatically
  granted to administrators — no per-capability wiring needed.

### 2.3 Fallback mapping (out-of-the-box)

`FALLBACK_MAPPING` in `useLgAccess.ts`:

| System role                | Legal role-types inherited                              |
|----------------------------|---------------------------------------------------------|
| `LEGAL_OFFICER`            | `LG_CASE_HANDLER`, `LG_REVIEWER`, `LG_APPROVER`         |
| `SENIOR_LEGAL_OFFICER`     | `LG_CASE_HANDLER`, `LG_REVIEWER`, `LG_APPROVER`         |
| `LEGAL_MANAGER`            | `LG_ADMIN`, `LG_APPROVER`, `LG_REVIEWER`                |
| `LEGAL_ASSISTANT`          | `LG_LEGAL_ASSISTANT`                                    |
| `LEGAL_READ_ONLY`          | `LG_READ_ONLY`                                          |
| `COMPLIANCELEGALOFFICER`   | `LG_CASE_HANDLER`, `LG_REVIEWER`, `LG_APPROVER`         |
| `COMPLIANCEHEAD`           | `LG_ADMIN`, `LG_APPROVER`                               |
| `COMPLIANCEADMIN`          | `LG_ADMIN`                                              |
| `COMPLIANCEREPORTSVIEWER`  | `LG_READ_ONLY`                                          |

Rows in `lg_role_type_mapping` **override** the fallback when present.

---

## 3. Capability matrix

Legend: ✅ granted, ➖ not granted, 👑 all administrators bypass this check.

| Capability                              | READ_ONLY | ASSISTANT | HANDLER | REVIEWER | APPROVER | ADMIN | SYS ADMIN |
|-----------------------------------------|:---------:|:---------:|:-------:|:--------:|:--------:|:-----:|:---------:|
| View Legal Module                       | ✅        | ✅        | ✅      | ✅       | ✅       | ✅    | 👑        |
| View Confidential Documents             | ➖        | ➖        | ➖      | ✅       | ✅       | ✅    | 👑        |
| Export Data                             | ➖        | ➖        | ✅      | ➖       | ✅       | ✅    | 👑        |
| Create Referral / Intake                | ➖        | ➖        | ✅      | ➖       | ✅       | ✅    | 👑        |
| Edit Referral / Intake                  | ➖        | ✅        | ✅      | ✅       | ✅       | ✅    | 👑        |
| Accept Referral                         | ➖        | ➖        | ➖      | ➖       | ✅       | ✅    | 👑        |
| Reject Referral                         | ➖        | ➖        | ➖      | ➖       | ✅       | ✅    | 👑        |
| Request Information                     | ➖        | ✅        | ✅      | ➖       | ✅       | ✅    | 👑        |
| Respond to Information Request          | ➖        | ✅        | ✅      | ➖       | ✅       | ✅    | 👑        |
| Approve Intake / Supervisor Approval    | ➖        | ➖        | ➖      | ➖       | ✅       | ✅    | 👑        |
| Create Legal Case                       | ➖        | ➖        | ✅      | ➖       | ✅       | ✅    | 👑        |
| Edit Legal Case                         | ➖        | ➖        | ✅      | ✅       | ✅       | ✅    | 👑        |
| Assign / Reassign Officer / Team        | ➖        | ➖        | ➖      | ➖       | ✅       | ✅    | 👑        |
| View / Edit Recovery                    | ✅ / ➖    | ➖        | ✅      | ➖       | ✅       | ✅    | 👑        |
| Create / Edit Hearings                  | ➖        | ✅ *prep* | ✅      | ➖       | ✅       | ✅    | 👑        |
| Record Hearing Outcome                  | ➖        | ➖        | ➖      | ✅       | ✅       | ✅    | 👑        |
| Create Orders                           | ➖        | ➖        | ✅      | ➖       | ✅       | ✅    | 👑        |
| Record Orders                           | ➖        | ✅        | ✅      | ➖       | ✅       | ✅    | 👑        |
| Draft Settlement                        | ➖        | ✅        | ✅      | ➖       | ✅       | ✅    | 👑        |
| Approve Settlement                      | ➖        | ➖        | ➖      | ➖       | ✅       | ✅    | 👑        |
| Create / Modify Payment Arrangements    | ➖        | ➖        | ✅      | ➖       | ✅       | ✅    | 👑        |
| Prepare / Generate Notices              | ➖        | ✅        | ✅      | ➖       | ✅       | ✅    | 👑        |
| Approve Notices                         | ➖        | ➖        | ➖      | ✅       | ✅       | ✅    | 👑        |
| Send Notices                            | ➖        | ➖        | ➖      | ➖       | ✅       | ✅    | 👑        |
| Upload / Link Documents                 | ➖        | ✅        | ✅      | ➖       | ✅       | ✅    | 👑        |
| Delete Documents (where permitted)      | ➖        | ➖        | ➖      | ➖       | ✅       | ✅    | 👑        |
| View Audit                              | ✅        | ✅        | ✅      | ✅       | ✅       | ✅    | 👑        |
| Manage Templates                        | ➖        | ➖        | ➖      | ➖       | ➖       | ✅    | 👑        |
| Manage Checklists / Thresholds          | ➖        | ➖        | ➖      | ➖       | ➖       | ✅    | 👑        |
| Manage Reference Data                   | ➖        | ➖        | ➖      | ➖       | ➖       | ✅    | 👑        |
| Manage Workflow / Routing               | ➖        | ➖        | ➖      | ➖       | ➖       | ✅    | 👑        |
| Manage SLA Rules                        | ➖        | ➖        | ➖      | ➖       | ➖       | ✅    | 👑        |
| View / Manage Analytics & Dashboards    | ✅ / ➖    | ✅ / ➖    | ✅ / ➖  | ✅ / ➖   | ✅ / ➖   | ✅    | 👑        |
| Manage Administration                   | ➖        | ➖        | ➖      | ➖       | ➖       | ✅    | 👑        |

`👑` = system administrator inheritance short-circuit — see §2.2.

---

## 4. Route → capability mapping

Route access is enforced by `LegalRouteGuard` using
`src/config/legalRouteCapabilities.ts`. Longest-prefix wins.

Notable operational routes (all reachable by any Legal role and 👑):

- `/legal/lg/dashboard` — `view`
- `/legal/lg/cases` — `view`
- `/legal/lg/intake`, `/legal/lg/intake/:id` — `view`
- `/legal/lg/referrals` — `canViewWorkbench`
- `/legal/lg/recovery` — `view`
- `/legal/lg/tasks`, `/legal/lg/my-work` — `view`
- `/legal/lg/hearings` — `view`
- `/legal/court-orders`, `/legal/enforcement`, `/legal/payment-plans` — `view`
- `/legal/documents`, `/legal/services`, `/legal/reports` — `view`

Administrative surface (Admin or 👑 only):

- `/legal/admin/**` — `canManageRouting` / `canManageTemplates` /
  `canManageReferenceData` / `canRunIntegrityChecks` / `canManageSla`

---

## 5. Permission inheritance model

```
System role (ADMIN / SUPERADMIN / SYSTEMADMIN / LEGALADMIN)
        │  (useLegalCapability short-circuit)
        ▼
   LEGAL_ADMIN capability set
        │
        ▼
   Every LgCapability granted   ←  useLgAccess.can() short-circuit for isAdmin
        │
        ▼
   Every route in legalRouteCapabilities.ts is permitted
```

Non-administrators follow the standard chain:

```
system role (e.g. LEGAL_OFFICER)
   │  →  lg_role_type_mapping   (DB overrides)
   │  →  FALLBACK_MAPPING       (built-in)
   ▼
{ LG_CASE_HANDLER, LG_REVIEWER, LG_APPROVER, … }
   │  →  LG_BASE_MATRIX
   ▼
Set<LgCapability>  →  useLgAccess.can(cap)
```

### 5.1 Why inheritance instead of assigning individual permissions

Assigning every LG capability to every administrator by hand is brittle: new
capabilities (e.g. those introduced by EPIC-03A intake) would silently be
denied until the mapping was updated. The short-circuit in `useLgAccess.can()`
and the promotion in `useLegalCapability.ts` guarantee that any new
capability added to `LgCapability` — including capabilities not yet defined
— is immediately available to administrators.

### 5.2 Extending the model

- To grant a new **system** role admin-level Legal access, add it to
  `SYSTEM_ADMIN_ROLES` in `useLegalCapability.ts` and to `ADMIN_SYSTEM_ROLES`
  in `useLgAccess.ts`.
- To grant a **specific** legal role-type to a system role for a customer,
  insert into `lg_role_type_mapping (system_role, role_type, is_active)`.
- To add a new capability, extend the `LgCapability` union and assign it in
  `LG_BASE_MATRIX`. Administrators receive it automatically.

---

## 6. Validation checklist (per EPIC-03A Part 5)

An account holding any system-admin role (§2.2) must be able to:

- [x] Open every Legal screen listed in §1 without a permission-denied banner.
- [x] Complete Referral → Intake → Case conversion end-to-end.
- [x] Open Recovery Workbench (`/legal/lg/recovery`).
- [x] Open Analytics (`/legal/reports`).
- [x] Manage Administration (`/legal/admin/**`).
- [x] Export reports and view confidential records.
- [x] View the Audit tab on any case.

If any of these fail, the fix is a data issue — confirm the account's rows
in `public.user_roles` normalise to one of the `SYSTEM_ADMIN_ROLES` values.

---

## EPIC-06D — Recovery Assignment capabilities

Added / verified in `src/hooks/legal/useLgAccess.ts`:

| Capability | Read Only | Case Handler | Reviewer | Approver | Admin |
|---|:-:|:-:|:-:|:-:|:-:|
| `viewRecoveryAssignment` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `createRecoveryAssignment` | | ✅ | | ✅ | ✅ |
| `editRecoveryAssignment` | | ✅ | | ✅ | ✅ |
| `assignRecoveryOfficer` | | ✅ | | ✅ | ✅ |
| `reassignRecoveryAssignment` | | ✅ | | ✅ | ✅ |
| `bulkAssignRecovery` | | | | ✅ | ✅ |
| `transferRecoveryAssignment` | | ✅ | | ✅ | ✅ |
| `approveRecoveryTransfer` | | | ✅ | ✅ | ✅ |
| `changeRecoveryStrategy` | | ✅ | | ✅ | ✅ |
| `escalateRecoveryAssignment` | | ✅ | | ✅ | ✅ |
| `closeRecoveryAssignment` | | | | ✅ | ✅ |
| `viewRecoveryCampaign` | ✅ | ✅ | ✅ | | ✅ |
| `manageRecoveryCampaign` | | | | | ✅ |
| `configureRecoveryStrategy` (Strategy Types) | | | | | ✅ |
| `configureRecoveryCampaign` (Campaign Types) | | | | | ✅ |
| `configureWorkloadRules` | | | | | ✅ |
| `viewRecoveryGovernance` | ✅ | | ✅ | | ✅ |
| `manageRecoveryGovernance` | | | | | ✅ |

System roles `ADMIN`, `SYSTEMADMIN`, `SUPERADMIN`, `LEGALADMIN` bypass the matrix and receive every capability automatically (see `useLgAccess` — `isAdmin ? true : caps.has(cap)`).

### Role guidance

- **Recovery Officer** (LG_CASE_HANDLER): view own assignments, edit, change strategy, escalate; no close/approve.
- **Senior Recovery Officer / Supervisor** (LG_APPROVER): full lifecycle including bulk-assign, transfer approval, close.
- **Reviewer** (LG_REVIEWER): approve transfers, view governance.
- **Legal Manager / Admin** (LG_ADMIN): everything + configuration screens.
- **Read Only** (LG_READ_ONLY): view assignments, campaigns, governance only.
