# Documents & Notices — Phase 9

## Documents

Managed through `lg_document_link` which references the central DMS. Screens:

- **Case 360 → Documents tab** (`LegalCaseDocumentsTab`) — upload
  (`UploadCaseDocumentDialog`), link existing DMS record
  (`LinkDocumentDialog`), preview via `document-proxy` edge function.
- Metadata captured: document type, confidentiality, evidence flag, version,
  linked entity (case / hearing / order / settlement / notice).
- All uploads mirror to the DMS transfer queue with retry — see
  [`dms-integration-e2e.md`](./dms-integration-e2e.md).
- Registry view lives at `/legal/documents` (`DocumentCenter`) with
  `LgDataGrid`, filter by type / evidence / linked entity.

## Notices

- Types: `DEMAND_LETTER`, `HEARING_NOTICE`, `PAYMENT_DEFAULT_NOTICE`,
  `SETTLEMENT_LETTER`.
- Lifecycle: `DRAFT → PENDING_APPROVAL → APPROVED → DISPATCHED → DELIVERED`.
- Templating via `core_template` — SSB branding tokens
  (`{{sksbn.logo}}`, `{{department.address}}`) resolved at render; no
  hardcoded logos or addresses.
- Approval required by `canApproveLetter`. Dispatch mirrors PDF into
  `lg_document_link` and writes an `lg_case_activity` entry
  (`NOTICE_DISPATCHED`).
- Delivery events (email/SMS/portal) update `lg_notice.delivered_at`.

## Permissions

| Action | Capability |
|--------|------------|
| Upload document | `canUploadDocument` |
| Draft notice | `canDraftLetter` |
| Approve notice | `canApproveLetter` |
| Dispatch notice | `canApproveLetter` |
| Delete / supersede | `canApproveClosure` |
