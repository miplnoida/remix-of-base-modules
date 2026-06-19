# Country Pack — Developer Bible

> **Audience:** Backend / frontend / QA / data engineers extending or maintaining the multi-country Benefit (BN) platform.
> **Status:** Authoritative. If code disagrees with this document, raise a PR to update the document **and** the code — do not silently diverge.
> **Module root:** `src/pages/bn/config/country/`, `src/components/bn/country/`, `src/services/bn/countryPackService.ts`, `src/contexts/BnCountryContext.tsx`.

---

## 1. What is a Country Pack?

A **Country Pack** is the complete, country-scoped configuration bundle that lets the BN platform operate in a given jurisdiction (St. Kitts & Nevis = `KN`, ...) without code changes. It is the single source of truth for:

| Concern | Question it answers |
|---|---|
| **Country Master** | What is the country, currency, fiscal year, retirement age, contribution ceilings? |
| **ID / SSN Rules** | What national ID does a person carry, what format, what length, regex? |
| **Address Model** | What address fields exist, which are required, what validation regex? |
| **Participant Types** | Who can participate in a claim (claimant, dependant, guardian, beneficiary…), with what verification / online access rules? |
| **Payment Methods (capability)** | Which payout methods (EFT / CHEQUE / CASH / WIRE / MOBILE / CARD / MONEY_ORDER) are *allowed* in this country, with what rules? |
| **Payment Cycle × Method Matrix** | Which methods are usable for which payment cycles (weekly / fortnightly / monthly / quarterly / annual / ad-hoc)? |
| **Funding Source Accounts** | From which SSB bank accounts is the country paying *out*? Which EFT format do they use? |
| **Legal References** | Which Acts/Regulations/Circulars apply, versioned by `effective_from`, optionally scoped to products? |
| **Schemes / Products / Doc Types / Reason Codes** | Cross-references consumed downstream by the Product Catalog and Claim Workbench. |

The Country Pack is loaded **once per user session** by `BnCountryProvider` and cached for 5 minutes by React Query (`useBnCountryPack`).

### 1.1 Why it exists

Every downstream module (Product Catalog, Claim Intake, Payment Preparation, Letters/Comms, Online Portal) reads from the Country Pack so a new country can be onboarded by **configuration only**, with no fork in business logic. Anything that varies by country MUST be modelled in the pack — never hard-coded.

---

## 2. Routes & Screens

All routes live under `/bn/config/country/*`. The shell is `CountryPackPage` → `BnCountryProvider` → `CountryPackDashboard`.

| # | Route | Component | Purpose |
|---|---|---|---|
| 1 | `/bn/config/country` | `CountryPackDashboard` | Dashboard + readiness validation, country switcher, profile editor, payment summary, cycle matrix, funding accounts |
| 2 | `/bn/config/country/id-rules` | `CountryIdRules` | Maintain SSN / National ID / Passport rules |
| 3 | `/bn/config/country/address-model` | `CountryAddressModel` | Define address fields used by the dynamic address form |
| 4 | `/bn/config/country/participant-types` | `CountryParticipantTypes` | Define who can participate in claims + lifecycle |
| 5 | `/bn/config/country/payment-config` | `CountryPaymentConfig` | Country payment **methods** (capability only) |
| 6 | `/bn/config/country/legal-refs` | `CountryLegalRefs` | Versioned legal references |
| 7 | `/bn/config/country/master` | `CountryMaster` | Country master record (currency, fiscal year, retirement age, ceilings) |

### 2.1 Dashboard

![Dashboard](screenshots/01_dashboard.png)

