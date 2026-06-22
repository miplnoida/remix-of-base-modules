# Legal ↔ DMS — End-to-End Integration

This document captures the final shape of the Legal ↔ DMS integration after
the 3-turn rollout (inventory, linking model, UI/security/E2E).

## 1. Storage model

- **Files always live in the Central DMS.** Legal never stores file bytes locally.
- **`lg_document_link`** is a *pointer* row that ties a DMS document to a
  legal case + classification + audit context (stage, hearing, order,
  settlement, notice, court-filed status, confidentiality).
- **`core_dms_document_type`** is the central taxonomy. The 49 Legal types
  seeded under `module_code = 'LEGAL'` drive every Type dropdown in the
  Legal UI via `useDmsDocumentTypes('LEGAL')`.

## 2. How a document gets onto a case

| Source | Entry point | What happens under the hood |
|--------|-------------|------------------------------|
| User uploads a file | `UploadCaseDocumentDialog` | `coreDmsService.uploadFile` → `core-dms-upload` edge function → DMS POST + `lg_document_link` insert in one transaction. |
| Letter generated from a template | `AvailableLettersPanel` | `coreTemplateDispatcherService.dispatch({ legal_link })` auto-calls `coreDmsService.uploadGenerated` and writes the `lg_document_link` row. |
| Existing DMS doc referenced | `LinkDocumentDialog` | `lg_document_link` row only — no upload. |
| Cross-case re-link | `coreDmsService.linkExistingToLegal` | New `lg_document_link` row reusing the same `dms_document_id`. |

Every path writes a `system_audit_trail` row with `module = 'Core DMS'`.

## 3. Permissions

The `module_actions` seeded for Legal documents:

| action_code | Purpose |
|-------------|---------|
| `LEGAL_DOCUMENT_VIEW` | List & open non-confidential docs on a case |
| `LEGAL_DOCUMENT_UPLOAD` | Upload a new file into DMS for the case |
| `LEGAL_DOCUMENT_LINK` | Link an already-existing DMS doc to the case |
| `LEGAL_DOCUMENT_UNLINK` | Remove a link (file remains in DMS) |
| `LEGAL_DOCUMENT_CONFIDENTIAL_VIEW` | See and open rows flagged `confidential = true` |
| `LEGAL_DOCUMENT_MARK_COURT_FILED` | Toggle the `court_filed` flag |

Both **Admin** and **Legal Officer** roles receive all six by default.

Confidential gating is enforced client-side in `LegalCaseDocumentsTab`:
rows with `confidential = true` are filtered out, the view action is
short-circuited, and a banner shows the hidden count. The same
`coreDmsService.canViewConfidential(userId)` check should be re-asserted
server-side for any direct downloads added later.

## 4. Test harness

`/admin/dms-api-test` runs `dmsApiTestService.runAll()` — 15 probes that
exercise every method exposed by `coreDmsService` end-to-end against the
configured DMS. The harness seeds a temporary `lg_case`, uploads
documents, runs link/search/versioning/confidential probes, and tears
everything down at the end.

Expected baseline result after Turns A–C: **15 pass, 0 fail, 0 skip**
(only step 12 / `canViewConfidential` may show `allowed: false`
depending on the logged-in user's role).

## 5. Files touched in Turn C

- `src/components/legal/lg/DocumentVersionHistoryDialog.tsx` (new)
- `src/components/legal/lg/LegalCaseDocumentsTab.tsx` — confidential gating, Versions row action, hidden-count banner
- `docs/legal/dms-integration-e2e.md` (this file)
