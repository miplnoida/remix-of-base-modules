

# Complete Audit Logging Framework — Plan

## Current State

The system has ~100 files using `useMutation` but only **1 file** uses the existing `useLoggedMutation` wrapper. Similarly, `useLoggedQuery` exists but is used **0 times**. The infrastructure is built but almost entirely unused:

- `system_audit_trail` table exists with proper schema (action, entity_type, entity_id, module, before_value, after_value, user_name, etc.)
- `logAuditTrail()` service exists but is only called in ~10 places (security, payment config, settings)
- `useSystemLogger` hook exists but is used in only ~5 files
- `SystemLoggingProvider` already logs navigation/page_view events to `system_business_events`
- `useLoggedMutation` / `useLoggedQuery` wrappers exist but are unused

The problem is **adoption**, not infrastructure.

## Strategy: Automatic Interception (Not Manual Retrofit)

Retrofitting 100+ mutation files is impractical and fragile. Instead, we will implement **automatic audit logging** at two levels:

### Level 1: Global React Query Interceptor (Client-Side)
Enhance the existing `MutationCache` in `App.tsx` to automatically log every mutation success/failure to `system_audit_trail`. This catches ALL mutations system-wide without modifying any individual hook.

### Level 2: Database Triggers for Critical Tables (Server-Side)  
Create PostgreSQL triggers on high-value tables to guarantee server-side audit capture for INSERT/UPDATE/DELETE regardless of the client path. This covers the "cannot be bypassed" requirement.

### Level 3: Enhanced Navigation Logging
Upgrade `SystemLoggingProvider` to log page views to `system_audit_trail` (currently only goes to `system_business_events`), so screen open/view actions appear in the audit trail.

---

## Detailed Technical Plan

### 1. Add `route` Column to `system_audit_trail` (Migration)

Add a `route` column to capture the screen/URL where the action occurred:

```sql
ALTER TABLE system_audit_trail ADD COLUMN IF NOT EXISTS route TEXT;
```

### 2. Create Global Audit Interceptor Service

Create `src/services/globalAuditInterceptor.ts`:

- A non-hook service function `logMutationAudit()` that writes to `system_audit_trail`
- Accepts: action, entityType, entityId, module, route, beforeValue, afterValue, userCode, userId
- Resolves user identity via `getCurrentUserCode()` if not provided
- Handles errors gracefully (logs failure to console, never blocks the mutation)

### 3. Enhance `MutationCache` in `App.tsx`

Update the `MutationCache.onSuccess` callback to automatically write audit entries:

- Extract mutation metadata from `mutation.options.mutationKey` (module, entity, action)
- Log the mutation variables as `after_value` for creates, capture context for updates/deletes
- Use `window.location.pathname` for the route
- Use a **convention-based key format**: `['module', 'entity', 'action']` — mutations that follow this pattern get automatic structured logging
- All other mutations still get a generic audit entry with the key as identifier

### 4. Enhance `SystemLoggingProvider` Navigation Logging

Update the existing `useEffect` in `SystemLoggingProvider.tsx` to **also** write page views to `system_audit_trail` (currently only writes to `system_business_events`). This ensures screen opens appear in the audit trail view at `/system-logs/audit`.

### 5. Create `useAuditedMutation` — Enhanced Wrapper

Enhance `useLoggedMutation` to become `useAuditedMutation` with:
- Automatic `before_value` capture: accepts a `fetchCurrentRecord` function that reads the DB before mutation
- Automatic `after_value` from mutation result
- Module/route/entity metadata from a simple config object
- This is the **recommended** path for new development — provides richer audit data than the global interceptor

### 6. Database Triggers for Critical Tables (Migration)

Create a reusable trigger function and attach it to high-value configuration/workflow tables:

```sql
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_user_name TEXT;
  v_before JSONB;
  v_after JSONB;
BEGIN
  -- Determine action
  v_action := TG_OP; -- INSERT, UPDATE, DELETE
  
  -- Resolve user from profiles
  SELECT user_code INTO v_user_name FROM profiles WHERE id = auth.uid();
  
  -- Set before/after
  IF TG_OP = 'DELETE' THEN
    v_before := to_jsonb(OLD);
    v_after := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_before := NULL;
    v_after := to_jsonb(NEW);
  ELSE
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
  END IF;
  
  INSERT INTO system_audit_trail (action, entity_type, entity_id, 
    before_value, after_value, user_name, user_id, module)
  VALUES (v_action, TG_TABLE_NAME, COALESCE(NEW.id::text, OLD.id::text),
    v_before, v_after, COALESCE(v_user_name, 'SYSTEM'), auth.uid(), TG_ARGV[0]);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Attach to critical tables: `er_master`, `ip_master`, `cn_batch`, `cn_receipt`, `profiles`, `tb_currencies`, `system_settings`, `workflow_instances`, and other key configuration/transaction tables.

### 7. Update Audit Trail Viewer

Update `src/pages/system-logs/AuditTrail.tsx`:
- Add `route` column to the display table
- Add route filter dropdown
- Ensure action type badges cover all new action types (INSERT, UPDATE, DELETE, page_view, enable, disable, etc.)

---

## Files to Create/Modify

**New files:**
- `src/services/globalAuditInterceptor.ts` — Central audit write service with user resolution
- Migration SQL — `route` column + reusable trigger function + trigger attachments

**Modified files:**
- `src/App.tsx` — Add `onSuccess` to `MutationCache` for global audit capture
- `src/providers/SystemLoggingProvider.tsx` — Add audit trail write for navigation events
- `src/pages/system-logs/AuditTrail.tsx` — Add route column and filter
- `src/hooks/useLoggedMutation.ts` — Enhance with before_value capture capability

**Not modified** (by design):
- The 100+ individual mutation hooks — the global interceptor handles them automatically

## Coverage Summary

| Activity | Mechanism |
|----------|-----------|
| Screen open / page view | SystemLoggingProvider → system_audit_trail |
| Any mutation (create/update/delete) | MutationCache.onSuccess → global interceptor |
| Critical table changes | PostgreSQL triggers (server-side, bypass-proof) |
| Status changes, approvals | Covered by mutation interceptor + DB triggers |
| Search, filter, export | SystemLoggingProvider page_view + mutation interceptor for exports |
| Future new screens/mutations | Automatic via global interceptor — zero additional code needed |