**What you see:**
- **Country Pack header** with country name, currency symbol/code, locale and timezone.
- **Country switcher** (`CountrySelector`) — persists the active country to `localStorage` under `bn.activeCountryCode`.
- **Edit Country Profile** button — opens `CountryProfileEditor` (formats, office contacts, letterhead).
- **Organisation & Formats card** — office name/phone/email/website, date/number/phone formats, default language, office address.
- **Validation banner (destructive)** — lists every readiness gap (no office name, no address, no letterhead, no ID rules, no address model, no participant types, no payment methods, no legal refs).
- **7 capability tiles** — `Configured (N)` (success) or `Not configured` (destructive) for ID rules, Address model, Participant Types, Payment Methods, Legal References, Products, Document Types.
- **Payment Capability Summary** — country-level method readiness (enabled/default/requires_*).
- **Payment Cycle × Method Matrix** — toggle which methods are usable per cycle.
- **Funding Source Accounts** — SSB bank accounts that *fund* payouts, with EFT format readiness.

**Developer notes:**
- All readiness checks live in `CountryPackDashboard.tsx` `issues[]` array — keep them in sync with new mandatory entities.
- Tile counts come straight from `useBnCountryPack().data` (no separate count queries).

### 2.2 ID / SSN Rules

![ID Rules](screenshots/02_id_rules.png)

| Field | Type | Required | Validation |
|---|---|---|---|
| `id_type` | enum: `SSN \| NATIONAL_ID \| TAX_ID \| PASSPORT` | yes | Must be one of `BN_ID_TYPES` |
| `id_label` | text | yes | UI label shown wherever the ID is captured |
| `format_pattern` | regex string | yes | Valid JS regex; tested with `new RegExp(format_pattern).test(value)` |
| `format_mask` | text | optional | Display mask (e.g. `XXX-XX-XXXX`) |
| `digit_length` | int | yes | Exact length enforced after regex passes |
| `has_check_digit` | bool | yes | If true, `check_digit_algorithm` must be set |
| `check_digit_algorithm` | text | conditional | e.g. `LUHN`, `MOD11` — required when `has_check_digit = true` |
| `example_value` | text | optional | Shown in error messages and placeholders |
| `is_primary` | bool | exactly one per country | The single primary identity used by claim intake |
| `is_active` | bool | yes | Inactive rules are ignored by `validateIdByCountry` |

**Validation contract** — `validateIdByCountry(rules, value)` in `countryPackService.ts`:
1. Find the primary, active rule. If none → valid (no rule = no enforcement).
2. Empty value → `${id_label} is required`.
3. `format_pattern` set → must match.
4. Length must equal `digit_length`.

**Consumed by:** `DynamicIdInput`, claim intake, online application, person registration.

### 2.3 Address Model

![Address Model](screenshots/03_address_model.png)

| Field | Type | Required | Notes |
|---|---|---|---|
| `field_code` | text | yes | Stable key (e.g. `line1`, `parish`, `postal_code`). Unique per country. |
| `field_label` | text | yes | UI label |
| `field_type` | enum: `TEXT \| SELECT \| POSTAL` | yes | `BN_ADDRESS_FIELD_TYPES`. `SELECT` requires `options_source`. |
| `is_required` | bool | yes | Enforced by `DynamicAddressForm` |
| `options_source` | text | conditional | RPC/view name for `SELECT` fields (e.g. `bn_parishes`) |
| `validation_pattern` | regex | optional | Applied with `new RegExp(...)` on blur and submit |
| `sort_order` | int | yes | UI render order, ascending |
| `is_active` | bool | yes | Inactive fields are not rendered |

**Consumed by:** `DynamicAddressForm` (every address entry surface in BN). Address snapshots stored on claims/profiles use this shape.

### 2.4 Participant Types

![Participant Types](screenshots/04_participant_types.png)

Defines every role that may appear on a claim (`CLAIMANT`, `DEPENDANT`, `BENEFICIARY`, `GUARDIAN`, `EMPLOYER`, `WITNESS`, `GUARANTOR`…).

Key fields (full list in `BnCountryParticipantType`):

