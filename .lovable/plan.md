## Phase 2 — Country Pack Cross-Module Rollout

This is a large, cross-cutting change touching ~10 Benefits config screens, the template engine, validation, and the DB. Delivering it as one mega-commit will be unreviewable and risky. I propose a staged plan, each stage independently shippable with TypeScript passing.

---

### Stage 1 — Foundation (token engine + shared selectors)

**New shared building blocks** other screens will adopt in later stages.

- `src/lib/bn/templateTokens.ts`
  - `TOKEN_REGISTRY` grouped by `Country | LegalReference | Product | Rule | Decision | Claim | Person | Payment`
  - `resolveTokens(template, context)` → replaces `{{group.field}}`, returns `{ output, missing[], unresolved[] }`
  - Country tokens read from `bn_country` (+ joined office/contact fields already in schema)
  - Legal tokens read from `bn_legal_reference` (short, full, act_name, chapter, section, subsection, regulation)
  - Product/Rule/Decision `.legal_reference` resolve by following the FK on the entity
- `src/hooks/bn/useTemplateTokens.ts` — list registry, resolve preview
- `src/components/bn/selectors/CountrySelector.tsx` — already exists in `bn/country/`; re-export from `selectors/` so the rollout has one canonical import path. Default to KN only when no value, never hardcode.
- `src/components/bn/selectors/LegalReferenceSelector.tsx` — searchable, filters by `country_code`, `status='ACTIVE'`, optional `productTags`/`ruleTags`
- `src/hooks/bn/useLegalReferences.ts` — extend with `{ countryCode, activeOnly, tags }` filters

### Stage 2 — Communication Template editor

- `BenefitCommunicationTemplates.tsx`: add `TokenPicker` (grouped tree, click to insert at caret), live `TemplatePreview` panel with sample claim/product/rule context selector, and "Missing tokens" warning badge driven by `resolveTokens`.
- New components under `src/components/bn/templates/`: `TokenPicker.tsx`, `TemplatePreview.tsx`, `SampleContextPicker.tsx`.

### Stage 3 — Selector rollout across config screens

Replace free-text country/legal fields with the Stage 1 selectors in:

| Screen | File |
|---|---|
| Product Catalog / Editor | `ProductCatalog.tsx`, `ProductEditor.tsx` |
| Eligibility Rule Catalogue | `RuleCatalogue.tsx`, `RuleConfiguration.tsx` |
| Formula Library | `FormulaConfiguration.tsx` |
| Rate Tables | `RateTableEditor.tsx` |
| Matrix Tables | `TransitionMatrix.tsx` |
| Medical Tariff / Reimbursement | `src/pages/bn/config/medical/*` |
| Document Setup | `DocumentSetup.tsx` |
| Payment Config | `country/CountryPaymentConfig.tsx`, payment editors |
| Approval / Override Policies | `src/pages/bn/config/approval/*` |

Each screen: country → `CountrySelector`, legal ref → `LegalReferenceSelector(countryCode=row.country_code)`. No schema changes — these columns already exist; we are only swapping the input control.

### Stage 4 — Config validation

Extend `BenefitConfigurationValidation.tsx` + `src/services/bn/configValidationService.ts` (new) with checks:

1. Active product → `country_code` exists in `bn_country` and country is active
2. Active product/rule/formula/table → `legal_reference_id` (when required) → `bn_legal_reference.status='ACTIVE'`
3. All template tokens in `bn_*_template.body` resolve against the registry
4. No active config references a `SUPERSEDED`/`REPEALED` legal ref unless `legal_ref_override_ack=true`

Surface as a Validation panel section "Country & Legal" with severities Error/Warning and a fix-link to the offending row.

### Stage 5 — Acceptance check

- Generate a sample letter end-to-end and confirm legal refs print
- Confirm grep shows no remaining free-text country/legal `<Input>` in the listed screens
- `tsc` passes

---

### Recommended delivery now

Given the size, I will **implement Stage 1 + Stage 2 in this turn** (foundation + template editor — the highest-leverage pieces that unlock everything else and are testable end-to-end), then ask for go-ahead on Stages 3–5 which are largely mechanical screen-by-screen swaps.

Confirm and I'll proceed, or tell me to do all stages in one go (slower, larger diff) or a different split.
