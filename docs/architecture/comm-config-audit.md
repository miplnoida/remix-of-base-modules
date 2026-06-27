# Communication Configuration Audit (Phase 1)

Audit performed across `core_department_profile`, `core_document_profile`,
`comm_asset_mapping`, `comm_media_asset`, `core_organization`, and the
existing `DocumentAssetsPage`. Drives the Phase 2-12 refactor.

## 1. Field matrix

| Concern | Today lives in | Target owner | Notes |
|---|---|---|---|
| Logo | `core_organization.logo_*`, `core_department_profile.override_logo_asset_id` (text), `comm_asset_mapping` | **Department Profile** (`default_logo_asset_id`) | Org is fallback. Document profile may override. |
| Small logo | none / org | **Department Profile** (`default_small_logo_asset_id`) | New |
| Letterhead | `core_organization`, `comm_letterhead`, `core_department_profile.default_letterhead_id` | **Department Profile** | Existing |
| Header asset | `comm_asset_mapping` only | **Department Profile** (`default_header_asset_id`) | New explicit slot |
| Footer asset | `core_department_profile.default_print_footer_id`, `comm_asset_mapping` | **Department Profile** (`default_footer_asset_id`) | New unified slot |
| Email header / footer | `comm_asset_mapping` | **Department Profile** (`default_email_header_asset_id`, `default_email_footer_asset_id`) | New |
| Watermark | `comm_asset_mapping` | **Department Profile** (`default_watermark_asset_id`) | New |
| Seal | `core_department_profile.override_seal_asset_id` (text), `comm_asset_mapping` | **Department Profile** (`default_seal_asset_id`) | Promoted to FK |
| Stamp | `comm_asset_mapping` | **Department Profile** (`default_stamp_asset_id`) | New |
| Signature | `comm_email_signature`, `comm_asset_mapping` | **Department Profile** (`default_signature_asset_id`) | Visual signature; e-mail signature stays separate. |
| QR | `comm_asset_mapping` | **Department Profile** (`default_qr_asset_id`) | New |
| Disclaimer text | `core_department_profile.default_disclaimer_id` | **Department Profile** | Existing |
| Confidentiality / Privacy / Appeal / Payment text | hard-coded in templates | **Department Profile** (text-block codes) | Reference only — never duplicate text. |
| Primary / Secondary office | `core_department_profile.primary_location_id` (single) | **Department Profile** (`primary_office_location_id`, `secondary_office_location_id`) | Multi-role addressing. |
| Mailing / Physical address | scattered | **Department Profile** (`primary_mailing_location_id`, `primary_physical_location_id`) | Reference to `core_department_location`. |
| Email / Phone / Fax / Website / Office hours | `core_department_profile.contact_email`, `contact_phone`; rest missing | **Department Profile** (`contact_fax`, `contact_website`, `office_hours`) | Phone + email already present. |
| Default communication profile | `core_communication_profile` standalone | **Department Profile** (`default_communication_profile_code`) | New pointer. |
| Print rules / Security rules / Retention / DMS folder | `core_document_profile.config` jsonb | **Document Profile** (typed columns) | Promoted from jsonb. |
| Required assets list | implicit in renderer code | **Document Profile** (`required_assets text[]`) | Drives validation. |
| Signature / Seal / QR / Watermark policy | implicit | **Document Profile** (`*_policy NONE|OPTIONAL|REQUIRED`) | Drives validation. |
| Approval policy | scattered | **Document Profile** (`approval_policy_code`) | Reference only. |
| Output channels | implicit | **Document Profile** (`output_channels text[]`) | EMAIL/PRINT/PDF/SMS/PORTAL/DMS. |
| Document overrides of branding | `comm_asset_mapping` already supports scoping | **Document Profile** via `comm_asset_mapping.communication_type = doc-profile-code` | Reuse existing table — no new override storage. |

## 2. Duplicated fields removed conceptually

| Duplicate today | Refactored as |
|---|---|
| Same logo set on org *and* picked again on every document type | Single Dept default; doc inherits |
| Same footer copy-pasted into receipts, statements, certificates | Single Dept default; doc overrides only when different |
| `override_logo_asset_id` (text) vs new `default_logo_asset_id` (uuid FK) | New typed column is canonical; UI writes only here. Text col retained for legacy backfill, marked deprecated. |
| Branding pickers repeated on Receipt/Statement/Certificate Assets screen | Replaced by resolver grid |

## 3. Tables reused (no master duplication)

- `comm_media_asset` — single source of all binary assets
- `comm_asset_mapping` — single source of scoped overrides
- `core_text_block` — single source of text content
- `core_department_location` — single source of addresses
- `core_organization` — single source of org-level defaults
- `core_communication_profile` — single source of channel profiles

## 4. Tables that stop owning duplicated data

- `core_document_profile.config` jsonb — replaced by typed columns; jsonb retained for forward-compat custom rules only.
- `DocumentAssetsPage` per-slot picker storage — moves into `comm_asset_mapping` keyed by document profile, written through the resolver UI.

## 5. Resolution order (enforced by `assetSlotResolver.ts`)

```
Document Override   (comm_asset_mapping where communication_type = doc-profile-code)
   ↓
Department Profile  (core_department_profile.default_*_asset_id)
   ↓
Organization        (core_organization.*)
   ↓
Approved Global     (comm_media_asset where is_system_default and approval_status='approved')
   ↓
Validation Error    (slot required by document profile but no asset resolved)
```

Archived / rejected / draft / pending assets are filtered out at every step.

## 6. Acceptance checklist (Phase 12)

- [x] Schema separates ownership (migration applied).
- [ ] Resolver implemented (Batch 2).
- [ ] Department Profile UI tabs (Batch 3).
- [ ] Document Profile resolver-grid UI (Batch 4).
- [ ] Where-Used + safe delete (Batch 5).
- [ ] No archived/placeholder assets resolved.
- [ ] `tsgo` build passes.
