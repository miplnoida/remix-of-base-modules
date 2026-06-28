## DMS Module Sweep — Enterprise Context

### Goal
Replace direct organization / department / asset reads in the DMS (Document Management) layer with `resolveEnterpriseContext({ moduleCode: 'DMS' })` so that DMS metadata (org owner, department, folder branding, uploaded-doc cover pages, queue UI) all flow from one resolver. Functional behavior unchanged.

### Scope
DMS-only. Legal/Compliance/Benefits/Finance already done. Notifications, Reports, Public/Portal still pending.

### Files to update

1. **`src/components/admin/dms/StorageConfigPanel.tsx`**
   - Check for hardcoded org/dept labels in panel header / help text → swap for `useEnterpriseContext({ moduleCode: 'DMS' })`.

2. **`src/components/admin/DmsQueuePanel.tsx`**
   - Queue header and empty-state copy → resolver org name where applicable.

3. **`src/pages/admin/CoreDmsAdmin.tsx`**
   - Admin page header / breadcrumbs that mention the org → resolver.

4. **`src/pages/admin/DmsApiTest.tsx`**
   - Diagnostic page sample payloads using literal `"Social Security Board"` → resolver fallback.

5. **`src/components/documents/shared/DocumentUploadStep.tsx`** and **`DocumentSelectionStep.tsx`**
   - Any visible org/dept labels in stepper copy → resolver.
   - Do NOT touch upload logic, `dms_transfer_queue` write paths, or `document-proxy` invocations.

6. **DMS metadata writer (if any literal `organisation` / `department` strings exist in `dms_transfer_queue` enqueue paths)**
   - Search `src/services` for `dms_transfer_queue` inserts; replace any hardcoded `organisation_name`, `department_code` fields with resolver values before insert.

### What is explicitly NOT touched
- `src/integrations/supabase/client.ts`, `types.ts`
- DMS RPC contracts, edge functions, storage bucket config
- `document-proxy` edge function
- Atomic mirror flows in `online-applications` document lifecycle (already governed by its own memory rule)
- Legal/Compliance DMS metadata (already done in their sweeps)

### Pattern
```ts
const { data: ctx } = useEnterpriseContext({ moduleCode: 'DMS' });
const orgName = ctx?.organization?.name ?? 'Social Security Board';
const deptName = ctx?.department?.name ?? '';
```
For non-React services, dynamic-import `resolveEnterpriseContext` (same pattern used in `invoicePrinter.ts` / `receiptPrinter.ts`).

### Acceptance
- No direct `core_organization` / `core_department_profile` / `comm_assets` / `app_modules` reads in DMS UI or DMS write paths.
- DMS queue, upload steps, admin pages all show resolver-driven org/dept labels with literal fallbacks preserved.
- `dms_transfer_queue` enqueue payloads carry resolver-derived `organisation_name` / `department_code` (not hardcoded).
- No schema change. Typecheck passes.

### Report after run
- Files changed
- Direct reads replaced (count + locations)
- Remaining direct reads (with justification, e.g. admin write surfaces)
- Risk areas
