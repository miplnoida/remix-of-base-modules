# Refactor: Department Profile + Document Profiles

A 12-phase refactor to eliminate duplication between Department Profile and "Receipt / Statement / Certificate Assets", establish a single Communication Resolver, and make every module (Legal, Benefits, Compliance, Finance, HR…) consume the same inheritance chain.

This is a large, multi-day change touching schema, resolvers, two admin screens, validation, preview, and "Where Used". I'll execute it in sequenced batches so the build stays green at every step.

---

## Architecture (target state)

```text
Organization Profile  (core_organization)
        ↓ inherits
Department Profile    (core_department_profile)   ← OWNS department comms defaults
        ↓ inherits
Document Profile      (core_document_profile)     ← OWNS document behaviour
        ↓ override
Generated Document    (resolved at render time)
```

Resolution order for every asset / text block / signature:

```text
Document Override → Department Profile → Organization Profile → Approved Global Asset → Validation Error
```

Archived / unapproved / placeholder assets are never resolved.

---

## Phase 1 — Audit (deliverable: `docs/architecture/comm-config-audit.md`)

Per-field matrix across `core_department_profile`, `comm_asset_mapping`, `DocumentAssetsPage` spec and `core_document_profile`:

- Duplicated fields (logo / header / footer / seal / signature appearing in both)
- Department-only fields (contacts, office hours, primary office, legal text blocks)
- Document-only fields (print rules, retention, DMS folder, signature/seal/QR policy, output channels)
- Fields to convert to "inherited" (remove explicit storage on document profile when same as dept)
- Tables reused vs tables that stop owning duplicated data

No schema change yet — pure audit.

## Phase 2 — Department Profile becomes owner

Schema additions on `core_department_profile` (only what isn't already there):

- `default_letterhead_id`, `default_header_asset_id`, `default_footer_asset_id`
- `default_logo_asset_id`, `default_small_logo_asset_id`
- `default_email_header_asset_id`, `default_email_footer_asset_id`
- `default_watermark_asset_id`, `default_seal_asset_id`, `default_stamp_asset_id`
- `default_signature_id`, `default_qr_asset_id`
- `primary_office_location_id`, `secondary_office_location_id`
- `primary_mailing_location_id`, `primary_physical_location_id`
- `disclaimer_text_block_code`, `confidentiality_text_block_code`, `privacy_notice_text_block_code`, `appeal_rights_text_block_code`, `payment_instructions_text_block_code`
- `default_communication_profile_code`

All FKs reference existing masters — no text or address is duplicated.

Refactor `DepartmentProfilePage.tsx` into tabs: Identity · Communication · Contacts · Office · Legal Defaults · Default Communication Profile. All asset pickers use `LookupSelect` filtered to `approval_status='approved'` and the correct category.

## Phase 3 — Document Profiles (rename target)

Rename the screen conceptually to **Document Profiles**. Schema on `core_document_profile`:

- `document_type`, `description`, `communication_profile_code`
- `print_rules` jsonb, `security_rules` jsonb, `retention_days`, `dms_folder`
- `required_assets` text[] (slot codes)
- `signature_policy`, `seal_policy`, `qr_policy`, `watermark_policy` (NONE | OPTIONAL | REQUIRED)
- `approval_policy_code`, `output_channels` text[]

Document Profile stores **behaviour and overrides only** — never raw branding.

## Phase 4 — Asset Resolution UI

Replace the current "No asset bound" rows with a **Resolver Grid** component:

| Asset Slot | Resolved Asset | Inherited From | Status | Override | Where Used | Validation |

Driven by a new `resolveAssetSlot(slot, { documentProfileId, departmentId, organizationId })` returning `{ asset, source: 'DOCUMENT'|'DEPARTMENT'|'ORGANIZATION'|'GLOBAL', isFallback }`.

## Phase 5 — Override behaviour

Each row: **Use Inherited · Override · Reset to Inherited**. Overrides write `comm_asset_mapping` scoped to the document profile; inherited rows store nothing.

## Phase 6 — Resolution order

Single implementation in `src/lib/enterprise/resolvers/assetSlotResolver.ts`. Excludes `approval_status IN ('archived','rejected','draft','pending_approval')`. Used by Receipts, Statements, Certificates, Letters, Notices, Templates and all future modules.

## Phase 7 — Live Preview

`DocumentProfilePreview.tsx` renders header, body, signature, seal, footer, watermark, text blocks using only the resolver output. Every block has a tooltip showing source layer.

## Phase 8 — Dynamic per-document rules

Seed Document Profiles with required-asset lists:

- RECEIPT → logo, qr, footer
- CERTIFICATE → logo, seal, signature, qr, watermark
- LEGAL_NOTICE → logo, header, footer, signature
- EMPLOYER_STATEMENT → logo, header, footer, watermark

Rules live on `core_document_profile.required_assets` — not on Department Profile.

## Phase 9 — Validation

Resolver returns `warnings[]` and `errors[]`. UI badge per row: ✅ Resolved · ⚠ Missing optional · ⛔ Required missing · ⛔ Archived asset. Generation is blocked when any `errors[]` non-empty.

## Phase 10 — Where Used

New RPC `comm_asset_where_used(asset_id)` aggregating: departments, document profiles, templates, generated documents. Hooked into the existing safe-delete service so deletion lists every dependency.

## Phase 11 — UI consolidation

`DocumentAssetsPage.tsx` rewritten as the resolver grid. Repetitive per-slot pickers removed.

## Phase 12 — Acceptance

- Department Profile owns dept comms defaults
- Document Profile owns document behaviour
- Branding inherited; only overrides stored
- Zero duplicated communication configuration
- All generation paths route through `resolveCommunication()`
- No archived / placeholder assets ever resolved
- All existing references intact
- `tsgo` build passes

---

## Execution batches (so build stays green)

1. **Audit doc + schema migration** (Phases 1–3): add Department Profile columns, extend Document Profile, GRANTs, no UI break.
2. **Resolver core** (Phases 4, 6, 8, 9): `assetSlotResolver.ts` + validation; covered by unit tests.
3. **Department Profile UI** (Phase 2 UI): tabbed editor with lookup-driven pickers.
4. **Document Profiles UI** (Phases 5, 7, 11): resolver grid + preview, replacing current `DocumentAssetsPage`.
5. **Where Used + safe delete** (Phase 10): RPC + integration with existing `safeDeleteService`.
6. **Cleanup & acceptance** (Phase 12): remove dead code paths, run typecheck, smoke-test Receipts / Certificates / Statements.

Estimated ~6 sequential turns; each turn ends with a green build.

---

## Technical notes

- No RLS — role checks at app/edge layer (project rule).
- Every new `public.*` table gets GRANTs in the same migration.
- Asset queries filter `approval_status='approved' AND is_active=true`.
- Resolver is pure + cached via React Query (`['resolve', slot, deptId, docProfileId]`).
- Existing `resolveCommunication()` in `src/lib/enterprise/CommunicationResolver.ts` is the single entry point; new `assetSlotResolver` plugs into it.
- No master tables duplicated. Addresses stay in `core_department_location`. Text stays in `core_text_block`. Assets stay in `comm_media_asset`.

Shall I proceed with **Batch 1 (audit doc + schema migration)**?
