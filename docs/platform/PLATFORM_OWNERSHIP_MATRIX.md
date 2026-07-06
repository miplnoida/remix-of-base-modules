# Platform Ownership Matrix

Companion to `docs/platform/EPIC_0_1_PLATFORM_ADMIN_ACCEPTANCE.md`.

Purpose: for every shared platform capability, name the **canonical route**, the **owning module**, and every **duplicate / legacy** path that must redirect. Business-module screens (BN, Compliance, Legal, Finance, DMS, Social Security registration) are intentionally excluded — they live in their module's own admin area.

Legend for **Action**: `keep` = canonical, `redirect` = legacy path that returns `<Navigate replace />`, `merge` = fold behaviour into canonical (no separate page), `retire` = flag for deletion once analytics show no traffic.

---

## 1. Landing

| Capability            | Canonical Route     | Owning Module | Reused By                | Duplicate / Legacy                          | Action     |
|-----------------------|---------------------|---------------|--------------------------|---------------------------------------------|------------|
| Platform Admin hub    | `/admin/platform`   | Platform      | All modules              | `/admin/home`, `/admin/dashboard`, `/admin` | keep + redirect |

---

## 2. Organisation

| Capability              | Canonical Route       | Owning Module | Reused By              | Duplicate / Legacy                                                                                          | Action           |
|-------------------------|-----------------------|---------------|------------------------|-------------------------------------------------------------------------------------------------------------|------------------|
| Offices                 | `/admin/offices`      | Platform      | All modules            | `src/pages/admin/OfficeManagement.tsx`, `src/pages/systemAdmin/*` office variants, `/admin/office-ip-management` | keep + redirect  |
| Departments             | `/admin/departments`  | Platform      | HR, Workflow, Legal    | `src/pages/admin/DepartmentManagement.tsx`, `/admin/organization/departments`, `/admin/organization/department-mapping` | keep + redirect  |
| Designations            | `/admin/designations` | Platform      | HR, Workflow           | `src/pages/admin/DesignationManagement.tsx`, `/admin/master-data/designations`, `/admin/designation-hierarchy` | keep + redirect  |
| Org Units / Positions   | `/admin/org-units`, `/admin/positions` | Platform | HR                    | `src/pages/systemAdmin/OrgUnitList.tsx`, `PositionList.tsx` (already the canonical impls, mounted under `/admin/*`) | keep             |
| Organisation Foundation | `/admin/org/foundation/*` (OrganizationManagementShell) | Platform | Comms, Templates | `src/pages/admin/OrganizationManagementAdmin.tsx` (already a redirector) | keep             |

---

## 3. People & Access

| Capability             | Canonical Route            | Owning Module | Reused By     | Duplicate / Legacy                                                                                                | Action           |
|------------------------|----------------------------|---------------|---------------|-------------------------------------------------------------------------------------------------------------------|------------------|
| Users list             | `/admin/users`             | Platform      | All modules   | `/admin/user-management` (redirects), `src/pages/admin/UserManagementAdmin.tsx`, `src/pages/systemAdmin/UserManagement.tsx` | keep + retire legacy files |
| Create / edit / view user | `/admin/users/create`, `/admin/users/:id`, `/admin/users/:id/edit`, `/admin/users/:id/roles` | Platform | All modules | none                                                                                                              | keep             |
| Roles & Permissions    | `/admin/roles`             | Platform      | All modules   | `/admin/roles-permissions`, `/admin/role-hierarchy`, `src/pages/systemAdmin/RoleList.tsx`, `src/pages/admin/RolePermissionManagement.tsx`, `src/pages/admin/RoleHierarchy.tsx` | keep + redirect + retire legacy files |
| Delegations            | `/admin/delegations`       | Platform      | Workflow      | `src/pages/systemAdmin/DelegationList.tsx` (this file **is** the canonical component; safe)                        | keep             |
| Employee directory     | `/admin/employees`         | Platform      | HR            | none                                                                                                              | keep             |
| Web / external users   | `/admin/web-users`, `/admin/external-portal-settings`, `/admin/external-portal-approvals` | Platform | Portals | none                                                                                              | keep             |
| Data access policies   | `/admin/data-access/*`     | Platform      | All modules   | none                                                                                                              | keep             |

