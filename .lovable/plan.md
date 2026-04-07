

## Fix: Storage RLS Policies for `employer-documents` Bucket

### Root Cause

The `employer-documents` storage bucket was created but **no RLS policies** were added to `storage.objects` for it. Supabase Storage always has RLS enabled on `storage.objects`, so any upload/update/delete attempt by an authenticated user is blocked with "new row violates row-level security policy."

The existing `ip-documents` bucket works because it has explicit policies (visible in the query results). The `employer-documents` bucket needs the same treatment.

### Fix — Single Migration

Add four policies on `storage.objects` for the `employer-documents` bucket, matching the pattern used by `ip-documents` and `audit-attachments`:

```sql
-- INSERT (upload)
CREATE POLICY "Authenticated users can upload employer documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'employer-documents');

-- SELECT (read/download)
CREATE POLICY "Authenticated users can read employer documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'employer-documents');

-- UPDATE (overwrite)
CREATE POLICY "Authenticated users can update employer documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'employer-documents');

-- DELETE
CREATE POLICY "Authenticated users can delete employer documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'employer-documents');
```

### Files

| Item | Change |
|------|--------|
| Database migration | Add 4 storage RLS policies for `employer-documents` bucket |

No code changes needed — the upload logic in `EmployerMeetingDocumentsTab.tsx` is already correct; it just needs the storage layer to permit writes.

