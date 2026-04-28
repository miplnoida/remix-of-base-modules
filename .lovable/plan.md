## Goal

When converting an online IP application into an IP registration, the **final document set must be the merged superset** of:

- API documents from the external application
- Reviewer uploads / replacements / deletions captured during the meeting (`ip_application_documents`)

Reviewer-touched documents must always win over the external counterpart. Nothing must be silently dropped, duplicated, or mis-classified, and the conversion must refuse to complete if a mandatory document is missing.

---

## Current state (from investigation)

- `ip_app_docs_resolve` (RPC) already merges external + overrides and drops external rows whose `id` was replaced or deleted via override. **The merge logic is correct in principle** but several gaps cause data loss or misclassification:

  1. **Field-mapping drift external → RPC.** Some external API rows expose `fileSize`/`mimeType` only in camelCase, others in snake_case; current `mapDocToRpcFormat` covers most but loses `mime_type`, `file_size`, and `doc_code` for several real shapes (e.g. external `documentType` carries the doc-code, never copied into `metadata.doc_code`).
  2. **`is_supportive` flag is unreliable.** Reviewer-uploaded "supportive" rows in staging carry `verification_category = 'supportive'` with `is_supportive = false` (verified in DB for IP-REG-2026-402256). After mirror, those rows land in `ip_documents` with `is_supportive=false` and `verification_category='supportive'`, breaking the documents tab grouping.
  3. **No mandatory-document validation.** Conversion proceeds even if a category required by business rules (e.g. birth_status when applicant is < 18 or always for IP) is missing in the merged set.
  4. **No audit trail of merge decisions.** Today there is no record of which documents were carried from the API, which were replaced by a reviewer upload, which were deleted, which were added net-new. The hook only writes a single CONVERSION audit row for `ip_master`.
  5. **External-only fallback can mask reviewer work.** If `ip_app_docs_resolve` errors transiently, `buildDocumentsForConversion` silently falls back to external-only — reviewer uploads would be lost without any signal. This is the regression the user wants prevented.

---

## Fix

### 1. New RPC: `ip_app_docs_resolve_for_conversion(p_application_reference, p_external_docs)`

Returns:
```json
{
  "merged":   [ ... RPC-shaped docs ready for convert_application_atomic ... ],
  "decisions":[ { "source_document_id": "...", "decision": "kept_external|replaced_by_reviewer|reviewer_added|deleted_by_reviewer", "external": {...}, "override": {...} } ],
  "missing_mandatory": [ "birth_status", ... ]
}
```

Logic:

- Load reviewer overrides from `ip_application_documents` for the app_ref (active + deleted).
- For every external doc:
  - If matched by `source_document_id` to a deleted override → emit `deleted_by_reviewer` decision; **exclude** from `merged`.
  - Else if matched to an active override → emit `replaced_by_reviewer`; emit the **override** in `merged`.
  - Else → emit `kept_external`; emit external in `merged`.
- For every active override **without** a matching external (`source_document_id` absent or unmatched) → emit `reviewer_added`; emit override in `merged`.
- Normalize each merged doc to the canonical shape consumed by `convert_application_atomic`:
  - `name`, `fileName`, `documentType`, `verificationType`, `filePath`, `url`, `mimeType`, `fileSize`, `uploadedAt`, `isSupportive`, `supportiveDocType`, `metadata` (preserves `doc_code`).
- Re-derive `isSupportive`:
  - `true` if `verification_category` ∈ {`supportive`} OR `supportive_doc_type` is non-null OR explicit `is_supportive=true`.
- Re-derive `verification_category`:
  - If `verification_category='supportive'`, leave as `supportive` and set `isSupportive=true`.
  - Else map to canonical `_status` value.
- Compute `missing_mandatory` from the configured mandatory verification categories (today: `birth_status`, `name_status`; marital_status only when applicant is married/common-law). Read the rules from `tb_verify` config table — fall back to a hard-coded `{birth_status, name_status}` set if the table is empty.

This RPC supersedes `ip_app_docs_resolve` for the conversion path. The original resolver stays for the document tab UI (read-only merge for display).

### 2. Hook: `useConvertToIPRegistration` becomes strict