---

## 4. Platform Services

| Capability                | Canonical Route                          | Owning Module | Reused By          | Duplicate / Legacy                                                                                       | Action          |
|---------------------------|------------------------------------------|---------------|--------------------|----------------------------------------------------------------------------------------------------------|-----------------|
| Notifications runtime     | `/admin/notifications`                   | Notification  | All modules        | `/admin/notification-management` (redirects)                                                             | keep            |
| Notification logs         | `/admin/notifications/log`, `/admin/notifications/logs` | Notification | All modules | `src/pages/admin/NotificationLogs.tsx`, `src/pages/systemAdmin/NotificationLog.tsx` (functional impls used by canonical route) | keep            |
| Notification / document templates | `/admin/notification-templates` | Notification  | Comms, Legal, Compliance, BN, Finance, DMS | 20+ module-specific template routes (see `AppRoutes.tsx` 2154–2179, 2286, 2445) all redirect with querystring filters | keep + redirect |
| Notification channels     | `/admin/notifications/channels`          | Notification  | All modules        | `src/pages/systemAdmin/NotificationChannelSettings.tsx` (already reused by canonical route)              | keep            |
| Notification providers    | `/admin/notifications/providers`         | Notification  | All modules        | none                                                                                                     | keep            |
| Numbering rules           | `/admin/numbering`                       | Platform      | All modules        | `/admin/numbering-rules`, `/admin/reference-sequences`, `src/pages/admin/NumberingRulesAdmin.tsx`, `src/pages/systemAdmin/ReferenceSequencesAdmin.tsx` | keep + redirect + retire legacy files |
| Modules & feature flags   | `/admin/modules`                         | Platform      | All modules        | `/admin/organization/modules` (redirects)                                                                | keep            |
| Module button bindings    | `/admin/module-button-bindings`          | Platform      | All modules        | none                                                                                                     | keep            |
| Public API keys           | `/admin/api-keys`, `/admin/public-api`, `/admin/api-configuration` | Platform | Integrations | `src/pages/admin/ApiKeysManagement.tsx`, `PublicApiManagement.tsx`, `ExternalApiManagement.tsx`         | keep            |
| Email campaigns / logs    | `/admin/email-campaigns`, `/admin/email-logs` | Notification | Marketing      | none                                                                                                     | keep            |

---

## 5. Security

| Capability              | Canonical Route                    | Owning Module | Reused By     | Duplicate / Legacy                                                     | Action           |
|-------------------------|------------------------------------|---------------|---------------|------------------------------------------------------------------------|------------------|
| Password policy         | `/admin/security/password-policy`  | Security      | All modules   | none                                                                   | keep             |
| MFA                     | `/admin/security/mfa`              | Security      | All modules   | none                                                                   | keep             |
| Security policy         | `/admin/security/policy`           | Security      | All modules   | `src/pages/admin/SecuritySettings.tsx` (mounted at `/admin/security`)  | keep             |
| IP access rules         | `/admin/security/ip-access`        | Security      | All modules   | `/admin/office-ip-management` (redirects to `/admin/offices?tab=ip`)   | keep + redirect  |
| System-level settings   | `/admin/settings`                  | Platform      | All modules   | `src/pages/systemAdmin/SystemSettings.tsx`, `GlobalSettings.tsx`       | keep + merge legacy `systemAdmin` copies |

---

## 6. Operations