| Group | Fields | Validation |
|---|---|---|
| Identity | `type_code` (unique per country), `type_name`, `participant_role` (∈ `BN_PARTICIPANT_ROLES`) | `type_code` required; `participant_role` required |
| Demographics | `min_age`, `max_age` | If both set, `min_age ≤ max_age` |
| Verification | `requires_identity_verification`, `requires_relationship_or_authority_proof`, `requires_email_verification`, `requires_phone_verification`, `requires_ssn_link`, `requires_officer_review` | Booleans, default `false`. Legacy `requires_id` / `requires_relationship_proof` deprecated — do not write to. |
| Capability | `online_access_allowed`, `can_register_online`, `can_apply_for_self`, `can_apply_for_others`, `can_be_added_by_claimant`, `can_receive_communication`, `can_receive_payment` | Drives Online Portal and intake |
| Proof hints | `proof_requirement_code`, `suggested_document_category`, `suggested_document_label` | Optional — linked to Document Library later |
| Scoping | `allowed_products` (`text[]`) | Empty/null = available to all products |
| Lifecycle | `lifecycle_status` ∈ `DRAFT \| ACTIVE \| RETIRED`, `retired_at`, `retired_by`, `retired_reason` | `RETIRE` requires a `reason`. Use `retireCountryParticipantType()` — do not delete a type with usage. |
| Usage guard | `v_bn_participant_type_usage` view returns `product_version_count`, `active_product_count`, `historical_claim_count` | Block delete if any > 0; allow retire. |

**Lifecycle API (in `countryPackService.ts`):** `setParticipantTypeLifecycle`, `retireCountryParticipantType`, `reactivateCountryParticipantType`.

### 2.5 Payment Configuration — Capability Only

![Payment Config](screenshots/05_payment_config.png)

> **Architectural rule (BIBLE):** Country Payment Config stores **only** what a country *allows* and the *rules* for using a method. It MUST NOT store:
> - SSB funding/source-bank details → those live in `bn_payment_source_account` (Funding Source Accounts panel).
> - Beneficiary-specific values (account number, SWIFT, address) → those live in `bn_payment_profile` (Payment Profile).
>
> Real EFT bank-file format is owned by the **source account**, not the country. Country-level EFT fields remain only as a legacy fallback marked “advanced”.

Method matrix (St. Kitts & Nevis seed):

| `payment_method` | enabled | default | requires_bank_account | notes |
|---|---|---|---|---|
| `EFT` | ✅ | ✅ | ✅ | Real format on source account |
| `CHEQUE` | ✅ |  |  | `cheque_stock_required` true, template id elsewhere |
| `WIRE` | ❌ |  |  | Pending business confirmation |
| `CASH` | ❌ |  |  | Pickup/mailing flags, no merchant fields |
| `MOBILE_MONEY` | ❌ |  |  | Provider/country arrays on `method_config` |
| `CARD` | ❌ |  |  | Card-network array, no gateway/merchant fields |
| `MONEY_ORDER` | ❌ |  |  | Issuance/mailing/pickup flags |

Per-row fields:

| Field | Type | Validation | Owner |
|---|---|---|---|
| `payment_method` | text | unique per country | Country |
| `method_label` | text | required | Country |
| `is_method_enabled` | bool | drives matrix availability | Country |
| `is_default` | bool | at most one default per country | Country |
| `requires_bank_account` | bool | EFT/WIRE typically true | Country |
| `requires_mobile_number` | bool | true for `MOBILE_MONEY` | Country |
| `processing_days` | int | ≥ 0 | Country |
| `cut_off_day` | int | 1–31 for monthly, 1–7 for weekly | Country |
| `payment_cycle` | text | one of cycle codes; see matrix | Country |
| `calendar_config` | jsonb | holidays/working days | Country |
| `method_config` | jsonb | capability flags + arrays (see method-specific rules below) | Country |
| `bank_file_format` etc. | text | **fallback only** — hidden behind “Legacy fallback EFT format (advanced)”; real format = source account | Source account |

**Method-specific capability rules (enforced in `validateConfig` of `CountryPaymentConfig.tsx`):**

