

## Plan: Make `er_documents` the canonical employer documents table

### Current state (verified)
- **`er_documents`** (Test: 8 rows, Live: 2 rows): correct target — has `is_supportive`, no `is_active`. Currently only the older RPC at `20260415221530` writes here.
- **`er_application_documents`** (Test: 9 rows, Live: 0): currently misused as the primary store. Read by `EmployerRegistrationForm.tsx` lines 64-78, written by latest conversion RPC (`20260407185132`) and the Documents tab re-upload at lines 670-697.
- **No other code references `er_documents`** — that's why the Documents tab on Employer Registration shows nothing for new conversions: RPC writes to `er_application_documents`, but per requirement should write to `er_documents`.

### Target behavior (per user)
1. **`er_documents`** = canonical employer documents (transferred from online application + any future direct uploads on Employer Registration).
2. **`er_application_documents`** = override layer used **only when** a user re-uploads a document on the Online Employer Application screen to replace what came from the external API (before conversion).

### Fix (single migration + two file edits)

#### A. Database — one new migration
**File:** `supabase/migrations/<ts>_employer-docs-canonical-er_documents.sql`

1. **Add columns missing on `er_documents`** to support the conversion + audit + re-upload model:
   - `source_application_reference TEXT` (so we know which online app it came from)
   - `is_active BOOLEAN DEFAULT true` (for re-upload soft-delete)
   - `transferred_at TIMESTAMPTZ`, `transferred_by VARCHAR`
   - `updated_at TIMESTAMPTZ DEFAULT now()` + trigger
   - All `ADD COLUMN IF NOT EXISTS` — idempotent.
2. **Recreate `convert_application_to_employer`** (42-arg signature, body identical to current except the document loop now `INSERT`s into **`er_documents`** with the new columns populated; `is_active=true`, `transferred_at=now()`, `transferred_by=p_entered_by`).
3. **Backfill** rows currently sitting in `er_application_documents` whose `regno` belongs to converted employers, copying them to `er_documents` with `WHERE NOT EXISTS (… file_path match …)` — idempotent. This restores Test data; Live is empty so no-op.
4. **Leave `er_application_documents` intact** (do not drop) — it remains the override-on-upload table for the Online Application screen's future use; existing rows preserved as historical reference.

#### B. Frontend — `src/pages/employer-registration/EmployerRegistrationForm.tsx`
1. **Read** documents from `er_documents` instead of `er_application_documents` (lines 64-78). Filter `.eq('is_active', true)` (column now exists after migration).
2. **Re-upload** in `ERDocumentsTab` (lines 670-697): deactivate + insert into `er_documents` (not `er_application_documents`). Audit `entityType` becomes `'er_documents'`.
3. No prop/shape change for `ERDocumentsTab` — both tables expose the same fields the tab consumes (`id`, `file_name`, `doc_code`, `document_type`, `storage_url`, `file_path`, `source_application_reference`).

#### C. Online Application override (no work needed now)
- The Online Application Documents tab (`EmployerMeetingDocumentsTab` etc.) already operates on the application-side tables, not on `er_application_documents`. No change required for this request.
- We're keeping `er_application_documents` available as the documented "override layer" for any future enhancement that lets users replace API-supplied docs on the application side; today no UI writes there from the application side, so behavior stays as-is.

### Why this is safe
- All DDL guarded with `IF NOT EXISTS` / `IF EXISTS`; safe to re-run on Test & Live.
- Backfill uses `WHERE NOT EXISTS` on `(regno, file_path)`.
- `er_application_documents` is **not dropped**, so any historical reference (and the future override use-case) remains intact.
- RPC signature unchanged → no client-side breakage anywhere else.
- Storage bucket (`employer-documents`) unchanged → existing signed-URL flow keeps working.

### Verification
1. Accept a new Online Employer Application → toast `documents_added: N`. New `er_master.regno` → Documents tab on `/employer-registration/view/<regno>` lists every transferred file with working View / Download.
2. `SELECT COUNT(*) FROM er_documents WHERE regno=<new>` matches `documents_added`.
3. Re-upload a document on the Documents tab → old row `is_active=false`, new row `is_active=true`, both in `er_documents`. Audit trail entry `entityType='er_documents'`.
4. Existing employers T00008 / T00009 (Test) Documents tab now lists the backfilled rows.
5. Re-running the migration is a no-op.
6. Online Application Documents tab continues to function (untouched).

### Files
- **Create:** `supabase/migrations/<ts>_employer-docs-canonical-er_documents.sql`
- **Edit:** `src/pages/employer-registration/EmployerRegistrationForm.tsx` (table name in 3 spots + audit `entityType` in 2 spots)
- **Memory update:** `mem://features/online-applications/conversion-and-detail-standards` — add note "Employer documents canonical table = `er_documents`. `er_application_documents` reserved for online-application override-on-upload."

