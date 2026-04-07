

## ✅ Completed: Standardize Employer Document Flow to Match IP Flow Reliability

### Changes Made

| File | Change |
|------|--------|
| Database migration | Dropped and recreated `convert_application_to_employer` with `p_documents_json TEXT DEFAULT '[]'` parameter; inserts into `er_application_documents` atomically inside the transaction; returns `documents_added` count |
| `src/hooks/useConvertToEmployerRegistration.ts` | Added `buildEmployerDocumentsForConversion()` and `mapDocToRpcFormat()` — merges external API + meeting-uploaded docs with dedup; passes JSON to RPC; removed post-RPC document transfer block |
| `src/components/meetings/EmployerMeetingDocumentsTab.tsx` | External docs now routed through `document-proxy` edge function (blob streaming); added per-row loading state |
| `src/components/meetings/EmployerApplicationEditForm.tsx` | Fallback `handleDocAction` updated to use `document-proxy` for external docs with graceful fallback |
| `supabase/functions/document-proxy/index.ts` | Added project's own Supabase storage origin (`xynceskeiiisiefqlgxo.supabase.co`) to `allowedOrigins` |