- **EFT:** `requires_bank_account = true`; real format READY on at least one `bn_payment_source_account` of the country before `eftFileService` will generate.
- **WIRE:** capability flags `requires_bank_account`, `requires_swift_bic`, `requires_beneficiary_address`, `requires_intermediary_bank`, `foreign_currency_allowed`, `approval_required` (no actual SWIFT/IBAN stored here).
- **CASH:** `pickup_allowed`, `mailing_allowed`, `id_verification_required`, `approved_pickup_locations[]`, `accepted_id_types[]`.
- **MOBILE_MONEY:** `supported_providers[]`, `supported_countries[]`, `requires_mobile_number = true`.
- **CARD:** `card_payout_supported`, `supported_card_networks[]`, `allowed_currencies[]` — no merchant/gateway here.
- **MONEY_ORDER:** `issuance_supported`, `mailing_allowed`, `pickup_allowed`.
- **CHEQUE:** `cheque_stock_required`, `cheque_format_template_id` (template managed elsewhere).

**Payment Cycle × Method Matrix (`bn_country_payment_cycle_method`):** cycles `WEEKLY|FORTNIGHTLY|MONTHLY|QUARTERLY|ANNUAL|ADHOC` × enabled methods. A method must be enabled at country level AND ticked in the matrix for a cycle to be selectable in the Product Catalog.

**Funding Source Accounts (`bn_payment_source_account`):** required for any EFT/cheque batch. Format must be `READY`; `eftFileService` throws otherwise.

### 2.6 Legal References

![Legal Refs](screenshots/06_legal_refs.png)

| Field | Type | Validation |
|---|---|---|
| `ref_code` | text | required, unique within country |
| `ref_title` | text | required |
| `ref_section` | text | optional |
| `ref_url` | text | optional, must be valid URL if set |
| `applicable_products` | text[] | empty/null = all products |
| `effective_from` | date | required, `≤ effective_to` if both set |
| `effective_to` | date | optional |
| `version_number` | int | monotonic per `ref_code` |
| `supersedes_id` | uuid | FK to prior `bn_country_legal_ref.id` when re-versioning |
| `notes` | text | optional |
| `is_active` | bool | only active refs are returned by `fetchCountryLegalRefs` |

Reads filter by `is_active = true` and (optionally) `applicable_products` membership. Refs are **immutable** once an active product version cites them — supersede with a new row + `supersedes_id`.

### 2.7 Country Master

![Country Master](screenshots/07_country_master.png)

`bn_country` row — 29 columns. Maintain via `CountryMaster.tsx` (full edit) or `CountryProfileEditor` (dashboard quick-edit for formats/office/letterhead).

| Field | Validation |
|---|---|
| `country_code` | ISO-3166-1 alpha-2, immutable |
| `country_name` | required |
| `currency_code` | ISO-4217, required |
| `currency_symbol` | optional |
| `fiscal_year_start_month` | 1–12 |
| `contribution_ceiling_weekly`, `contribution_ceiling_annual` | non-negative, may be null |
| `default_retirement_age` | 50–80 |
| `office_name`, `office_address`, `office_phone`, `office_email`, `office_website` | required for letters/branding to render |
| `letterhead_logo_url` | optional but flagged by dashboard if empty |
| `date_format`, `number_format`, `phone_format`, `default_language`, `locale`, `timezone` | drive `FORMAT_CONFIG` overrides |
| `parameters` | jsonb — free-form country knobs |
| `is_active` | bool |

---

## 3. Data Model — Tables

> RLS is **disabled** per `Entry 9` of project knowledge. Authorisation is enforced at the app/edge layer.

### 3.1 Table → Screen → Service map

