# Permanent Architectural Rule: No Row Level Security

**Effective Date:** 2026-02-22  
**Status:** PERMANENT — This rule cannot be overridden without executive approval.

## Rule

**Row Level Security (RLS) must NOT be used in this project.** All authorization must be enforced through role-based security at the application/backend layer.

## Rationale

RLS was disabled across all 225 public tables (472 policies removed) due to recurring runtime crashes, permission errors, and data access blocks caused by RLS policy conflicts. The system now relies exclusively on role-based authorization enforced server-side.

## What This Means

**For new tables:** Do NOT enable RLS. Do NOT create RLS policies.

**For new features:** Authorization checks must be implemented in:
- Edge functions (validate user role from JWT before performing operations)
- RPC/stored procedures (accept user_id as parameter, verify role in function body)
- Application middleware (SecurityPolicyContext, PermissionProtectedRoute, PermissionWrapper)

**For data access:** All queries go through authenticated Supabase client using the anon key. The anon key now has unrestricted read/write on public tables. Access control is enforced by:
1. Authentication (user must be logged in)
2. Role validation (user_roles table checked server-side)
3. Module permission checks (role_permissions + app_modules)
4. Route security (route_security_config + SecurityPolicyProvider)

## Backup

The full set of 472 RLS policies that were removed is preserved in `docs/rls-policies-backup.sql` and can be re-applied if needed.

## Compliance

Every code review and migration must verify:
- No `ENABLE ROW LEVEL SECURITY` statements
- No `CREATE POLICY` statements
- Authorization logic exists in the backend layer for any new sensitive operation
