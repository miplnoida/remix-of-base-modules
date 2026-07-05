# Epic 0.36C — Enterprise Domain Migration Plan

**Status:** Planning only. No code, schema, routes, menus, `app_modules`, hooks, services, APIs, permissions, or feature-flag changes.
**Depends on:** Epic 0.36A (Reference Architecture), 0.36A.1 (Domain Model), 0.36A.2 (Capability Model), 0.36B (Gap Assessment).
**Blocks:** Epic 0.36D (SSP Read-only Service Layer), 0.37 (Org Foundation), 0.38 (SSP Foundation), 0.39 (BN Consumption Refactor), 0.40 (BN Product Builder — remains **ON HOLD**).

---

## 1. Purpose

Define the migration sequence that must be executed **before any business module work resumes**, so the shared foundation (Platform → Organisation → SSP) exists before BN, C3, ER, LG, or any future vertical is extended.

The plan is deliberately **phased and non-destructive**. There is no big-bang cutover. Every migration passes through six mandatory phases (§4).

---

## 2. Execution Sequence (fixed order)

```text
┌──────────────────────────────────────────────────────────────────┐
│ 1. Platform Foundation                                            │
│    (audit / regression-lock — largely Green per 0.36B)            │
├──────────────────────────────────────────────────────────────────┤
│ 2. Organisation Foundation                                        │
│    (org profile, org document master, numbering, audit surfaces)  │
├──────────────────────────────────────────────────────────────────┤
│ 3. Enterprise Shared Domains (SSP)                                │
│    (Country Pack, Payment/Bank, Legal Ref, Reference Data,        │
│     Authorisation consolidation)                                  │
├──────────────────────────────────────────────────────────────────┤
│ 4. BN Consumption Refactor (Epic 0.39)                            │
│    (swap bn_* hooks for shared domain hooks; no new features)     │
├──────────────────────────────────────────────────────────────────┤
│ 5. BN Product Builder (Epic 0.40) — resumes only after gates pass │
└──────────────────────────────────────────────────────────────────┘
```

No step may start before the previous step's acceptance criteria are green.

---

## 3. Layer-by-layer scope

### 3.1 Platform Foundation
- **Scope:** Auth, identity, audit, numbering, feature flags, `app_modules`, tenant/env config.
- **0.36B status:** 🟢 92 %.
- **Action:** No migration. **Regression-lock** current surfaces. Any change must be additive and covered by tests before SSP work begins.
- **Deliverable:** "Platform Foundation Regression Baseline" checklist (part of 0.36D scope).

### 3.2 Organisation Foundation
- **Scope:** Organisation profile, org-scoped document master, org numbering policies, org-level audit config, org-level notification/workflow defaults.
- **0.36B status:** 🟡 53 %.
- **Action:** Consolidate scattered org settings into a single Organisation domain surface. Planned in **Epic 0.37**.
- **Prerequisite for:** SSP (SSP masters are org-scoped via `org_id` + `country_code`).

### 3.3 Enterprise Shared Domains (SSP)
Five P0 blockers, detailed in §5.

### 3.4 BN Consumption Refactor (Epic 0.39)
- Replace direct `bn_*` reads (`useBnCountryPack`, `useBnPaymentMasters`, `useBnCountryMaster`, BN legal-ref reads) with shared domain hooks (`useCountry`, `useBank`, `usePaymentMethod`, `useLegalReference`, `useReferenceValues`).
- No new BN features. No schema changes. Behaviour-preserving swap only.

### 3.5 BN Product Builder (Epic 0.40)
- Remains **ON HOLD**. Resumes only when §7 gates are all green.

---

## 4. Mandatory Migration Phases (applies to every P0)

Every P0 domain migration below follows these six phases in order. Skipping phases is not permitted.