| Capability                | Canonical Route              | Owning Module | Reused By     | Duplicate / Legacy                                                          | Action           |
|---------------------------|------------------------------|---------------|---------------|-----------------------------------------------------------------------------|------------------|
| Workflow Engine (canonical registry) | `/admin/workflows`, `/admin/workflows/new`, `/admin/workflows/:id` | Workflow | All modules | `/admin/workflow` (legacy alias — redirects to `/admin/workflows`) | keep — **canonical**, backed by `workflow_definitions` |
| Workflow visual designer  | `/admin/workflow-management`, `/admin/workflow-management/{workflows,runs,data,templates,settings}` | Workflow | All modules | none — designer surface only, not the registry | keep as designer shell |
| Workflow schemes          | `/admin/workflow-schemes`    | Workflow      | All modules   | none                                                                        | keep             |
| Workflow triggers         | `/admin/workflow-triggers`   | Workflow      | All modules   | none                                                                        | keep             |
| Workflow logs / analytics | `/admin/workflow-logs`, `/admin/workflow-analytics` | Workflow | All modules | none                                                                        | keep             |
| Workflow instances        | `/admin/workflow-instances`, `/admin/workflow-instances/:id` | Workflow | All modules | none                                                                        | keep             |
| Central scheduler         | `/admin/scheduler`           | Platform      | All modules   | none                                                                        | keep             |
| Session health            | `/admin/session-health`      | Platform      | All modules   | `/admin/system-monitoring` (redirects)                                      | keep + redirect  |
| Backup / recovery         | `/admin/backup`              | Platform      | Ops           | `src/pages/systemAdmin/BackupRecovery.tsx` (this file **is** the canonical impl) | keep             |
| Data migration            | `/admin/data-migration`      | Platform      | Ops           | none                                                                        | keep             |
| System cleanup            | `/admin/system-cleanup/*`    | Platform      | Ops           | none                                                                        | keep             |

---

## 7. Governance

| Capability            | Canonical Route         | Owning Module | Reused By     | Duplicate / Legacy                                                     | Action           |
|-----------------------|-------------------------|---------------|---------------|------------------------------------------------------------------------|------------------|
| System logs           | `/admin/logs`           | Platform      | All modules   | `/admin/system-logs` (redirects), `src/pages/systemAdmin/SystemLogs.tsx` | keep + redirect  |
| Consolidated audit    | `/system-logs/audit`    | Platform      | All modules   | `/admin/audit`, `/admin/audit-log`, `/admin/audit-logs` (all redirect) | keep + redirect  |
| Approval matrices     | `/admin/approval-matrix/payment` `.../fee-waiver` `.../journal` `.../refund` `.../write-off` | Finance | Cashier, Finance | none | keep (Finance-owned, exposed under `/admin/*`) |
| QA / Knowledge        | `/admin/qa`, `/admin/qa/knowledge`, `/admin/qa/change-requests` | Platform | Engineering | none | keep |
| Release management    | `/admin/release-management` (via `ReleaseManagement.tsx`) | Platform | Engineering | none | keep |
| Public catalog validation | `/admin/public-catalog-validation` | Platform | Integrations | none | keep |

---

## 8. Module Boundary — kept OUT of Platform Admin

The following remain owned by their business module and are not surfaced on `/admin/platform`:

| Module            | Admin surface                                     |
|-------------------|---------------------------------------------------|
| Social Security   | `/employer/*`, `/person/*`, `/c3-management/*`   |
| BN (Benefits)     | `/bn/*`, `/nbenefit/*`                            |
| Compliance        | `/compliance/*`, `/bema/*`                        |
| Legal             | `/legal/*` including `/legal/admin/*` and `/legal/reports/*` |
| Finance           | `/finance/*`, `/cashier/*`                        |
| DMS               | `/admin/core-dms`, `/admin/dms-*` (thin adapters only) |
| Audit             | `/audit/*` (Internal Audit module)                |

Platform Admin exposes only shared services these modules **consume**; it does not embed their business configuration.

---

## 9. Legacy files still present (candidates for retirement)

