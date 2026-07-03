# EPIC-08 — Legal Document Automation & Correspondence

**Status:** Delivered · v1.0 · 2026-07-03
**Scope:** Enterprise document generation for Legal V1, reusing existing template registry, DMS and legal master data. No changes to Legal V1 business logic.

## Objectives

Give Legal officers, reviewers and administrators a single workspace to:

1. Discover approved LEGAL templates from `core_template`.
2. Generate DOCX + PDF documents from real matter data (no mock data).
3. Move each generated document through the lifecycle
   **Draft → Pending Approval → Approved → Issued → Dispatched → Acknowledged**.
4. Audit every step to the shared timeline (`lg_case_activity`).

## Route & Menu

| Item | Route | Guard |
|------|-------|-------|
| Legal Documents Workspace | `/legal/lg/documents` | `LegalRouteGuard` (`view`) + page-level `viewLegalDocuments` |
| Template Registry (existing) | `/legal/admin/template-registry` | `canManageTemplates` |

Sidebar: **Legal Management → Legal Administration** now exposes *Document Automation*, *Template Registry*, *Generated Documents*, *UAT Documents*.

## Template Library

Every template lives in `core_template` (`module_code='LEGAL'`, `is_active=true`). The workspace shows the following business categories out of the box:

- Court Order · Judgment · Demand Notice · Breach Notice · Consent Order · Settlement Agreement · Appeal Notice · Enforcement Notice · Court Filing Cover · External Counsel Instruction · Legal Cost Notice · Closure Letter

Add or edit templates via the existing `LegalTemplateEditor` — no changes required for EPIC-08.

## Merge Fields

`buildMatterContext(lgCaseId)` in `src/services/legal/lgDocumentAutomationService.ts` merges tokens from:

| Group | Tokens |
|-------|--------|
| matter | `matter.case_no`, `matter.court_case_no`, `matter.stage`, `matter.status` |
| court / judge | `court.name`, `court.venue`, `judge.code` |
| parties / employer | `employer.account_no` |
| financial rollup | `financial.total_outstanding`, `financial.total_paid`, `financial.total_assessed` (from `v_lg_case_financials`) |
| scheduling | `hearing.next_date` |
| officer | `officer.assigned_id` |
| dates | `date.today` |

Tokens use `{{group.field}}` syntax. Unknown tokens render as empty strings.

## Lifecycle & Storage

Extended `public.lg_document_link` (EPIC-08 migration) with:

```
template_code, template_id,
lifecycle_status  ('draft'|'pending_approval'|'approved'|'issued'|'dispatched'|'acknowledged'|'failed'),
generated_by/at, approved_by/at, issued_by/at, dispatched_by/at, dispatch_channel,
acknowledged_by/at, render_error
```

DOCX rendered via `docx@^9`, PDF via `jspdf@^4`. Files are streamed to the browser on generate (no server-side storage bucket required for MVP). The `lg_document_link` row is the durable ledger.

## Audit & Timeline

Every action inserts an `lg_case_activity` row via `auditEvent()`:

| Transition | activity_type |
|------------|--------------|
| Generated | `DOCUMENT_GENERATED` |
| Submitted | `DOCUMENT_SUBMITTED_FOR_APPROVAL` |
| Approved | `DOCUMENT_APPROVED` |
| Issued | `DOCUMENT_ISSUED` |
| Dispatched | `DOCUMENT_DISPATCHED` |
| Acknowledged | `DOCUMENT_ACKNOWLEDGED` |
| Failed | `DOCUMENT_FAILED` |

## Permissions

New `LgCapability` values (see `useLgAccess.ts`):

| Capability | LG_READ_ONLY | LG_LEGAL_ASSISTANT | LG_CASE_HANDLER | LG_REVIEWER | LG_APPROVER | LG_ADMIN |
|------------|:-:|:-:|:-:|:-:|:-:|:-:|
| viewLegalDocuments | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| generateLegalDocument |  | ✓ | ✓ | ✓ | ✓ | ✓ |
| approveLegalDocument |  |  |  |  | ✓ | ✓ |
| issueLegalDocument |  |  |  |  | ✓ | ✓ |
| manageLegalTemplates |  |  |  |  |  | ✓ |

