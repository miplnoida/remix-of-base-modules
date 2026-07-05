# Epic 2.5A — KN Shared Domain Configuration Seed Pack — Acceptance

## Objective
Seed minimum configuration data for St. Kitts & Nevis so the shared domain
screens delivered by Epics 2.2 – 2.5 are usable without waiting for a full
country data migration.

## Scope (implementation-first, no new screens, no schema changes)
Additive data-only inserts into the existing `ssp_*` tables. Legacy
BN/BEMA/IA/Legal/Finance tables are untouched.

## What Was Seeded

### 1. Geography (`/admin/geography`)
| Table | Rows | Notes |
|---|---|---|
| `ssp_country_profile` | 1 | `KN` (pre-existed, Epic 2.4A) |
| `ssp_admin_level` | 5 | Country, Island, Parish, City/Town, Village/Area |
| `ssp_geo_area` | 16 | 2 islands (Saint Kitts, Nevis) + 14 parishes |

### 2. Identity (`/admin/identity`)
| Table | Rows | Notes |
|---|---|---|
| `ssp_identity_type` | 5 | NATIONAL_ID, NIS, PASSPORT, TIN, DRIVER_LICENSE |
| `ssp_country_identity_rule` (KN) | 5 | NIS = primary + mandatory; regex marked TODO |

### 3. Financial Reference (`/admin/financial-reference`)
| Table | Rows | Notes |
|---|---|---|
| `ssp_currency_profile` | 2 | XCD (primary), USD |
| `ssp_payment_channel` | 5 | Cheque, EFT, Cash, Online, Mobile Wallet |
| `ssp_settlement_method` | 3 | Manual, Bank File, Payment Gateway |
| `ssp_account_type` | 2 | Savings, Current/Checking |
| `ssp_bank`, `ssp_bank_branch` | 0 | Intentionally empty — awaiting verified list |

### 4. Legal Reference (`/admin/legal-reference`)
| Table | Rows | Notes |
|---|---|---|
| `ssp_legal_reference_type` | 9 | Pre-seeded by Epic 2.5 |
| `ssp_legal_act` (KN) | 1 | `CONFIG_PENDING` placeholder, status = draft |
| `ssp_legal_section`, `ssp_regulation`, `ssp_court_reference` | 0 | Awaiting verified source law |

## Verification
Post-seed row counts confirmed via live DB:
```
admin_level=5, geo_area=16, identity_type=5, identity_rule_kn=5,
currency=2, payment_channel=5, settlement_method=3, account_type=2,
legal_act_kn=1
```

## Acceptance Checklist
- [x] Existing screens show meaningful seeded data.
- [x] KN is the default operational country.
- [x] Identity has minimum ID types and a primary rule for KN.
- [x] Financial Reference has XCD, payment channels, settlement methods, account types.
- [x] Legal Reference has types + placeholder guidance row (empty-state guarded).
- [x] No legacy tables changed structurally or via data.
- [x] No duplicate screens created.
- [x] Admin/Application Admin/Super Admin roles retain access (unchanged since Epics 2.2 – 2.5).
- [x] Rollback documented (see below and configuration guide).
- [x] Configuration guide published: `docs/social-security/SHARED_DOMAIN_CONFIGURATION_GUIDE_KN.md`.

## Legacy / BEMA / IA / BN / Legal Impact
None. This epic only inserts rows into additive `ssp_*` tables. No structural
or data changes to legacy tables. BN Product Builder remains ON HOLD.

## Follow-ups (TODO before UAT / Product Builder resume)
1. Confirm exact regex + checksum for NIS, TIN, National ID, Passport, Driver
   License with SSA and update `ssp_country_identity_rule` rows.
2. Provide the verified KN commercial bank + branch list for
   `ssp_bank` / `ssp_bank_branch`.
3. Replace the `CONFIG_PENDING` placeholder in `ssp_legal_act` with the KN
   Social Security Act, its Regulations, and Sections.
4. Seed KN courts (Magistrate, High Court, ECSC) with jurisdiction linkage.

## Rollback
See `docs/social-security/SHARED_DOMAIN_CONFIGURATION_GUIDE_KN.md` §Rollback.

## Status
**Complete.** Ready for admins to log in and configure through the shared
domain screens.
