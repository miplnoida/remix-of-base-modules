# Compliance Classic — Evidence Management (Add / List / Edit)

## Current state (verified)

- **List page exists but is read-only:** `src/pages/compliance/inspections/InspectionEvidencePage.tsx` (route `/compliance/inspections/evidence`, wired in `Routes.tsx`, `AppRoutes.tsx`, and the sidebar under Inspections → Evidence). It only queries `ce_inspection_evidence`, with no Attach / Edit / Delete controls.
- **Backend write path already exists:** `src/services/fieldAuditService.ts` has `uploadEvidence`, `updateEvidenceDescription`, and `deleteEvidence` targeting `ce_inspection_evidence` and the `documents` storage bucket.
- **Inspector mobile flow** (`src/pages/inspector/EvidenceDialog.tsx`) is a stub that only toasts — no real upload.
- **Inspection workspaces** (`EmployerVisitWorkspace`, `AuditVisitWorkspace`) do not surface an evidence panel for desktop staff.

So the gap the user reports is real: nowhere in Compliance Classic can a user add, edit, or delete an evidence record after a company visit.

## Scope

Presentation/UI only (per module rule: business logic already exists in `fieldAuditService`). No new tables, no new RPCs.

## What to build

### 1. Extend the Inspection Evidence register (`InspectionEvidencePage.tsx`)

- Add an **"Attach Evidence"** button (top-right of the page header), permission-gated by `manage_compliance`.
- Add per-row action menu: **Edit description/type**, **Delete** (soft-remove via existing service; confirm dialog).
- Include an Inspection filter (autocomplete on `ce_inspections.inspection_number` / `employer_name`) so uploads can be attached to a specific inspection without opening it.

### 2. New `EvidenceUploadDialog` (compliance)

Location: `src/pages/compliance/inspections/EvidenceUploadDialog.tsx`.

Inputs:
- Inspection (required, searchable select of open inspections; pre-filled when opened from a workspace).
- Finding (optional, filtered by inspection).
- Evidence type: `DOCUMENT | PHOTO | PAYROLL | SIGNED_SHEET | NOTE | OTHER`.
- File (single, ≤ 25 MB; accepts image/*, pdf, doc/xls). "NOTE" allows description-only, no file.
- Description (optional textarea).
- Optional GPS lat/lng (auto-filled from browser `geolocation` if user grants access; editable).

Flow:
1. Upload file to `documents` bucket under `compliance/evidence/{inspection_id}/{uuid}-{filename}` using existing pattern from `fieldAuditService.uploadEvidence`.
2. Insert row into `ce_inspection_evidence` (captured_at = now, captured_by = current user).
3. Invalidate `['ce-evidence-list']` query.

### 3. New `EvidenceEditDialog`

Location: `src/pages/compliance/inspections/EvidenceEditDialog.tsx`.

Editable fields: `evidence_type`, `description`, `finding_id` (rebind to another finding within same inspection). File itself is immutable (delete + re-upload to replace).

### 4. Wire evidence into inspection detail workspaces

- `EmployerVisitWorkspace.tsx` and `AuditVisitWorkspace.tsx`: add an **Evidence** tab/section listing rows for that inspection with the same Attach/Edit/Delete controls (reuses the dialogs from steps 2–3 with `inspectionId` pre-filled).

### 5. Permissions

Reuse existing `manage_compliance` legacy permission on all controls (matches the current list page and menu item). No new permission key needed; per project rule this is a UI addition to an already-registered capability.

## Technical notes

- All Supabase writes go through `fieldAuditService` (already handles storage upload, row insert, and error surfacing). Extend it only if a missing helper is discovered (e.g., a rebind-finding helper) — otherwise call existing functions.
- Use `useMutation` + `queryClient.invalidateQueries(['ce-evidence-list'])` for cache refresh.
- Show file size / type icons in the list; keep the "Open" external-link action.
- Respect feature flag `compliance.inspection.evidence` — controls hide when off (already gated at page level).
- No changes to `Routes.tsx`, `AppRoutes.tsx`, sidebar, migrations, or permissions registry.

## Out of scope

- Mobile inspector `EvidenceDialog` stub (separate track).
- Bulk upload / ZIP import.
- New audit-log tables (existing triggers on `ce_inspection_evidence` already log changes).

## Files to add / edit

```text
edit  src/pages/compliance/inspections/InspectionEvidencePage.tsx
add   src/pages/compliance/inspections/EvidenceUploadDialog.tsx
add   src/pages/compliance/inspections/EvidenceEditDialog.tsx
edit  src/pages/compliance/employers/EmployerVisitWorkspace.tsx   (add Evidence section)
edit  src/pages/compliance/audit-planning/AuditVisitWorkspace.tsx (add Evidence section)
edit  src/services/fieldAuditService.ts                           (only if a helper is missing)
```

## Acceptance

1. From `/compliance/inspections/evidence`, a `manage_compliance` user can Attach evidence to any inspection, and the new row appears in the list without reload.
2. Same user can Edit type/description/finding-binding and Delete an evidence row (with confirm), and the storage object is removed.
3. From an Employer Visit or Audit Visit workspace, the Evidence section shows all evidence for that inspection and supports the same three actions.
4. Feature flag `compliance.inspection.evidence = false` still hides the register page and all new controls.
