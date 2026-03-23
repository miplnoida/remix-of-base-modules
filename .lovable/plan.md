

# Move SEP Contrib Rates & CyberSource Settings into C3 Configuration

## Summary

Integrate two existing components — **SepContribRateManagement** and **CyberSourceSettings** — as new tabs inside the C3 Configuration page at `/admin/c3-configuration`. Add server-side audit logging via database triggers for SEP contribution rate changes.

## Changes

### 1. Add two new tabs to `C3ConfigurationPage.tsx`

- Import `SepContribRateManagement` and `CyberSourceSettings`
- Add tab triggers: **"SE Contribution Rates"** and **"CyberSource Settings"**
- Add corresponding `TabsContent` sections rendering each component
- Add icons (Calculator for SE rates, CreditCard for CyberSource)

### 2. Refactor `SepContribRateManagement.tsx` for embeddable use

- Remove the outer `<PermissionWrapper>` and page-level heading/container since the parent C3 Configuration page already handles layout
- Export a version that renders just the Card content (table + dialogs) so it fits naturally as a tab
- Keep all existing Supabase queries, mutations, and permission checks (`useActionPermissions`) intact

### 3. Refactor `CyberSourceSettings.tsx` for embeddable use

- Remove `<PageShell>` wrapper and breadcrumbs (parent page provides context)
- Remove `useNavigate` since it's no longer a standalone page
- Export content that renders the table + modals directly as a tab section
- Keep all existing `wizReconciliationService` calls intact

### 4. Update routing (`AppRoutes.tsx`)

- Keep old routes but redirect them to `/admin/c3-configuration`:
  - `/admin/master-data/sep-contrib-rates` → redirect to `/admin/c3-configuration`
  - `/c3-management/settings/cybersource` → redirect to `/admin/c3-configuration`

### 5. Add audit trigger for `tb_self_emp_contrib_rate`

**Database migration** — attach the existing `audit_table_changes()` trigger:

```sql
CREATE TRIGGER trg_audit_tb_self_emp_contrib_rate
  AFTER INSERT OR UPDATE OR DELETE ON public.tb_self_emp_contrib_rate
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes('SE Contribution Rates');
```

This ensures all create/update/delete operations on this table are automatically logged to `system_audit_trail` with before/after values, user attribution, and timestamps — visible at `/system-logs/audit`.

### 6. CyberSource audit logging

CyberSource settings are managed via the external `wiz-admin-api` edge function (not a local table). Add client-side `logAuditTrail()` calls in `CyberSourceSettings.tsx`:
- After successful **toggle** → log action `'update'`, entity type `'cybersource_settings'`, with before/after status values
- After successful **edit** → log action `'update'`, entity type `'cybersource_settings'`, with field changes

### Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/C3ConfigurationPage.tsx` | Add 2 new tabs (SE Rates, CyberSource) |
| `src/pages/admin/SepContribRateManagement.tsx` | Remove page wrapper, export embeddable content |
| `src/pages/c3Management/CyberSourceSettings.tsx` | Remove PageShell, add audit logging calls |
| `src/components/routing/AppRoutes.tsx` | Redirect old routes to `/admin/c3-configuration` |
| **New migration** | Add audit trigger on `tb_self_emp_contrib_rate` |