SYSTEMADMIN / LEGALADMIN inherit all via `useLgAccess()` admin bypass.

## Workspace Tabs

`/legal/lg/documents` renders six tabs:

1. **Templates** — pick a template, paste matter ID, generate DOCX+PDF.
2. **Generated Documents** — full history.
3. **Pending Approval** — Reviewer/Approver queue.
4. **Issued Documents** — post-approval, awaiting dispatch/ack.
5. **Dispatch Log** — dispatched items.
6. **Failed / Missing Templates** — render errors + templates without matching `core_template` rows.

## Integration Points

- **Matter Workspace:** existing `LegalCaseDocumentsTab` continues to render `lg_document_link` rows for a case; automation-generated documents surface automatically.
- **Judicial (Orders/Hearings/Appeals/Enforcement):** generate a document with the relevant FK (`hearing_id`, `order_id`, `settlement_id`) passed to `generateDocument()` for context linkage.

## Acceptance Checklist

- [x] Documents generate from real Legal data (no mock data).
- [x] Missing template shows clean workspace message.
- [x] PDF + DOCX downloads work in-browser.
- [x] Every document row is FK-linked to `lg_case` and surfaced on the timeline via `lg_case_activity`.
- [x] Permission guard active at both route (`LegalRouteGuard`) and action (`useLgAccess().can`) levels.
- [x] `bunx tsgo --noEmit` clean.

## Known Limitations (post-MVP backlog)

- Storage bucket upload of rendered blobs is not wired — files download client-side. Add `supabase.storage.upload` + persist `storage_ref` to complete the DMS handoff.
- Dispatch channel picker is single-select client-side; no email/postal integration in this epic.
- Failed-template detection currently lists rows where `render_error IS NOT NULL`; batch validation across `lg_stage_template_mapping` will be added in a future audit script.

---

## EPIC-08A — Stabilization Addendum (2026-07-03)

### Storage
Rendered DOCX + PDF are uploaded to the private Supabase Storage bucket
**`legal-documents`** at `${lg_case_id}/${timestamp}_${code}_${caseShort}.{pdf|docx}`.
Downloads are served via short-lived signed URLs (`getSignedDownloadUrl`, 5 min TTL).
The primary `storage_ref` on `lg_document_link` points to the PDF; the DOCX
sibling shares the same path prefix.

### Schema additions (`lg_document_link`)
`dispatch_recipient`, `dispatch_recipient_address`, `dispatch_status`,
`dispatch_failure_reason`, `acknowledgement_status`, `cancelled_at`,
`cancelled_by`, `cancellation_reason`. Existing columns already covered
storage (`storage_provider`, `storage_ref`, `file_name`, `mime_type`,
`size_bytes`) and dispatch channel/actor timestamps.

### Lifecycle
`draft → pending_approval → approved → issued → dispatched → acknowledged`
plus terminal `failed` and `cancelled`. Every transition audits a
`lg_case_activity` row (`DOCUMENT_*`), including a new `DOCUMENT_CANCELLED`
event.

### Dispatch tracking
The workspace opens a **Record Dispatch** dialog when moving an *Issued*
document to *Dispatched*, capturing channel, recipient, and
address/email. `dispatch_status` defaults to `sent`; failure paths write
`dispatch_failure_reason`.

### Template audit
New **Template Audit** tab (and `runTemplateAudit()` service) reports every
required legal template code (`REQUIRED_LEGAL_TEMPLATE_CODES`) as
`mapped | inactive | missing`, plus per-code render-failure counts sourced
from `lg_document_link.render_error`.

### Matter integration
Because rows are still written to `lg_document_link` with `lg_case_id`,
generated docs continue to appear in:
- Matter Workspace → Documents tab (`LegalCaseDocumentsTab`)
- Matter Workspace → Timeline (via `lg_case_activity DOCUMENT_*`)
- Document Automation workspace → Generated / Pending / Issued / Dispatch / Failed tabs

### Remaining gaps
- Real email/postal delivery integration (dispatch record is manual).
- DOCX download endpoint currently exposes the PDF path; add a second
  `storage_ref_docx` column if both variants must be linked in one row.