| Table | Columns | Screen | Service file | Hook |
|---|---|---|---|---|
| `bn_country` | 29 | Master, Dashboard | `countryProfileService.ts`, `countryMasterService.ts` | `useBnCountryMaster` |
| `bn_country_id_rule` | 14 | ID Rules | `countryPackService.ts` | `useBnCountryIdRules` |
| `bn_country_address_model` | 12 | Address Model | `countryPackService.ts` | `useBnCountryAddressModel` |
| `bn_country_participant_type` | 41 | Participant Types | `countryPackService.ts` | `useBnCountryParticipantTypes` |
| `bn_country_payment_config` | 31 | Payment Methods | `countryPackService.ts` | `useBnCountryPaymentConfig` |
| `bn_country_payment_cycle_method` | 13 | Cycle Matrix (dashboard) | `countryPackService.ts` (matrix helpers) | inside `PaymentCycleMethodMatrix` |
| `bn_payment_source_account` | 29 | Funding Source Accounts (dashboard) | `paymentSourceAccountService.ts` | inside `FundingSourceAccountManager` |
| `bn_country_legal_ref` | 19 | Legal References | `countryPackService.ts` | `useBnCountryLegalRefs` |
| `bn_scheme` / `bn_product` / `bn_service_doc_type` / `bn_reason_code` | — | (consumed read-only by pack) | `countryPackService.ts` | via `useBnCountryPack` |
| `v_bn_participant_type_usage` | view | Participant Types usage guard | `fetchParticipantTypeUsage` | `useBnParticipantTypeUsage` |
| `bn_country_config_package` / `_item` | 15 / 7 | Governance (Phase 6) | `governance/countryPackageService.ts` | (governance UI) |

### 3.2 Foreign-key and consumption chain

```text
bn_country (country_code, PK)
   ├── bn_country_id_rule.country_code
   ├── bn_country_address_model.country_code
   ├── bn_country_participant_type.country_code
   │      └── bn_product_participant_config.participant_type (logical link via type_code)
   ├── bn_country_payment_config.country_code
   │      └── bn_country_payment_cycle_method.payment_method, .cycle
   │      └── bn_payment_source_account.country_code (funds the payouts)
   ├── bn_country_legal_ref.country_code
   │      └── bn_product_version.legal_refs[]      (citation)
   ├── bn_scheme.country_code
   │      └── bn_product.scheme_id
   ├── bn_product.country_code
   │      └── bn_product_version, bn_claim, …
   ├── bn_service_doc_type.country_code (nullable = global)
   └── bn_reason_code.country_code      (nullable = global)
```

### 3.3 Downstream consumers (read-side)

| Consumer | Reads | Why |
|---|---|---|
| **Product Catalog** | participant types (active only), payment methods (enabled+matrix), legal refs | Form availability, citations |
| **Claim Intake / Workbench** | id rules, address model, participant types, payment policy | Validation, dynamic forms |
| **Online Portal** | active participant types with `online_access_allowed=true`, address model | Self-service forms |
| **Payment Preparation / EFT Update** | payment config (capability), source accounts (format), cheque format | Method selection + file generation |
| **Letters / Comms** | `office_*`, `letterhead_logo_url`, legal refs | Branding + footers |
| **Calc Engine** | `bn_country.currency_*`, `contribution_ceiling_*`, `default_retirement_age` | Rate/ceiling math |

---

## 4. Frontend Architecture

```text
CountryPackPage  (route: /bn/config/country)
└── BnCountryProvider  (active country, persisted in localStorage)
    └── CountryPackDashboard
        ├── CountrySelector
        ├── CountryProfileEditor (modal)
        ├── Validation banner (issues[])
        ├── Capability tiles (7)
        ├── PaymentCapabilitySummary
        ├── PaymentCycleMethodMatrix
        └── FundingSourceAccountManager
```

### 4.1 BnCountryContext (`src/contexts/BnCountryContext.tsx`)

- Resolves the active country in this order: `localStorage('bn.activeCountryCode')` → `defaultCountry` prop → first active row in `bn_country` → final hard fallback `'KN'`.
- Exposes: `activeCountryCode`, `setActiveCountryCode`, `countryPack`, `isLoading`, `primaryIdRule`, `currency`, `addressFields`, `participantTypes`, `paymentMethods`, `validateId(value)`.
- Backed by `useBnCountryPack(code)` with `staleTime: 5 * 60_000`.

### 4.2 Hooks (`src/hooks/bn/useBnCountryPack.ts`)

All hooks invalidate the matching query key on mutation success:

