

## Employer Meeting Documents: Upload, Persist, Transfer & Verify

### Problem Summary
1. The **Documents tab** in `EmployerApplicationEditForm` is **read-only** — it only displays API-sourced docs with no upload capability
2. `EmployerApplicationEditForm` does **not receive** `meetingId` or `applicationReference` props, so it cannot use the existing `MeetingDocumentVerificationTab` infrastructure
3. The **conversion process** (`useConvertToEmployerRegistration`) does **not transfer any documents** to the employer registration
4. The **Employer Registration view** (`EmployerRegistrationForm`) has **no Documents tab** at all

### Solution Architecture

Reuse the existing `meeting_uploaded_documents` table and `MeetingDocumentVerificationTab` pattern (already working for IP-Registration) and extend it to Employer-Registration. Create a new `er_application_documents` table for document transfer during conversion.

```text
┌─────────────────────────┐     ┌──────────────────────────┐     ┌─────────────────────────┐
│ External API Docs       │     │ meeting_uploaded_documents│     │ er_application_documents │
│ (read-only from API)    │────>│ (uploads during meeting)  │────>│ (transferred at convert) │
│                         │     │ Storage: employer-documents│    │ Referenced by regno      │
└─────────────────────────┘     └──────────────────────────┘     └─────────────────────────┘
```

### Changes

#### 1. Database Migration — New `er_application_documents` Table

```sql
CREATE TABLE public.er_application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regno VARCHAR(6) NOT NULL,                    -- target employer registration
  source_application_reference TEXT NOT NULL,    -- original online application ref
  doc_code VARCHAR(20),
  document_type VARCHAR(100),
  document_description TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  uploaded_by VARCHAR(50),
  uploaded_by_code VARCHAR(50),
  transferred_at TIMESTAMPTZ DEFAULT now(),
  transferred_by VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_er_app_docs_regno ON public.er_application_documents(regno);
CREATE INDEX idx_er_app_docs_source ON public.er_application_documents(source_application_reference);
```

Also ensure the `employer-documents` storage bucket exists (create if missing).

#### 2. `EmployerApplicationEditForm.tsx` — Replace Read-Only Documents Tab with Upload-Capable Tab

- Add `meetingId` and `applicationReference` as new optional props
- Replace the static Documents tab content with `EmployerMeetingDocumentsTab` — a new component that:
  - Lists documents from the external API (read-only rows)
  - Allows re-upload against each listed document type
  - Persists uploads to `meeting_uploaded_documents` using `employer-documents` storage bucket
  - On revisit, shows previously uploaded docs instead of API placeholders
  - Supports view, download, and re-upload actions

#### 3. `StartMeetingPage.tsx` — Pass Props to Employer Form

Update the `ApplicationEditForm` component to forward `meetingId` and `applicationReference` to `EmployerApplicationEditForm`:

```typescript
if (meetingType === 'Employer-Registration') {
  return <EmployerApplicationEditForm 
    data={data} onChange={onChange} onDataChange={onDataChange}
    meetingId={meetingId} applicationReference={applicationReference} 
  />;
}
```

#### 4. New Component: `EmployerMeetingDocumentsTab.tsx`

A focused document tab component for employer meetings that:
- Fetches external API docs from `data.documents`
- Queries `meeting_uploaded_documents` for previously uploaded overrides
- Merges: if a platform upload exists for a doc type, it takes precedence
- Upload flow: file picker per row → upload to `employer-documents` bucket → insert into `meeting_uploaded_documents` with `is_active=true`, deactivating any prior upload for the same doc type
- View/Download via signed URLs from `employer-documents` bucket
- Audit logging for upload/overwrite actions

#### 5. `useConvertToEmployerRegistration.ts` — Transfer Documents During Conversion

After successful RPC call, add a new step:

```typescript
// Step 6: Transfer meeting documents to er_application_documents
const { data: meetingDocs } = await supabase
  .from('meeting_uploaded_documents')
  .select('*')
  .eq('meeting_id', meetingId)
  .eq('application_reference', resolvedAppRef)
  .eq('is_active', true);

if (meetingDocs?.length) {
  const docInserts = meetingDocs.map(doc => ({
    regno: result.regno,
    source_application_reference: resolvedAppRef,
    doc_code: doc.doc_code,
    document_type: doc.document_type,
    document_description: doc.document_name,
    file_name: doc.file_name,
    file_path: doc.file_path,
    storage_url: doc.storage_url,
    file_size: doc.file_size,
    mime_type: doc.mime_type,
    uploaded_by: doc.uploaded_by,
    uploaded_by_code: doc.uploaded_by_code,
    transferred_by: userCode,
    metadata: doc.metadata,
  }));
  await supabase.from('er_application_documents').insert(docInserts);
}
```

The hook's interface adds optional `meetingId` parameter.

#### 6. `EmployerRegistrationForm.tsx` — Add Documents Tab

Add a new "Documents" tab that:
- Queries `er_application_documents` by `regno`
- Displays all transferred documents with view/download via signed URLs
- Allows further re-upload if needed (inserts new row, deactivates old)

### Files to Modify

| File | Change |
|------|--------|
| Database migration | Create `er_application_documents` table + ensure `employer-documents` bucket |
| `src/components/meetings/EmployerApplicationEditForm.tsx` | Accept `meetingId`/`applicationReference` props, replace read-only Documents tab |
| `src/components/meetings/EmployerMeetingDocumentsTab.tsx` | **New** — upload-capable document tab for employer meetings |
| `src/pages/meetings/StartMeetingPage.tsx` | Forward `meetingId`/`applicationReference` to `EmployerApplicationEditForm` |
| `src/hooks/useConvertToEmployerRegistration.ts` | Add document transfer step after conversion |
| `src/pages/employer-registration/EmployerRegistrationForm.tsx` | Add Documents tab reading from `er_application_documents` |

### Audit & Security
- All upload, overwrite, and transfer actions logged via `logAuditTrail`
- Role-based access enforced at application layer (per project architecture — no RLS)
- Document history preserved: overwrites deactivate previous records (`is_active=false`) rather than deleting

