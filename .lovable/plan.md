
## Analysis Summary

There are **three separate document components** that share ~80% identical logic:

1. **`ApplicationDocumentsTab`** — Used on `/online-applications/insured-person/:id`. Read-only list of external API documents with view/download via proxy. ~490 lines.
2. **`DocumentVerificationTab`** (IP Registration) — Used on `/ip-registration/view/:id`. Two-step flow (selection → upload) persisting to `ip_application_documents`. ~1233 lines.
3. **`MeetingDocumentVerificationTab`** — Used on `/meetings/start/:id`. Same two-step flow but persists to `meeting_uploaded_documents` and merges external API docs with platform uploads. ~1559 lines.

The IP Registration tab (#2) and Meeting tab (#3) are near-identical in structure: same verification categories, same upload slots logic, same supportive document handling, same UI rendering. The key differences are:
- **Data source**: #2 reads/writes `ip_application_documents` by SSN. #3 reads/writes `meeting_uploaded_documents` by meetingId + applicationReference, plus merges external API docs.
- **Extra features in #3**: doc-type mismatch validation exposed via ref, deactivation on dropdown change, external doc overlay logic, `pendingReupload` tracking.
- **Extra features in #2**: DMS transfer, transfer status badges, application documents table (bottom section).

The `ApplicationDocumentsTab` (#1) is simpler — a flat document list with view/download/delete, no verification workflow.

## Refactoring Plan

### Step 1: Create shared types and constants
**File: `src/components/documents/shared/types.ts`**

Extract common interfaces (`UnifiedDocument`, `VerificationCategory`, upload slot type), constants (`CODES_REQUIRING_SUPPORTIVE`, `SUPPORTIVE_DOC_CODES`, `MAX_FILE_SIZE`, `ACCEPTED_TYPES`, `ACCEPTED_MIME_TYPES`, `EXTERNAL_DOC_TYPE_TO_VERIFY_CODE`, `CATEGORY_TO_VERIFY_TYPE`), and helper functions (`formatSize`, `formatDocDate`, `resolveExternalDocTypeToCode`, `mapExternalDocs`, `mapPlatformDocs`, `mergeDocuments`) that are duplicated across components.

### Step 2: Create a shared document verification hook
**File: `src/hooks/useDocumentVerification.ts`**

Extract the core state management logic into a single hook parameterized by a "persistence adapter" interface:

```text
interface DocumentPersistenceAdapter {
  fetchDocuments(): Promise<UnifiedDocument[]>
  uploadFile(file: File, path: string): Promise<string>  // returns URL
  insertRecord(doc: Record<string, any>): Promise<void>
  deactivateByCategory?(categoryId: string, isSupportive: boolean): Promise<void>
  deleteDocument(docId: string, filePath?: string): Promise<void>
}
```

The hook will manage: verification categories (computed from marital status / death info), verify selections, supportive selections, upload slots, selection errors, upload errors, document list, upload progress, file upload handler, delete handler, and the current step state.

Two adapter implementations:
- **`ipRegistrationAdapter`**: reads/writes `ip_application_documents` filtered by SSN
- **`meetingAdapter`**: reads/writes `meeting_uploaded_documents` filtered by meetingId + applicationReference, plus merges external API docs

### Step 3: Create shared UI components
**File: `src/components/documents/shared/DocumentSelectionStep.tsx`**  
The Step 1 (Document Selection) grid UI — verification category cards with dropdowns, supportive document selectors, auto-select badges. Receives verification categories, selections, errors, verify types, and change handlers as props.

**File: `src/components/documents/shared/DocumentUploadStep.tsx`**  
The Step 2 (Upload Documents) UI — upload slot cards with file inputs, progress bars, uploaded file list with view/download/delete actions, mismatch warnings. Receives upload slots, documents, handlers as props.

**File: `src/components/documents/shared/DocumentPreviewDialog.tsx`**  
The preview modal (image/PDF/other) — shared across all three routes. Already near-identical in all components.

**File: `src/components/documents/shared/DocumentListTable.tsx`**  
The flat document list table UI used by `ApplicationDocumentsTab` and the "Application Documents" bottom section in `DocumentVerificationTab`. Shows icon, name, type badge, size, date, actions (view/download/delete), verification status dropdown.

### Step 4: Refactor `DocumentVerificationTab` (IP Registration)
Rewrite to use the shared hook with `ipRegistrationAdapter` and compose the shared UI components. Keep the DMS transfer and application documents table as IP-Registration-specific additions that layer on top of the shared components. Props interface stays the same so the parent `IPRegistrationForm.tsx` requires no changes.

### Step 5: Refactor `MeetingDocumentVerificationTab`
Rewrite to use the shared hook with `meetingAdapter` and compose the shared UI components. Keep the `forwardRef` + `validateDocTypeMismatch` imperative handle, `pendingReupload` tracking, and external doc overlay as meeting-specific layers. Props interface stays the same so `StartMeetingPage.tsx` requires no changes.

### Step 6: Refactor `ApplicationDocumentsTab`
Rewrite to use `DocumentListTable` shared component for the table rendering. Keep the proxy-based fetch logic. Props stay the same so `ApplicationDetailPage.tsx` and `StartMeetingPage.tsx` require no changes.

### Step 7: Verify persistence on IP Registration route
Ensure that on `/ip-registration/view/:uuid`:
- Documents load from `ip_application_documents` filtered by SSN
- Upload saves to `ip-documents` storage bucket + inserts into `ip_application_documents` with correct `verification_type`, `verification_category`, `document_type`, `file_path`, `url`
- Delete removes from storage + `ip_application_documents`
- Page reload shows persisted documents

### No database changes required
The `ip_application_documents` table already has all needed columns (`verification_type`, `verification_category`, `is_supportive`, `supportive_doc_type`, `doc_code`, `file_path`, `url`, etc.). No schema migration needed.

## Technical Details

### File structure
```text
src/components/documents/shared/
  types.ts           — interfaces, constants, helpers
  DocumentPreviewDialog.tsx
  DocumentSelectionStep.tsx
  DocumentUploadStep.tsx
  DocumentListTable.tsx
src/hooks/
  useDocumentVerification.ts  — shared hook + adapter interface
```

### Adapter pattern
Each route provides its adapter to the hook:

**IP Registration adapter** uses `supabase.from('ip_application_documents')` and `supabase.storage.from('ip-documents')`, keyed by SSN.

**Meeting adapter** uses `supabase.from('meeting_uploaded_documents')` and `supabase.storage.from('ip-documents')`, keyed by meetingId + applicationReference, plus merges external API docs via `mapExternalDocs()`.

### What stays route-specific
- IP Registration: DMS transfer button + eligibility check, transfer status badges, application documents bottom table
- Meeting: `forwardRef` + `validateDocTypeMismatch`, `pendingReupload` state, external doc overlay/merge, replaced categories callback
- Online Application Detail: read-only list, proxy-based blob fetching, no upload capability

### Risk mitigation
- No changes to parent component props — backward compatible
- Both existing routes keep working with identical behavior
- Shared components are purely presentational — logic lives in the hook
- External API document behavior unchanged (proxy fetch, overlay rules)