Files that duplicate a canonical page and are not referenced by the router. Verified against `AppRoutes.tsx`:

| File                                              | Superseded by                                       | Notes |
|---------------------------------------------------|-----------------------------------------------------|-------|
| `src/pages/admin/UserManagementAdmin.tsx`         | `src/pages/admin/users/UserList.tsx`                | Not routed; delete after 1 release. |
| `src/pages/admin/RolePermissionManagement.tsx`    | `src/pages/admin/RolesAdmin.tsx`                    | Not routed. |
| `src/pages/admin/RoleHierarchy.tsx`               | `/admin/roles?tab=hierarchy`                        | Not routed. |
| `src/pages/admin/DesignationHierarchy.tsx`        | `/admin/designations?tab=hierarchy`                 | Not routed. |
| `src/pages/admin/DepartmentManagement.tsx`        | `src/pages/admin/DepartmentsAdmin.tsx`              | Not routed. |
| `src/pages/admin/DesignationManagement.tsx`       | `src/pages/admin/DesignationsAdmin.tsx`             | Not routed. |
| `src/pages/admin/OfficeManagement.tsx`            | `src/pages/admin/OfficesAdmin.tsx`                  | Not routed. |
| `src/pages/admin/NumberingRulesAdmin.tsx`         | `src/pages/admin/NumberingAdmin.tsx`                | Not routed; route already redirects. |
| `src/pages/admin/NotificationTemplates.tsx`       | `src/pages/admin/NotificationTemplatesAdmin.tsx`    | Not routed. |
| `src/pages/systemAdmin/UserManagement.tsx`        | `src/pages/admin/users/UserList.tsx`                | Not routed. |
| `src/pages/systemAdmin/RoleList.tsx`              | `src/pages/admin/RolesAdmin.tsx`                    | Not routed. |
| `src/pages/systemAdmin/GlobalSettings.tsx`        | `src/pages/admin/settings/*`                        | Not routed. |
| `src/pages/systemAdmin/SystemSettings.tsx`        | `/admin/settings`                                   | Route uses this file — safe until settings hub replaces it. |
| `src/pages/systemAdmin/NotificationTemplates.tsx` | `src/pages/admin/NotificationTemplatesAdmin.tsx`    | Not routed. |

No files are deleted in this pass — retirement will follow one release cycle of the redirects added in Epic 0.1.

---

## 10. Mock / static data or hardcoded `SYSTEM` user — action notes

Findings across reused admin pages:

- **`WorkflowInstanceDetail.tsx`** — falls back to the string `'SYSTEM'` when `useUserCode()` returns null. Cannot occur on `/admin/*` because those routes are guarded by `PermissionProtectedRoute`; no override of a real logged-in user. **No action required**, retain as defensive fallback.
- **`src/pages/admin/SeedTestUsers.tsx`** — uses static seed data by design (dev tool). **No action**.
- **`src/pages/systemAdmin/SessionHealth.tsx` / `SystemLogs.tsx`** — read live data via services; verified against Supabase read queries. **No action**.
- **`src/pages/admin/NotificationLogs.tsx`** — live query. **No action**.
- **`src/pages/admin/ExternalPortalApprovals.tsx`** — live query, resolves acting user via `useUserCode()`. **No action**.
- Legacy files listed in §9 that are **not routed** are excluded from this audit — they will be deleted rather than fixed.

---

## 11. Database schema

No schema changes performed. All new redirects and the regrouped landing page reuse existing tables and services. No missing platform capability was confirmed that would require a new table in this pass.

---

## 12. Change log

- **This revision** — regrouped `/admin/platform` from 9 into 6 canonical groups (Organisation, People & Access, Platform Services, Security, Operations, Governance). Card links unchanged; no new routes. Added this ownership matrix.
- **Epic 0.1** — created `/admin/platform`, added 8 bookmark-safe redirects. See `EPIC_0_1_PLATFORM_ADMIN_ACCEPTANCE.md`.