| Hook | Key prefix |
|---|---|
| `useBnCountryPack(code)` | `['bn','country-pack',code]` |
| `useBnCountryIdRules` / `useUpsertCountryIdRule` / `useDeleteCountryIdRule` | `['bn','country-id-rules', …]` |
| `useBnCountryAddressModel` / upsert / delete | `['bn','country-address', …]` |
| `useBnCountryParticipantTypes` / `useBnActiveCountryParticipantTypes` / usage / lifecycle | `['bn','country-participants', …]` |
| `useBnCountryPaymentConfig` / upsert / delete | `['bn','country-payment', …]` |
| `useBnCountryLegalRefs(code, productId?)` / upsert / delete | `['bn','country-legal', …]` |

### 4.3 Reusable presentational components

- `DynamicIdInput` — renders the primary ID with mask + on-blur validation via `validateId`.
- `DynamicAddressForm` — renders fields ordered by `sort_order`, types `TEXT/SELECT/POSTAL`.
- `ParticipantTypeSelector` — searchable picker filtered by `lifecycle_status='ACTIVE'` and (optionally) product scope.
- `PaymentCapabilitySummary` — country method readiness, source-account readiness, validation badges.
- `PaymentCycleMethodMatrix` — toggles `bn_country_payment_cycle_method`.
- `FundingSourceAccountManager` — CRUD on `bn_payment_source_account`, format readiness gate.

---

## 5. Validation Rules — Authoritative Cheat-sheet

These rules MUST be enforced both client-side (the screens above) and reasserted server-side in any RPC or edge function that mutates the same rows.

| Entity | Rule |
|---|---|
| `bn_country` | `country_code` immutable; `currency_code` ISO-4217; `fiscal_year_start_month` 1–12; `default_retirement_age` 50–80; ceilings ≥ 0. |
| `bn_country_id_rule` | Exactly one `is_primary=true && is_active=true` per country; `format_pattern` is a valid JS regex; `digit_length > 0`; `has_check_digit=true` ⇒ `check_digit_algorithm` not null. |
| `bn_country_address_model` | Unique `field_code` per country; `field_type ∈ TEXT/SELECT/POSTAL`; `SELECT` ⇒ `options_source` set; `validation_pattern` (if set) is a valid regex. |
| `bn_country_participant_type` | Unique `type_code` per country; `participant_role ∈ BN_PARTICIPANT_ROLES`; if `min_age` & `max_age` set then `min_age ≤ max_age`; do **not** delete when `v_bn_participant_type_usage` shows any non-zero count — retire instead. |
| `bn_country_payment_config` | Unique `payment_method` per country; at most one `is_default=true` per country; `payment_method ∈ EFT/CHEQUE/CASH/WIRE/MOBILE_MONEY/CARD/MONEY_ORDER`; method-specific `method_config` keys per §2.5; no beneficiary or source-bank values stored here. |
| `bn_country_payment_cycle_method` | Method must be enabled at country level before insertion; `cycle ∈ WEEKLY/FORTNIGHTLY/MONTHLY/QUARTERLY/ANNUAL/ADHOC`. |
| `bn_payment_source_account` | EFT format must be `READY` before `eftFileService.generate(...)`. |
| `bn_country_legal_ref` | Unique `ref_code` per country (history allowed via `supersedes_id`); `effective_from ≤ effective_to` when both set; `version_number` monotonic per `ref_code`. |

### 5.1 Country Pack readiness (Dashboard `issues[]`)

A country is **release-ready** when ALL of the following hold:

- Office name, address, letterhead logo set
- ≥1 active ID rule with `is_primary=true`
- ≥1 address-model field with `is_active=true`
- ≥1 participant type with `lifecycle_status='ACTIVE'`
- ≥1 payment method with `is_method_enabled=true` AND ≥1 funding source account with format `READY`
- ≥1 active legal reference

Until then, the destructive banner on the dashboard lists each gap.

---

## 6. Adding a New Country — Runbook

1. Insert the `bn_country` row (code, name, currency, fiscal year, retirement age, ceilings). Set `is_active=true`.
2. Fill `office_*` and upload `letterhead_logo_url`.
3. Add ID rules — at least one `is_primary=true` with regex + length + example.
4. Add address-model fields in `sort_order`. Mark required ones.
5. Add participant types you intend to use (`DRAFT` → `ACTIVE` once ready).
6. Add payment methods (capability + rules). Enable in the cycle matrix.
7. Add at least one funding source account; bring its EFT format to `READY`.
8. Add legal references with `effective_from` and any `applicable_products`.
9. Visit `/bn/config/country` — confirm zero issues in the validation banner.
10. (Governance) Build a `bn_country_config_package` draft and `activate()` it via `countryPackageService.ts` to freeze the snapshot.