| Phase | Name | Intent | Exit criterion |
|---|---|---|---|
| P1 | **Read-only façade** | Introduce shared service/hook that reads from current owner (still `bn_*`). Zero writes. | Facade returns identical results to current hook for N sampled tenants. |
| P2 | **Dual-read** | Where a shared table is later introduced, reads fall back: shared → legacy. Consumers keep old imports; new imports use façade. | Both paths return identical results; diff monitor is quiet. |
| P3 | **Write-owner cutover** | New shared table becomes single write owner. Old `bn_*` table becomes read-mirror populated by trigger or backfill job. | 100 % of writes flow through shared service; mirror lag < 1 s. |
| P4 | **Consumer refactor** | All consumers switch to shared hook (`useCountry`, `useBank`, …). Old hook becomes a re-export shim (see `useLegalReferences.ts` for the pattern already in-repo). | Zero direct references to legacy hook outside the shim file. |
| P5 | **Legacy shim** | Old hook/table remain as deprecated re-export/read-mirror for one release. Deprecation warnings emitted in non-prod. | Shim in place; docs updated; deprecation banner active. |
| P6 | **Retire** | Remove shim, remove mirror, drop legacy table in a follow-up migration. Only after **one full release** with the shim in place and zero consumer callers. | Table dropped; no runtime references; audit clean. |

Rollback rule: at any phase, reverting to the previous phase must be a config/flag flip — never a data migration.

---

## 5. Five P0 Migration Tracks

### 5.1 Country Pack → SSP (Location + Identity + Address)

| Field | Value |
|---|---|
| **Current implementation** | `bn_country`, `bn_country_id_rule`, `bn_country_address_field`, `bn_country_participant_type` owned by BN. Hooks: `useBnCountryMaster`, `useBnCountryPack`. Context: `BnCountryContext`. |
| **Target layer** | SSP · Location domain (`country`, `region`, `address_field`) + Identity domain (`id_rule`) + Party domain (`participant_type`). |
| **Target service / façade** | `LocationService`, `IdentityService`, `PartyService` + hooks `useCountry`, `useCountryIdRules`, `useCountryAddressModel`, `useParticipantTypes`. |
| **Migration phases** | P1 façade over `bn_country*` → P2 introduce `ssp_country*` with dual-read → P3 write cutover to `ssp_*` with trigger-based mirror back to `bn_*` → P4 refactor BN/C3/LG consumers → P5 shim → P6 retire `bn_country*`. |
| **Backward compatibility** | `useBnCountryPack` becomes re-export of `useCountryPack`. `BnCountryContext` keeps its public API; internals delegate to shared service. |
| **Rollback** | Feature flag `ssp.country.write_owner` off → reverts to P2 dual-read; data unaffected. |
| **Risks** | Country Pack is the most cross-cutting master; touches intake, product, payment, legal. Address model differences across countries. Participant-type retirement state must be preserved. |
| **Dependencies** | Organisation Foundation (org scoping), Reference Data consolidation (country reference group). |
| **Acceptance criteria** | Every current BN country screen renders identically off SSP data; retirement/lifecycle transitions preserved; orphan-refs report unchanged. |

### 5.2 Payment / Bank Masters → SSP (Payment domain)

| Field | Value |
|---|---|
| **Current implementation** | `bn_bank_master`, `bn_bank_branch`, `bn_payment_method`, `bn_eft_format`, `bn_eft_format_field`, `bn_workbasket`. Hooks: `useBanks`, `useBankBranches`, `usePaymentMethods`, `useWorkbaskets`, `useBnCountryPaymentConfig`. |
| **Target layer** | SSP · Payment domain (bank, branch, method, EFT format). Workbasket stays BN-owned (operational, not shared). |
| **Target service / façade** | `PaymentService` + hooks `useBank`, `useBankBranch`, `usePaymentMethod`, `useEftFormat`, `useCountryPaymentConfig`. |
| **Migration phases** | P1 read-only façade → P2 dual-read against new `ssp_bank*` / `ssp_payment_method` → P3 write cutover → P4 consumer refactor (BN + LG fee/payment surfaces + C3 payment intake) → P5 shim → P6 retire. |
| **Backward compatibility** | Type re-exports from `@/types/bnBankEft` preserved. `useBanks(countryCode)` signature preserved as shim over `useBank({ country })`. |
| **Rollback** | Flag `ssp.payment.write_owner` off. |
| **Risks** | EFT format definitions are country- and bank-specific; field-level definitions must migrate byte-exact or generated files diverge. Payment method flags (`generates_eft_file`, `requires_bank_account`) drive downstream flows. |
| **Dependencies** | Country Pack (5.1) must be at P2+ (payment config joins country). Reference Data (5.4) for currency/method reference groups. |
| **Acceptance criteria** | EFT files generated pre- and post-cutover are byte-identical on a fixture set. Payment method dropdowns unchanged. Bank branch lookups unchanged. |

