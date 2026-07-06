# SSB Platform v1.0 — Freeze Contract

**Date:** 2026-07-06
**Version:** SSB Platform v1.0 (frozen)
**Scope:** St. Kitts & Nevis Social Security Board reference implementation.

---

## 1. What is frozen

The following surfaces are declared **platform v1.0** and are the single
source of truth for every downstream business module (BN, Contributions,
Claims, Employer, Member, Compliance, Finance, Legal, Communications):

1. **Administration** — `/admin/*` shared-domain and master-data screens
   (Geography, Identity, Financial Reference, Legal Reference, DMS,
   Communication, Numbering, Workflow) and their canonical tables
   (`ssp_*`, `core_*`, `public_holidays`, `ssb_process_catalogue`).
2. **SSB Setup** — `/admin/ssb-setup?section=<key>` with 9 relational
   policy forms (`ssb_*_policy` + child tables). All active policy
   configuration is relational; no JSON blob drives runtime logic.
3. **Configuration Governance** — `/admin/configuration-governance` for
   registry, dependencies, packages, validation, snapshots, impact.
4. **Enterprise Consumption Registry** —
   `/admin/enterprise-consumption-registry` as the ownership and
   consumption contract across Reference Framework → Enterprise Masters →
   Shared Domains → SSB Policies → Business Processes → Business Modules.
   See `docs/enterprise/ENTERPRISE_CONSUMPTION_REGISTRY_ACCEPTANCE.md`.
5. **Policy Registry** — `src/services/ssb/ssbPolicyRegistry.ts` as the
   single source of truth mapping every policy table, scope key, health
   rule, and UI deep-link.
5. **Process Resolvers** — `ssbBusinessProcessConfigService`:
   - `getMemberRegistrationConfiguration()`
   - `getEmployerRegistrationConfiguration()`
   - `getContributionCollectionConfiguration()`
   - `getBenefitAdministrationConfiguration()`
   - `getClaimsProcessingConfiguration()`
   - `getPaymentsConfiguration()`
   - `getComplianceCaseConfiguration()`
   - `evaluateBenefitsReadiness()`
   - `listBusinessProcesses()`

## 2. Consumption contract

Business modules **must**:

- Consume platform configuration through the approved process resolvers
  above (and, for master data, through the canonical `ssp_*` / `core_*`
  tables owned by their engines).
- Store stable codes / ids returned by resolvers, never display labels.
- Deep-link users into `/admin/ssb-setup?section=<key>` or
  `/admin/configuration-governance` when platform configuration is
  missing or partial — never render duplicate CRUD.
- Treat `evaluateBenefitsReadiness()` (or the equivalent process
  readiness signal) as the gate for module-level activation.

Business modules **must not**:

- Read `ssb_*_policy` tables directly.
- Read shared-domain tables (`ssp_*`, `core_*`) except through the
  engine or resolver that owns them.
- Hardcode platform dropdowns (countries, identity types, payment
  channels, legal references, document types, workflow templates,
  communication templates, calendar rules, numbering sequences).
- Duplicate any admin/setup/governance screen.
- Write to any table outside their own module namespace.

## 3. BN-owned scope (unchanged)

BN retains full ownership of:

- Benefit product definition (`bn_product`, `bn_product_version`)
- Benefit category / type / scheme / branch
- Eligibility rules (`bn_eligibility_rule`, `bn_rule_*`)
- Calculation formulas (`bn_formula_*`, `bn_calculation_rule`)
- Rate tables (`bn_rate_table*`)
- Product versioning, approval, activation, amendment policy
- Product-owned participant / channel / interaction / screen /
  approval-policy configuration

BN mutates its own tables and only reads platform configuration through
resolvers.

## 4. Change control

Breaking changes to any frozen surface require:

1. A migration under `supabase/migrations/` (additive preferred).
2. A resolver-signature review — resolver return shapes are part of the
   contract.
3. An updated acceptance document under `docs/social-security/`.
4. A published notice to consuming modules with at least one release of
   deprecation lead time.

## 5. No legacy impact

`bn_*`, `bema_*`, `ia_*`, `ip_*`, `er_*`, `cl_*`, `cn_*` and other
legacy tables are outside this contract. The freeze introduces no
structural change to any legacy table. Compliance, Legal, Finance and
Claims continue to run untouched.

## 6. Acceptance

- [x] Platform surfaces listed in §1 exist and are stable.
- [x] Resolvers in §1 are exported and typed.
- [x] Policy Registry drives lifecycle, health and governance.
- [x] Consumers have deep-link paths into SSB Setup / Governance.
- [x] No legacy structural change was introduced by this freeze.
