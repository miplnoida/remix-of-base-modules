---
name: Epic 6 — Enterprise Identity Framework
description: core_staff_profiles/assignments/security_state/delegations tables, core_user_profiles_v compat view, /admin/users/:userId/manage enterprise profile screen at src/pages/admin/UserProfileManageAdmin.tsx, identity service at src/platform/identity/*, roles loaded from DB (roles master then user_roles fallback), never hardcoded. Standard profile in profiles table preserved intact.
type: feature
---
Epic 6 delivered enterprise identity extension without touching profiles/user_roles semantics.

Tables (public.core_*):
- core_staff_profiles — extends profile; employment_status, staff_type, hire/termination, supervisor.
- core_staff_assignments — office/department/designation over time; partial UNIQUE index enforces one active PRIMARY per user_id.
- core_user_security_state — account_status + lock/suspend/disable/mfa fields; disable/enable also mirrors profiles.is_active.
- core_user_delegations — delegator→delegate, scope (module/permission), effective window, approval_status.
- core_user_profiles_v — view over profiles (compatibility read layer).

Service: src/platform/identity/identityService.ts (all writes go through here + safeAudit).
Hooks: src/platform/identity/useIdentity.ts.
Types/permissions: identityTypes.ts / identityPermissions.ts.

UI: /admin/users/:userId/manage — one clean page with 4 friendly sections
(Basic Information, Work & Assignment, Roles & Access, Security) and a collapsible
Advanced area (Assignment History, Delegations, Security Details, Audit History placeholder).
Never expose table names. Accessed via the ShieldCheck action on the /admin/users list.

Roles are loaded via identityService.getAvailableRoles() — prefers `roles` master, falls
back to distinct user_roles.role. NEVER add a hardcoded AVAILABLE_ROLES list.

Governance registrations completed in the migration:
- core_table_registry: 4 new tables + 1 view registered; tb_office / tb_office_departments back-registered as LEGACY.
- core_legacy_table_map: profiles, tb_office, tb_office_departments, user_roles (all DIRECT/APPROVED).
- core_legacy_column_map: 20 field mappings for the profile/office/department columns used in this epic.
- core_permission_registry: seeded new keys (manage_assignments, manage_security, manage_delegations,
  staff_profiles.view/manage, identity.view/manage). Elevated users.manage_roles→CRITICAL, users.disable→HIGH.

Route /admin/users already registered in core_admin_route_registry.