### 5.3 Legal Reference → SSP (Legal Reference domain)

| Field | Value |
|---|---|
| **Current implementation** | Already partially consolidated in `core_legal_reference`, `core_legal_reference_version`, `core_module_legal_reference`, `core_template_legal_reference` (see `docs/legal/LEGAL_REFERENCE_ARCHITECTURE.md`). BN still has module-local references and BN-side hook shim (`src/hooks/bn/useLegalReferences.ts` re-exports central hook). |
| **Target layer** | SSP · Legal Reference domain (single owner of `legal_reference`, `legal_reference_version`, module/template mappings). |
| **Target service / façade** | `LegalReferenceService` + hooks `useLegalReferences`, `useLegalReference`, `useUpsertLegalReference`, `useSetLegalReferenceStatus` (already present under `@/hooks/legal-reference`). |
| **Migration phases** | P1 façade (**done** — shim exists) → P2 audit any remaining direct `core_legal_reference*` reads outside the service → P3 confirm central service is single writer → P4 refactor any surviving BN/LG direct-table reads → P5 keep the BN re-export shim for one release → P6 retire shim. |
| **Backward compatibility** | `@/hooks/bn/useLegalReferences` remains as re-export shim throughout P5. |
| **Rollback** | N/A — this track is already at P4 in practice; risk is limited to residual direct-table reads. |
| **Risks** | Product-level and template-level linkage must not be lost during any table renames. Versioning semantics (effective_from / effective_to) must remain the single source of truth. |
| **Dependencies** | Reference Data consolidation (5.4) for legal-act reference groups. Country Pack (5.1) for country-scoped legal refs. |
| **Acceptance criteria** | Zero direct `core_legal_reference*` reads outside `LegalReferenceService`. Legal templates and orders resolve to the same reference versions before and after. |

### 5.4 Reference Data Consolidation

| Field | Value |
|---|---|
| **Current implementation** | Central `core_reference_group` / `core_reference_value` in place (`useCoreReferenceValues`). Legacy `tb_*` reference tables (e.g. `tb_legal_status`) and BN-local lookups still exist. BN hook `useReferenceValues` already re-exports the core hook. Additional lookup surface: `useConfigLookup`, `useDataDictionary`. |
| **Target layer** | Enterprise · Reference Data domain (single owner: `core_reference_group` / `core_reference_value`). |
| **Target service / façade** | `ReferenceDataService` + hooks `useCoreReferenceValues`, `useCoreReferenceGroups`. Module-scoped via `moduleCode`. |
| **Migration phases** | P1 census of every `tb_*` and module-local lookup still in use → P2 seed equivalent groups in `core_reference_*` and dual-read via fallback param → P3 make `core_reference_*` sole writer; freeze legacy `tb_*` tables → P4 refactor consumers to `useCoreReferenceValues` (drop `fallback` arg) → P5 keep BN `useReferenceValues` shim → P6 retire `tb_*` reference tables. |
| **Backward compatibility** | `useReferenceValues(groupCode, fallback)` signature preserved via shim. `useConfigLookup` keys mapped 1:1 to reference groups. |
| **Rollback** | Fallback arrays remain populated during P2/P3; disabling the DB read reverts to fallbacks. |
| **Risks** | Hidden consumers reading `tb_*` directly. Group-code collisions across modules — enforce namespaced codes (`BN.*`, `LG.*`, `COMMON.*`). |
| **Dependencies** | None hard; unblocks 5.1, 5.2, 5.3 which lean on reference groups. |
| **Acceptance criteria** | Every dropdown in the app resolves to `core_reference_value`. Zero component-level fallback arrays. Group census closed. |

### 5.5 Enterprise Authorisation Consolidation