---

## 7. Extending the Country Pack

When adding a new country-scoped entity:

1. Create the table with `country_code` column. Per `Entry 9`, do **not** enable RLS — guard at app/edge layer.
2. Add the type to `src/types/bn.ts` and the array to `BnCountryPack`.
3. Add `fetch* / upsert* / delete*` to `countryPackService.ts` and include the fetch in `fetchCountryPack`.
4. Add hooks to `useBnCountryPack.ts` with consistent query keys.
5. Add a screen under `src/pages/bn/config/country/` and a route.
6. Add a tile + readiness check in `CountryPackDashboard.issues[]`.
7. Update this document — add a row to §2 routes, a section, table/screen map in §3.1, and validation rules in §5.
8. Generate/refresh a test case per the knowledge-repository rule (`Entry 8`).

---

## 8. Anti-patterns (do NOT do this)

- ❌ Storing a SWIFT/BIC, IBAN, account number, or merchant id on `bn_country_payment_config`.
- ❌ Hard-coding country-specific logic (`if country === 'KN'`) in any service — model it in the pack.
- ❌ Deleting a participant type with non-zero `v_bn_participant_type_usage` — retire instead.
- ❌ Editing an active legal reference in place — supersede with a new versioned row.
- ❌ Enabling RLS on any `bn_*` table — violates `Entry 9` of project knowledge.
- ❌ Bypassing `BnCountryContext` and querying `bn_country` directly in feature code — use the context so cache invalidation and country switching keep working.
- ❌ Adding a new mandatory entity without also adding it to the dashboard readiness banner.

---

## 9. File Index

```text
src/pages/bn/config/country/
  CountryPackPage.tsx           # shell + provider
  CountryMaster.tsx             # bn_country full editor
  CountryIdRules.tsx            # bn_country_id_rule CRUD
  CountryAddressModel.tsx       # bn_country_address_model CRUD
  CountryParticipantTypes.tsx   # bn_country_participant_type CRUD + lifecycle
  CountryPaymentConfig.tsx      # bn_country_payment_config CRUD (capability only)
  CountryLegalRefs.tsx          # bn_country_legal_ref CRUD + versioning

src/components/bn/country/
  CountryPackDashboard.tsx
  CountrySelector.tsx
  CountryProfileEditor.tsx
  DynamicIdInput.tsx
  DynamicAddressForm.tsx
  ParticipantTypeSelector.tsx
  PaymentCapabilitySummary.tsx
  PaymentCycleMethodMatrix.tsx
  FundingSourceAccountManager.tsx

src/contexts/BnCountryContext.tsx
src/hooks/bn/useBnCountryPack.ts
src/services/bn/countryPackService.ts
src/services/bn/countryProfileService.ts
src/services/bn/countryMasterService.ts
src/services/bn/governance/countryPackageService.ts
src/types/bn.ts                 # BnCountry*, BnCountryPack
```

---

## 10. Screenshot Index

| # | File | Screen |
|---|---|---|
| 1 | `screenshots/01_dashboard.png` | Country Pack Dashboard |
| 2 | `screenshots/02_id_rules.png` | ID / SSN Rules |
| 3 | `screenshots/03_address_model.png` | Address Model |
| 4 | `screenshots/04_participant_types.png` | Participant Types |
| 5 | `screenshots/05_payment_config.png` | Country Payment Methods (capability) |
| 6 | `screenshots/06_legal_refs.png` | Legal References |
| 7 | `screenshots/07_country_master.png` | Country Master |

---

**Change control.** Treat this file as the contract. Any code change touching `bn_country*`, `bn_payment_source_account`, `bn_country_payment_cycle_method`, or the screens listed in §9 MUST update the corresponding section here in the same PR.
