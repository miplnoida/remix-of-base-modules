# Shared Domain Configuration Guide — St. Kitts & Nevis (KN)

Companion guide to Epic 2.5A. Explains how to configure the four shared Social
Security domain packs so downstream modules (BN, Compliance, HRMS, Legal, etc.)
can safely resume consumption.

Default operational country: **KN — Saint Kitts and Nevis**
All screens auto-select KN when it is the only active country.

---

## 1. Geography Domain — `/admin/geography`

**What the data means**
- `ssp_country_profile` — countries. KN is the default.
- `ssp_admin_level` — hierarchy of administrative divisions per country.
- `ssp_geo_area` — actual named areas (islands, parishes, towns, villages).
- `ssp_address_format`, `ssp_postal_rule`, `ssp_jurisdiction`,
  `ssp_country_policy`, `ssp_geo_external_code` — optional extensions.

**Minimum required rows (seeded by Epic 2.5A)**
- 1 country (KN, active)
- 5 admin levels (Country, Island, Parish, City/Town, Village/Area)
- 2 islands (Saint Kitts, Nevis) + 14 parishes

**Where it is shown**
- Every domain screen with a country selector.
- Address entry (future), jurisdiction linkage, legal/court references.

**What can be left blank**
- Address formats, postal rules, external code mappings, custom policies.

**Required before BN Product Builder resumes**
- KN active ✅
- At least islands + parish level populated ✅
- Address format for KN (recommended, not blocking).

---

## 2. Identity Domain — `/admin/identity`

**What the data means**
- `ssp_identity_type` — global catalogue of identifier types.
- `ssp_country_identity_rule` — per-country validation rules.
- `ssp_identity_validation_pattern` — reusable regex/checksum library.
- `ssp_party_identity`, `ssp_external_identity_ref`,
  `ssp_identity_verification_event`, `ssp_identity_match_key` — runtime data.

**Minimum required rows (seeded)**
- 5 identity types: National ID, NIS, Passport, TIN, Driver License
- 5 KN rules (NIS marked primary + mandatory; others optional)

**Where it is shown**
- Member/Employer registration, KYC, duplicate detection.
- Consumed by BN, Compliance, HRMS, Prison, Licensing via read-only facade.

**What can be left blank**
- Validation patterns library (regex live directly on the rule row).
- External identity refs (populated at runtime).

**TODO before production**
- Confirm exact NIS / TIN / National ID / Passport / DL regex + checksum with
  the SSA. Current patterns are permissive placeholders.

**Required before BN Product Builder resumes**
- Primary identity type flagged for KN ✅ (NIS)
- Validation regex confirmed (marked TODO — non-blocking for dev).

---

## 3. Financial Reference Domain — `/admin/financial-reference`

**What the data means**
- `ssp_currency_profile` — currencies used by the system.
- `ssp_exchange_rate` — currency conversions (optional).
- `ssp_bank`, `ssp_bank_branch` — bank master (must be verified before seed).
- `ssp_payment_channel` — how money moves (cheque, EFT, cash, etc.).
- `ssp_settlement_method` — how funds settle (manual, bank file, gateway).
- `ssp_account_type` — bank account types.
- `ssp_tax_reference`, `ssp_chart_of_account_ref`,
  `ssp_financial_external_code`, `ssp_country_financial_availability` —
  extensions and legacy code cross-refs.

**Minimum required rows (seeded)**
- Currencies: XCD, USD
- Payment channels: Cheque, EFT, Cash, Online, Mobile Wallet
- Settlement methods: Manual, Bank File, Payment Gateway
- Account types: Savings, Current/Checking

**Where it is shown**
- BN payment configuration, Compliance receipting, Cashier, ledger postings.

**What can be left blank until verified**
- **Banks and branches** — do NOT invent; source from SSA official list.
- Tax references, chart of accounts, exchange rates.

**Required before BN Product Builder resumes**
- XCD currency active ✅
- At least one settlement method + payment channel per BN payment method ✅
- Verified bank list — **BLOCKING**, must be provided by SSA.

---

## 4. Legal Reference Domain — `/admin/legal-reference`

**What the data means**
- `ssp_legal_reference_type` — categories (ACT, SECTION, REGULATION, …).
- `ssp_legal_act`, `ssp_legal_section`, `ssp_regulation` — the source law.
- `ssp_court_reference` — courts.
- `ssp_legal_reference` — the citation model used by templates and workflows,
  with an optional `penalty_scale` JSONB.
- `ssp_country_legal_applicability`, `ssp_legal_external_code` — governance.

**Minimum required rows (seeded)**
- 9 reference types (from Epic 2.5)
- 1 placeholder KN act (`CONFIG_PENDING`) so the screen is never empty.

**Where it is shown**
- Compliance notices, Legal case citations, Communication templates,
  penalty calculators.

**TODO before production**
- Seed the Social Security Act, Regulations, and associated sections for KN.
- Seed courts (Magistrate, High Court, ECSC) with jurisdiction linkage.
- Replace the placeholder `CONFIG_PENDING` act.

**Required before BN Product Builder resumes**
- At least one real Act + one real Section per penalty/interest formula the
  BN engine will cite. Non-blocking for dev, blocking for UAT sign-off.

---

## Governance
- All configuration screens are Admin / Application Admin / Super Admin only.
- All tables are additive `ssp_*` — legacy BN/BEMA/IA/Legal/Finance tables are
  untouched and their data is not migrated by this epic.
- Legacy identifiers can be cross-referenced through the `*_external_code`
  tables in each pack.

## Rollback (Epic 2.5A seed only)
```sql
DELETE FROM ssp_legal_act WHERE country_code='KN' AND act_code='CONFIG_PENDING';
DELETE FROM ssp_account_type       WHERE account_code IN ('SAVINGS','CURRENT');
DELETE FROM ssp_settlement_method  WHERE method_code IN ('MANUAL','BANK_FILE','PAYMENT_GATEWAY');
DELETE FROM ssp_payment_channel    WHERE channel_code IN ('CHEQUE','EFT','CASH','ONLINE','MOBILE_WALLET');
DELETE FROM ssp_currency_profile   WHERE currency_code IN ('XCD','USD');
DELETE FROM ssp_country_identity_rule WHERE country_code='KN';
DELETE FROM ssp_identity_type      WHERE code IN ('NATIONAL_ID','NIS','PASSPORT','TIN','DRIVER_LICENSE');
DELETE FROM ssp_geo_area           WHERE country_code='KN';
DELETE FROM ssp_admin_level        WHERE country_code='KN';
```
