---
name: Permission Registry Discipline
description: Every new page/feature/action/export/approval/sensitive-field must define a permission key in the source registry and sync into core_permission_registry
type: preference
---

Every new page, feature, admin function, workflow action, export, approval, sensitive field, or module action MUST:

1. Define a permission key in the source permission registry
   (`src/platform/rbac/core.permissions.ts` for core, or module equivalent — e.g. `bn.permissions.ts`, `er.permissions.ts`).
2. Be synced into `core_permission_registry`.
3. If the feature has UI access but no registered permission, the epic is INCOMPLETE.

**Risk classification (required):**
- `risk_level = 'HIGH'` or `'CRITICAL'` for high-risk permissions
  (destructive actions, financial disbursement, approvals, security config, permission mgmt, data export at scale).
- `is_sensitive_permission = true` for permissions that expose:
  - PII (personal identifying info)
  - Financial data
  - Health / medical data
  - Data exports
  - Approvals / maker-checker actions
  - Security controls

**Naming:** lowercase dot notation `<module>.<area>.<resource>.<action>`
(e.g. `bn.claim.payment.approve`, `core.admin.users.export`).

**Enforcement:** Reviewers reject any new UI surface, workflow action, export, or approval control that lacks a registered permission with correct `risk_level` and `is_sensitive_permission` flags.
