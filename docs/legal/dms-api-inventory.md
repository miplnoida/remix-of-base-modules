# DMS API Inventory — Legal Module Integration

Phase 1 deliverable: full audit of every DMS service / API surface used by the platform and what Legal can rely on.

Generated: 2026-06-22

## Architectural summary

- **Central DMS**: External REST service (`https://dmsservice.digitalnoticeboard.biz`), configured via `api_settings.setting_key = 'dms_service'` (also mirrored in `core_dms_provider`). Auth header: `X-Dms-Secret-Key`.
- **Server boundary**: All write traffic goes through the `core-dms-upload` edge function. Read traffic uses `document-proxy` (stream/download).
- **Catalog**: `core_dms_document_type` (per-module type codes) + `core_dms_module_mapping` + `core_dms_storage_policy`.
- **Generated documents**: `core_generated_document` rows hold HTML body; `dms_*` columns track upload state.
- **Legal link table**: `lg_document_link` is the canonical join between an `lg_case` and a DMS document (it never stores file bytes; only `dms_document_id` / `dms_file_id` / `dms_url`). Includes `hearing_id`, `order_id`, `settlement_id`, `notice_id`, `version_no`, `court_filed`, `confidential`, `upload_status`.

## API / method inventory

| Method / API | Purpose | Input | Output | Used by | Status | Notes / Gaps |
|---|---|---|---|---|---|---|
| `coreDmsService.uploadGenerated()` | Push a `core_generated_document` HTML body to DMS and (optionally) create an `lg_document_link`. | `{ generated_document_id, user_code, category_id?, link? }` | `{ success, dms_document_id, dms_file_id, dms_url, link_id }` | `coreTemplateDispatcherService`, `useDmsTransfer*` | ✅ Implemented | Idempotent (skips when `dms_upload_status='COMPLETE'`). |
| `coreDmsService.uploadFile()` | Upload arbitrary bytes (user-selected file) → DMS, link to entity. | `{ file, file_name, mime_type, user_code, link? }` | Same as above. | `UploadCaseDocumentDialog` | ✅ Implemented | Base64 → multipart/form-data. |
| `coreDmsService.getDownloadUrl()` | Build a download URL to the external DMS file endpoint. | `dmsDocumentId` | `string` | Documents tab | ⚠️ Partial | Returns a *raw* DMS URL that requires the secret header → must be proxied via `document-proxy` for browser use. **Fix added** in Phase 3 (`viewByLink()`). |
| `coreDmsService.searchLegalByEntity()` | Look up linked docs by `lg_case_id`/`hearing_id`/`order_id`/etc. | filter object | `lg_document_link[]` | LegalCaseDocumentsTab | ✅ Implemented | |
| `coreDmsService.linkExistingToLegal()` | Attach an already-uploaded DMS doc to a Legal entity (no re-upload). | `{ dms_document_id, user_code, link }` | inserted link row | (newly wired) | ✅ Implemented | |
| `coreDmsService.markCourtFiled()` | Set `court_filed` + `filed_date` on a link. | `(linkId, filed, date?)` | void | DocumentsTab actions | ✅ Implemented | |
| `coreDmsService.setConfidential()` | Set `confidential` flag on a link. | `(linkId, bool)` | void | DocumentsTab actions | ✅ Implemented | |
| `coreDmsService.validateConfig()` | Smoke check that `api_settings.dms_service` is configured & active. | – | `{ ok, base_url, header_name, reason? }` | Admin → DMS test page | ✅ Implemented | |
| `core-dms-upload` (edge fn) | Server-side upload, multipart push to remote DMS, writes `core_generated_document.dms_*`, optional `lg_document_link` insert, full `api_logs` + `system_audit_trail`. | JSON body | JSON envelope | All upload paths | ✅ Implemented | Auth: Bearer required. |
| `document-proxy` (edge fn) | Authenticated stream / download proxy for restricted external storage URLs. | `{ action, documentUrl, fileName? }` | binary stream | Existing module viewers | ✅ Implemented | Allow-list is currently Supabase origins only; **does not allow `dmsservice.digitalnoticeboard.biz`** — added in Phase 3. |
| `dms-transfer*` (edge fns) | Background retry pipeline (`dms_transfer_queue`) that re-tries failed uploads. | – | – | Cron / manual retry | ✅ Implemented | |
| **Search by title / reference (global)** | Free-text search across DMS-linked Legal documents. | `q` | `lg_document_link[]` | DocumentsTab search box | ❌ Missing | **Added** in Phase 3 → `dmsApiTestService.searchByText()` + `coreDmsService.searchLinks()`. |
| **Get link by id** | Read a single link row with joined `dms_*`. | `linkId` | `lg_document_link` | DocumentsTab row open | ❌ Missing | **Added** → `coreDmsService.getLinkById()`. |
| **Version history** | All versions of the same logical document for a case. | `dms_document_id` | rows | DocumentsTab | ❌ Missing | **Added** → `coreDmsService.getVersionHistory()` (rolls up by `dms_document_id`, increments `version_no` on re-upload). |
| **Unlink** | Remove a Legal ↔ DMS link without deleting the underlying DMS file. | `linkId, user_code` | void | DocumentsTab | ❌ Missing | **Added** → `coreDmsService.unlink()` (also writes `system_audit_trail`). |
| **Archive** | Soft-archive a link (`upload_status='ARCHIVED'`). | `linkId` | void | Admin | ❌ Missing | **Added** → `coreDmsService.archiveLink()`. |
| **Audit lookup** | Read DMS audit events for a link / case. | `linkId | caseId` | rows | Admin DMS test page | ✅ Implemented (existing `system_audit_trail`) | **Added** convenience reader → `coreDmsService.getAuditForCase()`. |
| **Permission check** | Confirm caller can view confidential docs. | – | boolean | DocumentsTab | ❌ Missing | **Added** → `coreDmsService.canViewConfidential()` (delegates to `role_permissions`). |

## Phase 3 — Fixes & additions delivered

1. `coreDmsService` extended with: `getLinkById`, `searchLinks`, `searchByText`, `getVersionHistory`, `unlink`, `archiveLink`, `viewByLink`, `getAuditForCase`, `canViewConfidential`.
2. `document-proxy` allow-list: `dmsservice.digitalnoticeboard.biz` added so Legal previews stop 403'ing.
3. Re-upload of the same logical document now bumps `lg_document_link.version_no` (handled in `coreDmsService.uploadFile` when `link.dms_document_id` is supplied — fallback to 1).
4. **Test harness** — `src/services/core/dmsApiTestService.ts` + `/admin/dms-api-test` page run 15 PASS/FAIL probes end-to-end with auto-cleanup.

## Phase 3 — Test results (run from `/admin/dms-api-test`)

Results are captured live in the page; the table renders `PASS` / `FAIL` per probe with the failing API name, HTTP status, and recommended fix. A green banner appears only when all 15 pass.
