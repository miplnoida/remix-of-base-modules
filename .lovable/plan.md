# BN Configurable Application Form Engine

Replace per-benefit hardcoded forms with a single engine driven by Product Catalogue (product version → screen template + field metadata + documents + eligibility + workflow). Same engine renders Internal, Assisted Offline, and Public channels.

## 1. Form Definition Service (new)

`src/services/bn/forms/formDefinitionService.ts`

```ts
type Channel = 'INTERNAL' | 'ASSISTED_OFFLINE' | 'PUBLIC';

getApplicationFormDefinition(productCode, claimDate, channel) // resolves version + sections + fields + docs + eligibility + workflow
getRequiredSections(productVersionId, channel)
getVisibleFields(productVersionId, channel, applicantContext)
validateApplicationPayload(payload, definition)
generateEvidenceChecklist(claimId, productVersionId) // inserts bn_evidence_checklist
submitApplication(payload, channel) // creates bn_claim, docs, evidence, starts workflow, audit
```

Uses existing `productVersionResolver.resolveProductVersion(productCode, claimDate)`.

## 2. Section Catalogue

Shared sections (apply to every product):
`claimant_details, insured_person_details, benefit_selection, claim_event_details, employment_details, contribution_context, banking_payee_details, documents, declaration_consent, internal_review`

Benefit-specific section templates (one per product type):
`sickness_details, maternity_details, employment_injury_details, disablement_details, medical_expense_details, employment_injury_death_details, funeral_grant_details, invalidity_details, age_benefit_details, survivor_details, non_contributory_pension_details`

Stored as seed rows in `bn_screen_template` + `bn_field_metadata`. New file `src/services/bn/forms/sectionCatalogue.ts` holds the canonical section codes and default field sets used to seed and to fall back to when a product version has no custom template.

Each field row carries: `field_code, field_label, field_type, section_code, required, visible_for_channels (INTERNAL/ASSISTED_OFFLINE/PUBLIC), validation_rules (JSON), data_source, help_text, sort_order`.

## 3. Channel rules

- `PUBLIC`: hide `internal_review` section; hide fields where `visible_for_channels` excludes PUBLIC; documents marked required must be uploaded before submit; pre-eligibility must pass.
- `ASSISTED_OFFLINE` / `INTERNAL`: all sections visible; documents may be marked Pending; waiver allowed when user has `bn.documents.waive`; legacy lookup, priority, basket routing, internal notes available.

Visibility/required computed in `getVisibleFields` so the renderer stays dumb.

## 4. Form Renderer (new)

`src/components/bn/forms/ApplicationFormEngine.tsx` — props `{ definition, channel, value, onChange, onSubmit }`. Iterates sections → fields, uses existing inputs (`SearchableSelect`, `DatePicker`, `PhoneInput`, `InputWithCounter`) per `field_type`. Errors shown inline + `ValidationSummary` banner + destructive toast on failed submit (per project Validation-UX rules).

Section renderers under `src/components/bn/forms/sections/*` for the few sections that need composite UI (documents checklist, banking, survivors grid). Everything else renders from field metadata.

## 5. Channel entry points

- Internal/offline: `src/pages/nbenefit/BenefitApplicationFormPage.tsx` rewired to load definition via `getApplicationFormDefinition(benefitType, today, 'ASSISTED_OFFLINE')` and render `ApplicationFormEngine`. Removes the per-benefit hardcoded path.
- Public: new `src/pages/public/bn/PublicBenefitApplication.tsx` (route `/public/benefit/:productCode`) using channel `PUBLIC`.
- Both call `submitApplication`.

## 6. Product Catalogue Preview tab

Update `ProductEditor` Preview tab to add channel switcher (Internal / Assisted Offline / Public). Renders `ApplicationFormEngine` in read-only/preview mode against the selected draft/active version. Shows required documents, eligibility pre-checks summary, and which workflow will start.

## 7. Document integration

On `submitApplication`:
- Read `bn_doc_requirement` for the resolved version.
- Insert `bn_evidence_checklist` rows (mandatory + optional).
- PUBLIC: reject submission if any mandatory doc missing.
- INTERNAL/ASSISTED_OFFLINE: allow Pending; record waiver in `bn_claim_event` if waiver permission used.

## 8. Workflow integration

After claim insert:
- If product version has `workflow_template_id` (or central `workflow_definition_id`), start a `workflow_instances` row + initial `workflow_tasks` via existing workflow service.
- Else fallback to BN transition matrix (`bn_claim_transition_rule`).
- Always write `bn_claim_event` audit row (`SUBMITTED`, channel, user_code).

## 9. Validation pipeline

`validateApplicationPayload` runs in this order, short-circuits on first hard failure:
1. Product ACTIVE
2. Resolver returns ACTIVE version for claim date
3. Required fields present (per channel visibility)
4. Required documents uploaded (PUBLIC) or marked Pending (INTERNAL)
5. Eligibility pre-checks via existing eligibility rule evaluator
6. Duplicate claim check (same IP + product + overlapping event date)
7. Workflow exists or fallback enabled

Errors returned as `{ field, message }[]` per project API-design rule.

## 10. Migration / seed

Single migration:
- Seed `bn_screen_template` rows for the 11 benefit-specific templates + 1 shared base template.
- Seed `bn_field_metadata` rows for shared + benefit-specific fields with `visible_for_channels` JSON.
- Backfill existing `bn_product_version.screen_template_id` to point at the matching benefit template where null.
- No new tables.

## 11. Hooks

`src/hooks/bn/useApplicationFormDefinition.ts` — React Query wrapper around `getApplicationFormDefinition`. Used by both pages and Preview tab.

## 12. Tests

`src/__tests__/bn/formEngine.test.ts` — for each of the 11 benefits and each channel: render definition, assert required-field validation, missing-document validation, eligibility-fail path, and happy-path submit (mocked supabase).

## Verification

- One engine renders all 11 benefits in 3 channels from Product Catalogue config.
- No new hardcoded per-benefit forms.
- Required documents auto-listed from `bn_doc_requirement`.
- PUBLIC hides internal-only fields/sections.
- Workflow starts on submit when configured; fallback otherwise.
- TypeScript build passes.

## Technical notes

- Resolver, read-only enforcement, and version lifecycle from the prior plan are reused as-is.
- All writes use the current logged-in `user_code` for `createdby`/`modifiedby` (project rule).
- No RLS introduced (project rule); role checks done in service layer.
- Dates use `formatDateForStorage` / `formatDateForDisplay`; phones use `PhoneInput`.
