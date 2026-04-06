

## Plan: Fix Employer Detail Data Binding and Meeting Scheduling Issues

### Issues Identified

**Issue 1: Acquisition Date may show as empty**
- The detail page (line 339) displays `application.date_acquired`
- The normalize function (line 307) maps only `raw.date_acquired`, but external APIs often return `acquisition_date` instead
- The `acquisition_date` field (line 330) is mapped separately and unused by the detail page
- Fix: Add fallback in normalizer so `date_acquired` also checks `raw.acquisition_date`

**Issue 2: Industry field shows raw code instead of description**
- The normalizer maps `raw.industry_code` to `industry_code` (line 319)
- But the API may return it as `industrial_code` — the normalizer doesn't try this fallback
- The `useEmployerCodeResolver` resolves `application?.industry_code` correctly via `tb_indus` lookup — this part works
- The **edit form** (`EmployerApplicationEditForm.tsx` line 374) reads `data.industrial_code` but the data has `industry_code` — **field name mismatch** causes the Industry dropdown to appear blank in the meeting edit form
- Fix: Add `raw.industrial_code` fallback in normalizer, and fix the edit form to use `industry_code` (or alias it)

**Issue 3: No users in Schedule Meeting popup**
- `useUsersForOfficeDepartment` queries `profiles` with `office_code` and `department_id` filters — query is correct
- Data exists: 2 active users for STK/Customer Service department
- RLS is disabled on profiles — no policy blocking
- Root cause: The `useMeetingDepartmentsForWorkflow` hook (which feeds office/department dropdowns) requires `workflowId`. The `workflowId` comes from `useWorkflowActions`, which queries `workflow_instances` by `source_record_id`. If the `sourceRecordId` passed is wrong (e.g., `registration_id` is null, falling through incorrectly), the workflow instance lookup fails, returning no `workflowId`, disabling the departments query, and thus no users appear
- Fix: Ensure the `sourceRecordId` passed to `WorkflowActionButtons` uses the correct identifier. Also add `industrial_code` as an alias field so the edit form works

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useEmployerApplicationDetail.ts` | Add fallbacks: `date_acquired` tries `raw.acquisition_date`; `industry_code` tries `raw.industrial_code`; add `industrial_code` alias field to the interface and normalizer |
| `src/pages/online-applications/EmployerApplicationDetailPage.tsx` | Use `application.acquisition_date` as fallback for the Acquisition Date display |
| `src/components/meetings/EmployerApplicationEditForm.tsx` | Fix industry field to read `data.industry_code` with `data.industrial_code` fallback |
| `src/hooks/useWorkflowMeetingDepartments.ts` | Add console logging to `useUsersForOfficeDepartment` for debugging; ensure the query handles edge cases |

### Technical Details

**Normalizer changes** (`normalizeEmployerDetail`):
```
date_acquired: raw.date_acquired || raw.acquisition_date || null
industry_code: raw.industry_code || raw.industrial_code || null  
industrial_code: raw.industrial_code || raw.industry_code || null  // alias for edit form
```

**Detail page** (`EmployerApplicationDetailPage.tsx` line 339):
```
value={formatDate(application.date_acquired || application.acquisition_date)}
```

**Edit form** (`EmployerApplicationEditForm.tsx` line 374):
```
value={data.industrial_code || data.industry_code || ''}
```

**Interface update** (`EmployerApplicationDetail`):
Add `industrial_code: string | null` field alongside existing `industry_code`

