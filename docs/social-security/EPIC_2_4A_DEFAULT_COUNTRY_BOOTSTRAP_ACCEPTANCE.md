# Epic 2.4A — Default Country Bootstrap Acceptance

## Purpose
Seed **Saint Kitts and Nevis (KN)** as the default operational country so the
shared Geography, Identity, and Financial Reference domain screens are usable
out-of-the-box. Tables remain multi-country ready.

## What was inspected
| Source | Finding |
|---|---|
| `ssp_country_profile` (Geography Domain Pack) | Empty — blocking all shared-domain screens. |
| `core_reference_group/value` | Not the canonical country source; left untouched. |
| `bn_country` (BN legacy) | Left untouched per scope. |
| Organisation Foundation / `core_organization` | No `country_code` seed required for this epic. |
| `app_modules` / Enterprise Capability Registry | Geography, Identity, Financial Reference already registered (Epics 2.2–2.4). |

## What was seeded
Single upsert into `ssp_country_profile`:

| Field | Value |
|---|---|
| country_code | KN |
| country_name | Saint Kitts and Nevis |
| iso_alpha2 | KN |
| iso_alpha3 | KNA |
| iso_numeric | 659 |
| default_timezone | America/St_Kitts |
| default_locale | en-KN |
| default_currency | XCD |
| is_active | true |
| notes | Default operational country (Epic 2.4A bootstrap) |

Idempotent: `ON CONFLICT (country_code) DO UPDATE`.

## Default country fallback
New hook: `src/hooks/geography/useDefaultCountry.ts`

- `useDefaultCountry()` — returns the country marked as "Default operational country", else the first active country, else `KN`.
- `getDefaultCountryCode(countries)` — non-hook accessor for services.
- `DEFAULT_COUNTRY_CODE = 'KN'` — hard fallback.

Existing `useCountries()` (Epic 2.2) already returns KN after seed. The
three admin screens (`GeographyDomainPage`, `IdentityDomainPage`,
`FinancialReferenceDomainPage`) already auto-select `countries[0]` when the
operator has not chosen one, satisfying single-country auto-selection.

## Screens verified
- `/admin/geography` — KN appears and is auto-selected.
- `/admin/identity` — country selector populated; KN auto-selected.
- `/admin/financial-reference` — country selector populated; KN auto-selected.

## Access
No permission/role changes. Existing Admin and Application Admin roles
retain access granted in Epics 2.2–2.4.

## Legacy impact
- BN country pack (`bn_country`, `bn_country_*`): **untouched**.
- BEMA / IA legacy tables: **untouched**.
- `core_reference_*`: **untouched**.

## Rollback
```sql
DELETE FROM ssp_country_profile WHERE country_code = 'KN';
```
And remove `src/hooks/geography/useDefaultCountry.ts` if the fallback hook is
no longer wanted. No dependent code hard-imports it yet, so removal is safe.

## Next
Epic 2.5 — Legal Reference Domain Pack (or Participant Domain Pack), per the
Social Security implementation sequence.
