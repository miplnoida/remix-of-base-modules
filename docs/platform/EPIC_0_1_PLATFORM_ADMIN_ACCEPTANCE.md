# EPIC 0.1 — Enterprise Platform Administration: Route Acceptance Checklist

## Objective
Consolidate all shared platform administration screens under a single, module-neutral landing page at `/admin/platform`. No new duplicate admin screens are introduced; existing canonical routes are reused and old paths redirect via `<Navigate replace />`.

## Platform Boundary Note
> This area manages shared platform services used by all business modules. Business-specific settings remain inside their respective modules.

The landing page is intentionally module-neutral and contains **no** references to Benefits, BN, Claims, Products, or Social Security.

## Landing Page
- Route: `/admin/platform`
- Component: `src/pages/admin/PlatformAdmin.tsx`
- Breadcrumbs: `Home / Administration / Platform`
- Title: `Enterprise Administration`

## Grouped Cards → Canonical Routes

| Group | Link | Canonical Route | Reused Component |
|---|---|---|---|
| Organisation Setup | Offices | `/admin/offices` | `OfficesAdmin` |
| Organisation Setup | Departments | `/admin/departments` | `DepartmentsAdmin` |
| Organisation Setup | Designations | `/admin/designations` | `DesignationsAdmin` |
| User & Access Management | Users | `/admin/users` | `UserList` |
| User & Access Management | Create User | `/admin/users/create` | `UserCreate` |
| User & Access Management | Roles & Permissions | `/admin/roles` | `RolesAdmin` |
| User & Access Management | Delegations | `/admin/delegations` | `DelegationList` |
| Security | Password Policy | `/admin/security/password-policy` | `PasswordPolicySettings` |
| Security | MFA | `/admin/security/mfa` | `MFASettings` |
| Security | Security Policy | `/admin/security/policy` | `SecurityPolicySettingsPage` |
| Security | IP Access Rules | `/admin/security/ip-access` | `IPAccessRulesManagement` |
| Workflow Administration | Workflow Management | `/admin/workflow-management` | `WorkflowManagement` |
| Workflow Administration | Workflow Designer | `/admin/workflows` | `WorkflowList` |
| Workflow Administration | Triggers | `/admin/workflow-triggers` | `WorkflowTriggers` |
| Workflow Administration | Logs | `/admin/workflow-logs` | `WorkflowLogs` |
| Workflow Administration | Analytics | `/admin/workflow-analytics` | `WorkflowAnalytics` |
| Notification Administration | Notifications | `/admin/notifications` | `NotificationManagement` |
| Notification Administration | Templates | `/admin/notification-templates` | `NotificationTemplatesAdmin` |
| Notification Administration | Channels | `/admin/notifications/channels` | `NotificationChannelSettings` |
| Notification Administration | Providers | `/admin/notifications/providers` | `ProviderSettings` |
| Numbering & Sequences | Numbering Rules | `/admin/numbering` | `NumberingAdmin` |
| Numbering & Sequences | Reference Sequences | `/admin/numbering?tab=sequences` | `NumberingAdmin` |
| Module / Feature Management | Modules | `/admin/modules` | `ModuleManagement` |
| Module / Feature Management | Module Button Bindings | `/admin/module-button-bindings` | `ModuleButtonBindings` |
| System Monitoring | Central Scheduler | `/admin/scheduler` | `CentralScheduler` |
| System Monitoring | Session Health | `/admin/session-health` | `SessionHealth` |
| Audit & Logs | System Logs | `/admin/logs` | `SystemLogs` |
| Audit & Logs | Audit Log | `/system-logs/audit` | (canonical audit page) |

## Bookmark-Safe Redirects (`<Navigate replace />`)

Redirects added in this epic:

| Old Route | Redirects To |
|---|---|
| `/admin/home` | `/admin/platform` |
| `/admin/dashboard` | `/admin/platform` |
| `/admin/user-management` | `/admin/users` |
| `/admin/notification-management` | `/admin/notifications` |
| `/admin/workflow` | `/admin/workflow-management` |
| `/admin/system-monitoring` | `/admin/session-health` |
| `/admin/system-logs` | `/admin/logs` |
| `/admin/audit` | `/system-logs/audit` |

Pre-existing redirects that remain valid:

| Old Route | Redirects To |
|---|---|
| `/admin/audit-log` | `/system-logs/audit` |
| `/admin/audit-logs` | `/system-logs/audit` |
| `/admin/numbering-rules` | `/admin/numbering` |
| `/admin/reference-sequences` | `/admin/numbering?tab=sequences` |
| `/admin/office-ip-management` | `/admin/offices?tab=ip` |
| `/admin/roles-permissions` | `/admin/roles?tab=permissions` |
| `/admin/role-hierarchy` | `/admin/roles?tab=hierarchy` |
| `/admin/designation-hierarchy` | `/admin/designations?tab=hierarchy` |
| `/admin/notifications/templates` | `/admin/notification-templates` |
| `/admin/notifications/notification-templates` | `/admin/notification-templates` |

## Acceptance Criteria — Verification

- [x] `/admin/platform` opens successfully (rendered by `PlatformAdmin`).
- [x] All cards link to existing working canonical routes (see table above).
- [x] No new duplicate admin screens created — only the landing page is new.
- [x] Existing old/duplicate admin routes redirect to canonical pages.
- [x] Platform Admin does not include BN-specific configuration (no BN/Benefits/Claims/Products/Social Security references).
- [x] Users, roles, offices, departments, modules, numbering, workflow, notifications, and audit are all reachable from one page.
- [x] Breadcrumbs and page title present.
- [x] Platform Boundary Note rendered on the landing page.

## User Identity in State-Changing Actions
Reused admin pages already resolve the acting user's `user_code` through `useUserCode()` / `getCurrentUserCode()` from `src/hooks/useUserCode.ts`. Any occurrence of `'SYSTEM'` in reused admin code paths (e.g. `WorkflowInstanceDetail.tsx`) is a last-resort fallback that only triggers if no authenticated user is present — which cannot occur on protected admin routes guarded by `PermissionProtectedRoute`. No hardcoded `'SYSTEM'` value overrides a logged-in user's `user_code`.

## Files Touched
- Added: `src/pages/admin/PlatformAdmin.tsx`
- Edited: `src/components/routing/AppRoutes.tsx` (lazy import + landing route + 8 bookmark-safe redirects)
- Added: `docs/platform/EPIC_0_1_PLATFORM_ADMIN_ACCEPTANCE.md`
