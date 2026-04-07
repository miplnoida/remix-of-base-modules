

## Standardize Employer Document Flow to Match IP Flow Reliability

### Problem Summary

The IP and Employer document flows have three critical discrepancies:

| Issue | IP Flow | Employer Flow |
|-------|---------|---------------|
| **External API docs during conversion** | Merged into `p_documents` and inserted atomically inside `convert_application_atomic` RPC | **Lost** — only meeting uploads are transferred post-RPC |
| **Atomicity** | Documents inserted inside the same DB transaction as `ip_master` | Non-atomic — client-side insert after RPC completes; errors silently swallowed |
| **View/Download of external docs** | Routes through `document-proxy` edge function (blob streaming) | Opens external URL directly via `window.open()` — fails on expired signed URLs |

### Fix — Three Changes

#### 1. Database Migration: Upgrade `convert_application_to_employer` RPC

Drop and recreate the RPC with a new `p_documents_json TEXT DEFAULT '[]'` parameter. Inside the same transaction that creates `er_master`, `er_owner`, `er_locations`, and `er_notes`, the function will:

- Parse the documents JSON array
- Iterate and insert each row into `er_application_documents` (keyed by the new `regno`)
- Return a `documents_added` count in the result
- If any document insertion fails, the entire transaction rolls back — matching the IP flow

The document JSON carries both external API documents and meeting-uploaded documents, merged client-side before calling the RPC.

#### 2. Code Change: Update `useConvertToEmployerRegistration.ts`

Add a `buildEmployerDocumentsForConversion()` function modeled on the IP flow's `buildDocumentsForConversion()`:

- Takes external `applicationData.documents` array from the API
- Fetches active `meeting_uploaded_documents` for the meeting (if `meetingId` provided)
- Merges them with meeting docs taking precedence (dedup by document type/code)
- Maps each to RPC format: `file_name`, `file_path`, `storage_url`, `document_type`, `doc_code`, `mime_type`, `file_size`, `uploaded_by`, `uploaded_by_code`, `is_supportive`, `metadata`
- Passes the merged JSON as `p_documents_json` to the RPC call
- Removes the existing post-RPC document transfer block (currently lines ~191-233) since documents are now handled inside the transaction
- If the RPC returns `success: false` due to document failure, the conversion is treated as failed — no silent skipping

#### 3. Code Change: Fix Document View/Download with Proxy

**`EmployerMeetingDocumentsTab.tsx`**: Update `handleDocAction` to:
- For **platform** docs (uploaded via UI): continue using `createSignedUrl` from `employer-documents` bucket
- For **external** docs (from API): call the `document-proxy` edge function with `action: 'stream'` or `'download'`, create a blob URL, and open/download it
- Add per-row loading state to show a spinner while fetching

**`EmployerApplicationEditForm.tsx`**: Update the fallback `handleDocAction` (around lines 246-281) with the same proxy pattern for external documents.

**`document-proxy/index.ts`**: Add the project's own Supabase storage origin to `allowedOrigins` so platform-uploaded docs can also be proxied if needed.

### Files to Modify

| File | Change |
|------|--------|
| Database migration | Drop and recreate `convert_application_to_employer` with `p_documents_json` parameter; insert into `er_application_documents` inside the transaction |
| `src/hooks/useConvertToEmployerRegistration.ts` | Add `buildEmployerDocumentsForConversion()`; pass docs to RPC; remove post-RPC transfer block |
| `src/components/meetings/EmployerMeetingDocumentsTab.tsx` | Replace direct URL opening with `document-proxy` calls for external docs; add loading state |
| `src/components/meetings/EmployerApplicationEditForm.tsx` | Update fallback `handleDocAction` to use `document-proxy` for external docs |
| `supabase/functions/document-proxy/index.ts` | Add project storage origin to `allowedOrigins` |

### Result

After these changes:
- Both IP and Employer flows merge external API + meeting-uploaded documents before conversion
- Both insert documents atomically inside the RPC transaction — no silent data loss
- Both use `document-proxy` for reliable document viewing/downloading regardless of URL expiry
- The conversion result includes `documents_added` count for audit/verification

