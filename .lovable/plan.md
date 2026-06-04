# BN Product Catalogue — Channels (Online + Offline)

Make every benefit product/version support both online (public self-service) and offline (staff-assisted) applications. Eligibility, calculation, timelines, and interactions stay shared. Screens, documents, validation, and workflows become channel-specific.

## 1. Database migration

New table `bn_product_channel_config`
- Keys: `product_id`, `product_version_id`, `channel_code` (`ONLINE`|`OFFLINE`), unique on `(product_version_id, channel_code)`
- Refs: `screen_template_id` → `bn_screen_template`, `workflow_template_id` → `bn_workflow_template`, `workflow_definition_id`, `document_profile_id` → `bn_document_profile`, `confirmation_template_id`
- Flags: `is_enabled`, `allow_save_draft`, `allow_upload_later`, `requires_identity_verification`, `requires_email_or_phone_otp`, `requires_staff_review_before_acceptance`, `blocks_submission_if_documents_missing`, `blocks_submission_if_precheck_fails`, `correction_allowed`, `correction_deadline_days`, `default_source`, `metadata`
- Standard audit columns

Alter `bn_doc_requirement` — add `channel_code` (default `BOTH`), `public_visible`, `internal_visible`, `blocks_submission`, `blocks_decision`, `blocks_payment`, `condition_json`.

Alter `bn_claim` — add `channel_code`, `submitted_via`, `screen_template_id`, `workflow_definition_id`, `channel_config_id`.

All new tables get GRANTs for `authenticated` and `service_role`; RLS stays off per project policy.

## 2. Service layer

`src/services/bn/productChannelConfigService.ts` (new)
- `fetchChannelConfigs(versionId)`, `upsertChannelConfig`, `deleteChannelConfig`
- `getChannelConfig(productVersionId, channel)`

`src/services/bn/productAcceptanceService.ts` (new)
- `getProductApplicationConfig(productCode, claimDate, channel, applicantContext)` — resolves active version + channel config + shared rules
- `getApplicationRequirements(...)` — filters `bn_doc_requirement` by channel + `condition_json` + visibility flags
- `validateApplicationBeforeCreate(payload)` — runs precheck + blocks_submission_if_documents_missing
- `createApplicationFromConfig(payload)` — inserts `bn_claim` with channel metadata
- `generateEvidenceChecklist(claimId, productVersionId, channel)`
- `startProductWorkflow(claimId, productVersionId, channel)` — central engine if `workflow_definition_id` set, else fallback to `bn_claim_transition_rule`

Update `bn_claim` insert paths in existing services to populate channel metadata when called.

## 3. Validation hook

Extend `src/services/bn/configurationValidationService.ts`:
- Public-ready check: ONLINE channel enabled + screen + docs + workflow + confirmation
- Staff-ready check: OFFLINE channel enabled + screen + docs + workflow
- Surface in Benefit Configuration Validation dashboard

## 4. UI — Product Editor

New tab `ChannelsTab` (`src/components/bn/config/ChannelsTab.tsx`)
- Two cards: Offline Staff Intake, Online Public Portal
- Per card: enabled toggle, screen template select, document profile select, workflow template/definition selects, all behavior switches, correction deadline input
- Save/upsert via new hooks `useBnChannelConfigs`, `useUpsertBnChannelConfig`

Update `DocumentRulesTab` to show + edit:
- `channel_code` select (Online/Offline/Both)
- `public_visible`, `internal_visible`, `blocks_submission`, `blocks_decision`, `blocks_payment` toggles
- Optional `condition_json` JSON textarea

Add explanation banner to Product Editor:
> Eligibility, calculation, timelines, and benefit interactions are shared for the product version. Channel settings control how online and offline applications collect data, require documents, and route workflow.

## 5. Seed SKN channels

Data insert (via insert tool after migration):
- OFFLINE enabled = true for every active SKN product version
- ONLINE enabled = true only for: `SKN-SVC-LIFE`, `SKN-SVC-SCH`, `SKN-SVC-EFT`
- ONLINE disabled (row created but `is_enabled = false`) for everything else

## 6. Types & hooks

- Add types in `src/types/bn.ts`: `BnProductChannelConfig`, channel-related fields on `BnDocRequirement`, `BnClaim`
- Add React Query hooks in `src/hooks/bn/useBnConfig.ts` for channel config CRUD

## 7. Out of scope this turn

- No new public portal UI built. Service layer + config so portal can consume it.
- No central workflow engine changes — only wiring `workflow_definition_id` through.
- No changes to existing eligibility/calculation/timeline tabs.

## Technical notes

- Migration order: CREATE TABLE → GRANT → (no RLS per project rule) → ALTER existing tables.
- Channel codes uppercase, validated in service layer.
- `default_source` defaults: `STAFF_ASSISTED` for OFFLINE, `ONLINE` for ONLINE.
- Use `(supabase as any)` pattern consistent with existing `productService.ts`.
- All new audit fields populated from `requireUserCode()` like other BN services.
