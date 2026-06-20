## Goal
Consolidate legal references into a central, country-aware, module-aware model shared by Benefits, Legal, Compliance, and Templates. Default Legal module to SKN. Seed SKN legal references and link them to Legal use cases and templates.

## Current state (verified)
- `bn_country_legal_ref` (19 cols) — country-pack BN legal refs
- `legal_reference` (27 cols) + `legal_reference_type` (7 cols) — Legal module table (already exists, country_code likely present)
- `module_legal_reference_mapping` (11 cols) — already added in earlier turn
- `legal_templates`, `lg_notice`, `lg_case`, `core_template*` — consumers

## 1. Schema (migration)

### `core_legal_reference` (new, central)
Columns: id, country_code (NOT NULL), jurisdiction_name, ref_code, short_title, act_name, chapter, section, subsection, regulation, full_reference_text, ref_url, effective_from, effective_to, status (DRAFT/ACTIVE/SUPERSEDED/REPEALED), version_number, supersedes_id (self-FK), tags (text[]), notes, is_active, created_by, created_at, updated_by, updated_at.
Indexes: (country_code, status), (ref_code, country_code, version_number unique), (supersedes_id).
GRANTs to authenticated + service_role (no RLS per project policy).

### `core_module_legal_reference` (rename/repurpose existing `module_legal_reference_mapping`)
Drop old `module_legal_reference_mapping` (created earlier turn) and create:
id, legal_reference_id (FK core_legal_reference), module_code (BENEFITS/LEGAL/COMPLIANCE/COMMON), entity_type (CASE/TEMPLATE/NOTICE/PRODUCT/RULE/ORDER/HEARING/FEE/SETTLEMENT), entity_id (nullable uuid/text), usage_context, is_required, is_default, created_by, created_at.
Unique: (legal_reference_id, module_code, entity_type, COALESCE(entity_id,'')).

### Compatibility views
- `bn_legal_reference` view → `core_legal_reference`
- `bn_country_legal_ref` view → `core_legal_reference` (BN/COMMON-mapped subset)

### Data migration
- Copy rows from `bn_country_legal_ref` → `core_legal_reference` (country_code=SKN where missing)
- Copy rows from `legal_reference` → `core_legal_reference`, dedupe by (country_code, ref_code)
- Backfill `core_module_legal_reference` entries for BENEFITS for migrated bn rows; for LEGAL for migrated legal_reference rows.

## 2. Seed SKN Legal references
Insert/link SKN-context references for: employer enforcement (recovery, fail-to-register, remit, arrears, penalties, inspection, prosecution), payment arrangements (default, breach, court-ordered, settlement), court/hearing (filing, summons, adjournment, judgment, enforcement, garnishment), insured person matters (appeal, overpayment, fraud, estate), legal fees (filing cost, processing, service, enforcement, waiver authority), and template bindings (Demand, Final Demand, Notice Before Action, Hearing Notice, Court Filing Cover, Payment Default, Settlement Offer, Judgment Notice, Enforcement Notice, Legal Fee Notice). Each gets a `core_module_legal_reference` row with module_code='LEGAL', entity_type and usage_context filled.

## 3. Services / hooks
- Update `src/services/legal-reference/*` to read/write `core_legal_reference` + `core_module_legal_reference`.
- Add `country_code` filter (default SKN for LEGAL).
- Update `src/services/bn/legalReferenceService.ts` to consume the central table via compat view or direct query.
- Update `useLegalReferences`/`useEntityLegalReferences` to require module + country.

## 4. UI
- Legal Admin → Legal References page: default country SKN, module=LEGAL filter, category tabs (Employer enforcement / Payment arrangements / Court & Hearings / Insured Person / Legal Fees / Templates). Allow linking existing core refs and tagging usage.
- Country Pack page: continues to manage SKN catalogue, now via core table.
- Legal case detail: enforce country_code presence; reference selector limited to country.
- Legal template editor: reference attach UI + tokens `{{legal_reference.full|short_title|act_name|section|regulation}}`.

## 5. Validation
- Block legal case save without `country_code`.
- Block template using ref from a different country.
- Block document generation with INACTIVE/REPEALED ref.
- Warn on SUPERSEDED, near-expiry, or missing-required ref.

## 6. Document generation
- Resolver filters by country + ACTIVE.
- On generation, snapshot exact `legal_reference_id` + `version_number` into `core_generated_document` metadata.

## 7. Acceptance
- One central table, country-aware, module-aware.
- SKN default everywhere in Legal.
- Compat views keep old BN code working until services migrate.
- TypeScript build passes.

## Notes
- Big migration; will run as one supabase--migration call (create tables → migrate data → views → seed → mappings).
- No RLS (project policy).
- Will not delete `bn_country_legal_ref` table until services confirmed switched — replaced by view after data copy.