- Replace `buildDocumentsForConversion` with a call to the new RPC.
- **No silent fallback**: if the RPC errors, abort the conversion and surface the error (so reviewer uploads can never be skipped). Log to `system_error_logs` (await) just like today's catch block.
- After RPC returns, if `missing_mandatory.length > 0`, abort *before* calling `convert_application_atomic` with a clear message:
  > "Cannot convert: missing mandatory document(s): birth_status, name_status."
- Pass `merged` to `convert_application_atomic` as `p_documents` (unchanged signature).

### 3. Audit trail of merge decisions

Add table `ip_application_doc_merge_audit`:

| column | type |
|---|---|
| id | uuid pk |
| application_reference_number | varchar |
| ssn | varchar |
| unique_uuid | uuid |
| source_document_id | varchar |
| decision | text — kept_external / replaced_by_reviewer / reviewer_added / deleted_by_reviewer |
| before_snapshot | jsonb (external row, if any) |
| after_snapshot | jsonb (chosen row, if any) |
| created_by | uuid |
| created_at | timestamptz default now() |

Conversion path inserts one row per decision inside `convert_application_atomic` (added as a new step right before the staging insert), using the `decisions` array passed in via a new parameter `p_doc_decisions jsonb`. The hook supplies `p_doc_decisions` from the resolver result.

### 4. Mirror correctness in `convert_application_atomic`

The mirror block (currently a single `INSERT … SELECT` from `ip_application_documents`) is preserved, with two small corrections:

- `is_supportive` derivation: `COALESCE(iad.is_supportive, FALSE) OR iad.verification_category = 'supportive' OR iad.supportive_doc_type IS NOT NULL`.
- `doc_code` already pulled from `metadata->>'doc_code'` — keep, but also fall back to first character of `document_type` when `metadata.doc_code` is null and `document_type` is a single character.

### 5. Field mapping hardening (client side)

`mapDocToRpcFormat` widened to also pick up:

- `metadata.doc_code` (overrides) and `documentType` first-char (external) into a top-level `docCode`.
- `mimeType` from `mime_type`, `mimetype`, or content sniffed from extension.
- `fileSize` always coerced to numeric string (avoids `~ '^\d+$'` regex rejecting the value in the staging insert).

### 6. Tests / scenarios verified before sign-off

1. **API-only**: external = 3 docs, overrides = 0 → `merged.length=3`, all `kept_external`, all mirrored.
2. **Reviewer-only**: external = 0, overrides = 2 → all `reviewer_added`, both mirrored.
3. **Overlap (replace)**: external doc `X`, reviewer uploaded a new file for the same `source_document_id` → `replaced_by_reviewer`, only reviewer version in `ip_documents`, no duplicate.
4. **Reviewer deletion**: external doc `Y`, reviewer marked deleted → `deleted_by_reviewer`, NOT mirrored to `ip_documents`.
5. **No overlap**: external `[A,B]`, reviewer `[C]` → 3 in merged, 3 in master.
6. **Missing mandatory**: external + overrides together do not cover `birth_status` → conversion refused with a clear toast and an entry in `/system-logs/errors`.
7. **Resolver failure**: simulate RPC error → conversion aborts, no partial write, error logged.
8. Document tab UI for the converted IP shows all merged docs and view/download works for both storage paths and signed URLs (no change required — `ip_documents` already powers that view).

---

## Files to change

- **New migration** — adds `ip_app_docs_resolve_for_conversion`, table `ip_application_doc_merge_audit`, and updates `convert_application_atomic` to (a) accept `p_doc_decisions jsonb`, (b) insert merge-audit rows, (c) tighten `is_supportive` / `doc_code` derivation in the mirror.
- **`src/hooks/useConvertToIPRegistration.ts`** — call the new RPC, abort on resolver error, abort on `missing_mandatory`, pass `decisions` through to `convert_application_atomic`, harden `mapDocToRpcFormat`.
- No client UI changes; `useApplicationDocuments` (meeting screen) keeps using the existing `ip_app_docs_resolve` for read-only merge display.

## Out of scope

- Employer (ER) conversion path — same pattern applies but is a separate change.
- Re-architecting `ip_documents` columns (already aligned in the previous fix).
- DMS upload retry — already handled by `dms-transfer-retry` edge function.
