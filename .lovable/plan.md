# Multi-Country Benefit Platform Design

## Summary

Refactor the Benefit Module from an SKN-first implementation into a reusable multi-country platform where new countries are onboarded through configuration packs, not code forks.

## Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│                    PLATFORM LAYER (Country-Agnostic)             │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Claim Engine │  │ Calc Engine  │  │ Decision/Workflow Eng  │ │
│  │ (bn_claim)   │  │ (bn_calc_*)  │  │ (bn_claim_transition)  │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Evidence Eng │  │ Award/Pmt    │  │ Legacy Adapter Layer   │ │
│  │ (bn_claim_*) │  │ (bn_award)   │  │ (bn_legacy_*)          │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
│                                                                  │
│  UI: CountryContext → filters all queries by active country      │
│  Services: All fetch functions accept country_code parameter     │
│  Types: Country-agnostic interfaces, country packs = config data │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    COUNTRY PACK LAYER (Config Data)               │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│  │ SKN Pack   │  │ Future:    │  │ Future:    │  │ Future:   │ │
│  │ (Active)   │  │ Barbados   │  │ Dominica   │  │ Anguilla  │ │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘ │
│                                                                  │
│  Each pack provides:                                             │
│  • Scheme/Branch/Product catalogue                               │
│  • ID validation rules (SSN format, length, checksum)            │
│  • Address model (field names, required fields, postal format)    │
│  • Participant types (claimant, beneficiary, dependent types)     │
│  • Contribution/wage rules via rule groups                       │
│  • Formula templates and calculation rules                       │
│  • Workflow templates + transition rules                         │
│  • Document types + evidence requirements                        │
│  • Payment calendar + method registry                            │
│  • Legal references with version tracking                        │
│  • Reason codes per country                                      │
│  • Locale/i18n overrides                                         │
└──────────────────────────────────────────────────────────────────┘
```

---

## Current State Assessment

### Already Country-Scoped (Good ✅)
- `bn_country` — country-level parameters (currency, ceiling, retirement age)
- `bn_scheme` — FK to country_code
- `bn_product` — FK to country_code
- `bn_rule_group`, `bn_formula_template`, `bn_workflow_template`, `bn_screen_template`, `bn_document_profile` — all have `country_code`
- `bn_claim_transition_rule`, `bn_workbasket`, `bn_escalation_policy` — all have `country_code`
- Product versions inherit country through product → scheme → country chain

### Missing / SKN-Hardcoded (Needs Work ⚠️)
1. No country-specific ID rules — SSN length (6 digits) hardcoded in env vars
2. No country-specific address model — address fields assume SKN format
3. No participant type registry — claimant/beneficiary types are implicit
4. No payment calendar table — schedules are config JSONB blobs
5. No legal reference tracking — legislation refs are free-text
6. `bn_service_doc_type` lacks country_code
7. `bn_reason_code` lacks country_code
8. No CountryContext in React — UI doesn't filter by active country
9. Services don't pass country_code — fetchSchemes() returns all countries

### SKN Overfitting Risks
| Area | Risk | Mitigation |
|------|------|------------|
| 6-digit SSN | Other countries use 9-11 digit IDs | `bn_country_id_rule` table |
| EC$ currency | Some countries use USD, BBD | Already on `bn_country.currency_code` ✅ |
| Weekly contribution cycle | Some countries use monthly | Configurable via rule groups ✅ |
| Parish-based addresses | Others have states/provinces | `bn_country_address_model` table |
| Age 62 retirement | Varies 60-67 | Already on `bn_country.default_retirement_age` ✅ |

---

## Database Changes

### Table 1: `bn_country_id_rule`
ID validation rules per country (SSN format, mask, length, check digit algorithm).

### Table 2: `bn_country_address_model`
Address field definitions per country (field code, label, type, required, options source, validation pattern).

### Table 3: `bn_country_participant_type`
Claimant & beneficiary type registry (type code, role, age constraints, relationship proof requirements, allowed products).

### Table 4: `bn_country_payment_config`
Payment methods & calendar per country (method, cycle, processing days, cut-off, calendar config).

### Table 5: `bn_country_legal_ref`
Legislation tracking with versioning (ref code, title, section, URL, applicable products, effective dates, supersedes chain).

### Schema Modifications
- `bn_service_doc_type` — ADD `country_code`
- `bn_reason_code` — ADD `country_code`
- `bn_country` — ADD `locale`, `timezone`, `address_model_version`

---

## Source of Truth Strategy

| Table | Source of Truth? |
|-------|-----------------|
| bn_country + pack tables | ✅ Platform config |
| bn_scheme / bn_product | ✅ Config per country |
| bn_product_version + rules | ✅ Versioned config |
| bn_claim / bn_award | ✅ Operational data |
| bn_legacy_claim_map | Metadata only |
| ip_master / ip_wages | ✅ Read-only, never duplicated |

---

## Services & Hooks

### `countryPackService.ts`
- `fetchCountryPack(countryCode)` — full pack
- Fetch + upsert for each entity
- `validateIdByCountry(countryCode, idValue)`

### `BnCountryContext.tsx`
- Active country code, country pack, convenience accessors
- All BN pages wrapped in `<BnCountryProvider>`
- `validateId()` derived from country rules

### Refactored `configService.ts`
- All fetch functions gain optional `countryCode` parameter

---

## UI Components

1. `CountrySelector.tsx` — admin header dropdown
2. `CountryPackDashboard.tsx` — pack completeness overview
3. `DynamicAddressForm.tsx` — renders address from country model
4. `DynamicIdInput.tsx` — renders ID input from country rules
5. `ParticipantTypeSelector.tsx` — dropdown from participant types
6. Admin CRUD pages for each pack entity

---

## Global vs. Country-Specific

| Layer | Global (Platform) | Country-Specific (Pack) |
|-------|-------------------|------------------------|
| Schema | Table structures | Seed data |
| Engines | Calc, decision, evidence | Rules, formulas, transitions |
| UI Components | EvidenceChecklist, Claim360 | DynamicAddressForm, DynamicIdInput |
| Validation | Engine framework | ID patterns, address rules |
| Workflow | State machine | Transition rules, SLAs |
| Documents | Evidence engine | Doc types, requirements |
| Payments | Award engine | Methods, calendars |
| Legal | Reference framework | Legislation sections |

---

## Onboarding a New Country (Zero Code Changes)

1. Insert `bn_country` row
2. Seed ID rules, address model, participant types, payment config, legal refs
3. Create scheme(s) + branches + products + versions with rules
4. Seed doc types + reason codes
5. Seed transition rules + workbaskets
6. Configure legacy adapters if applicable

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | Migration SQL (5 tables + ALTER + SKN seeds) |
| Create | `src/services/bn/countryPackService.ts` |
| Create | `src/hooks/bn/useBnCountryPack.ts` |
| Create | `src/contexts/BnCountryContext.tsx` |
| Create | `src/components/bn/country/CountrySelector.tsx` |
| Create | `src/components/bn/country/CountryPackDashboard.tsx` |
| Create | `src/components/bn/country/DynamicAddressForm.tsx` |
| Create | `src/components/bn/country/DynamicIdInput.tsx` |
| Create | `src/components/bn/country/ParticipantTypeSelector.tsx` |
| Create | `src/pages/bn/config/country/*.tsx` (5 admin pages) |
| Modify | `src/types/bn.ts` — add interfaces |
| Modify | `src/services/bn/configService.ts` — country filtering |
| Modify | `src/hooks/bn/useBnConfig.ts` — consume CountryContext |
| Modify | `src/components/routing/AppRoutes.tsx` |
| Modify | `src/components/sidebar/menuItems/bnMenuItems.ts` |

---

## Open Points

1. Default country: SKN or require explicit selection?
2. Multi-country users: Can one user work across countries?
3. Cross-country transfers: Support CARICOM portability?
4. Shared document types: Global or per-country?
5. Locale/i18n: Non-English interfaces needed?
6. Legacy adapters: Standardize interface now for future countries?