| Field | Value |
|---|---|
| **Current implementation** | Multiple auth contexts (`AuthContext`, `LegalAuthContext`, `NewBenefitAuthContext`) and role systems per module. RBAC scoring 🟡 56 % in 0.36B. |
| **Target layer** | Platform · Authorisation domain (single `user_roles` table + `has_role()` security-definer function pattern per project rules). |
| **Target service / façade** | `AuthorisationService` + hook `useHasRole(role)` + shared `AuthContext` façade that composes module-specific overlays without duplicating role checks. |
| **Migration phases** | P1 audit — enumerate all role checks, contexts, and permission tables in use → P2 introduce shared `AuthorisationService` reading from the canonical `user_roles` table → P3 all role writes go through shared service → P4 refactor module contexts to consume shared service internally (public API unchanged) → P5 legacy per-module role tables become read-mirror shims → P6 retire duplicates. |
| **Backward compatibility** | `LegalAuthContext`, `NewBenefitAuthContext` keep their exported shapes; internals delegate. |
| **Rollback** | Contexts revert to reading legacy tables via flag. |
| **Risks** | **Highest security surface.** Any regression risks privilege escalation. Mandatory: never store roles on `profiles`; always use the `user_roles` + `has_role()` pattern. This is a project-wide invariant (see custom instructions). |
| **Dependencies** | Organisation Foundation (org-scoped roles). Must precede any new module onboarding. |
| **Acceptance criteria** | Single canonical `user_roles` table. All role checks go through `has_role()` or `useHasRole()`. Zero client-side role decisions based on localStorage or profile fields. Security scan clean. |

---

## 6. Cross-track dependencies

```text
Reference Data (5.4) ──┬──► Country Pack (5.1) ──► Payment (5.2)
                       ├──► Legal Reference (5.3)
                       └──► (all dropdowns)

Organisation Foundation ──► Authorisation (5.5) ──► every module
                        └─► SSP master org scoping
```

Recommended start order inside SSP: **5.4 → 5.5 → 5.1 → 5.2 → 5.3**.
5.3 is easiest (largely complete) but keeps last so any reference-group renames from 5.4 land first.

---

## 7. Gates before BN Product Builder resumes

BN Product Builder (Epic 0.40) may resume **only** when **all** of the following are true:

- [ ] Platform Foundation regression baseline signed off.
- [ ] Organisation Foundation (Epic 0.37) at P4 or later on every surface it owns.
- [ ] Each of the five P0 tracks (§5) at **P4 or later** (i.e. consumers refactored; shim acceptable, retirement not required).
- [ ] BN Consumption Refactor (Epic 0.39) complete: zero direct `bn_country*`, `bn_bank*`, `bn_payment_method`, `bn_eft_format*` reads outside the shim files.
- [ ] Security scan clean for authorisation surface.
- [ ] 0.36B readiness scorecard rerun shows no 🔴 domain in the SSP row.

Until every checkbox is green, **Product Builder stays on hold**.

---

## 8. What Epic 0.36D will implement

0.36D is the first *code-touching* epic after this plan. Its scope is bounded to:

1. **Read-only façades (P1) for all five tracks** — no schema changes, no writes.
2. **Diff monitors** comparing façade output to current hook output on a fixture tenant.
3. **Deprecation banners** on legacy hooks in non-prod builds.
4. **Regression baseline suite** for Platform Foundation.

0.36D explicitly does **not** introduce new `ssp_*` tables, does **not** move write ownership, and does **not** refactor consumers. Those land in later epics per §4.

---

## 9. Acceptance criteria for this epic (0.36C)

- [x] No code, schema, route, menu, `app_modules`, hook, service, API, permission, or feature-flag change.
- [x] Five P0 blockers each have: current implementation, target layer, target service/façade, migration phases, backward compatibility, rollback, risks, dependencies, acceptance criteria.
- [x] Six-phase migration model (§4) is mandatory and applied uniformly.
- [x] Execution sequence Platform → Organisation → SSP → BN Refactor → Product Builder is explicit and gated.
- [x] Epic 0.36D scope is bounded and clear.
- [x] BN Product Builder (Epic 0.40) remains **ON HOLD** until §7 gates pass.
