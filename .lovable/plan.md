# Eligibility Rule Builder — Realistic Redesign

Replace the current free-text eligibility rule editor with a **fact-registry-driven**, business-friendly rule builder that maps every rule to a real source table and a real resolver, with templates, grouping, preview, testing, and validation.

This plan is delivered in **four phases**. Each phase is independently shippable and ends with a working UI/runtime. Phases 2–4 only proceed after Phase 1 review.

---

## Phase 1 — Fact Registry + Resolvers (foundation)

**New file:** `src/services/bn/eligibility/eligibilityFactRegistry.ts`

Central, typed registry. Each entry:

```ts
{
  fact_key, label, category, description,
  source_table, source_column,
  resolver_function,           // name in resolver map
  data_type,                   // 'number' | 'date' | 'enum' | 'bool' | 'string'
  allowed_operators,           // subset of OPERATORS
  allowed_values?,             // for enum/bool
  applicable_products,         // ['*'] or specific benefit codes
  example_value,
}
```

**Categories** (fixed enum): `PERSON`, `CONTRIBUTION`, `EMPLOYER`, `CLAIM_EVENT`, `MEDICAL`, `DOCUMENTS`, `EXISTING_BENEFITS`, `PAYMENT_AWARD`, `SPECIAL`.

**Seeded facts (initial set, all backed by real tables):**

| fact_key | source | resolver |
|---|---|---|
| `person.age_at_claim_date` | `ip_master.date_of_birth` | `resolvePersonAge` |
| `person.gender` | `ip_master.gender` | `resolvePersonGender` |
| `person.alive_status` | `ip_master.status` | `resolvePersonAlive` |
| `contribution.total_weeks` | `bn_claim_contribution_snapshot` / `ip_wages` | `resolveContribTotalWeeks` |
| `contribution.paid_weeks` | same | `resolveContribPaidWeeks` |
| `contribution.recent_weeks` | same | `resolveContribRecentWeeks` |
| `contribution.average_weekly_wage` | same | `resolveContribAvgWage` |
| `contribution.last_contribution_date` | `ip_wages` | `resolveContribLastDate` |
| `employer.exists` | `er_master` | `resolveEmployerExists` |
| `employer.status` | `er_master.status` | `resolveEmployerStatus` |
| `employer.active_on_injury_date` | `er_master` + claim event | `resolveEmployerActiveOnDate` |
| `claim.injury_date` | `bn_claim` | `resolveClaimInjuryDate` |
| `claim.submission_date` | `bn_claim.created_at` | `resolveClaimSubmissionDate` |
| `claim.days_since_event` | derived | `resolveDaysSinceEvent` |
| `claim.application_channel` | `bn_claim_application.application_channel` | `resolveClaimChannel` |
| `document.medical_certificate_received` | `bn_claim_document` | `resolveDocReceived('MEDICAL_CERT')` |
| `document.death_certificate_received` | same | `resolveDocReceived('DEATH_CERT')` |
| `document.birth_certificate_received` | same | `resolveDocReceived('BIRTH_CERT')` |
| `document.employer_report_received` | same | `resolveDocReceived('EMPLOYER_RPT')` |
| `existing.active_award` | `bn_award` | `resolveActiveAward` |
| `existing.duplicate_claim_same_period` | `bn_claim` | `resolveDuplicateClaim` |
| `existing.previous_maternity_claim` | `bn_claim` | `resolvePreviousMaternity` |

**New file:** `src/services/bn/eligibility/eligibilityFactResolver.ts`
Single entry point `resolveFact(factKey, ctx)` that dispatches to the resolver functions above. All eligibility evaluation goes through this — no raw JSON key reads.

`ctx = { ssn, claimId, claimDate, productCode, employerRegno, ... }`.

**New file:** `src/services/bn/eligibility/operators.ts`
Pure functions for `>=`, `<=`, `=`, `!=`, `exists`, `not_exists`, `in`, `between`. Each operator declares which `data_type`s it accepts — the UI consumes this to gate the operator dropdown.

**Acceptance Phase 1:**
- Registry compiles, every fact has a real resolver, resolver throws on unknown key.
- Unit test (vitest) covers one fact per category against seeded data.

---

## Phase 2 — Rule Builder UI

**Edit:** `src/pages/bn/admin/products/EligibilityRulesTab.tsx` (or current equivalent — will locate first).

**Rule row UX (Add Rule wizard inline):**

```
[Category ▼] → [Fact ▼] → [Operator ▼] → [Value input]
            → [Group ▼] [Severity ▼] [Overrideable ☐] [Save]
```

- Category, Fact, Operator are dropdowns sourced from the registry.
- Value input is rendered per `data_type` (number / date / enum select / yes-no / multi-select for `in`/`between`).
- Group dropdown is the fixed list below.
- Free-text field keys are no longer accepted.

**Rule groups (fixed):**
`CORE_IDENTITY`, `CONTRIBUTION`, `EMPLOYMENT`, `EVENT`, `EVIDENCE`, `EXISTING_BENEFIT`, `SPECIAL`.

Rules are displayed grouped under collapsible group headers, with a count badge per group.

**Templates panel (right side of builder):**

A "Quick Add" list. Clicking a template pre-fills the row — user can adjust the value before saving.

Templates: `Minimum Age`, `Maximum Age`, `Minimum Paid Contributions`, `Minimum Recent Contributions`, `Employer Must Be Active`, `Medical Certificate Required`, `Death Certificate Required`, `No Duplicate Claim`, `Existing Award Required`, `Active Award Required`, `Injury Reported Within X Days`, `Must Be Female`, `Must Be Deceased Contributor`, `School Certificate Required`, `Means Test Passed`.

**Rule preview block** under each row:

```
Business: Total paid contributions must be at least 150 weeks.
Fact: contribution.paid_weeks
Source: bn_claim_contribution_snapshot / ip_wages
Operator: >=
Value: 150
```

**Storage:** `bn_eligibility_rule` (already exists, 15 columns). Persist
`{ fact_key, operator, value, group_code, severity, overrideable, override_policy_code }`.
A small migration adds `group_code`, `severity` (default `BLOCK`), and `overrideable` (default false) if not present.

---

## Phase 3 — Validation, Test Runner, Seeds

**Configuration validation** (`validateRuleSet(productVersionId)`):
Run on Save and on Product Version activation. Fails activation if:
- any rule's `fact_key` is not in the registry,
- any fact has no resolver,
- any rule has no `group_code` or `severity`,
- `overrideable=true` rules have no `override_policy_code`,
- product is missing required groups (e.g., Sickness must have `CONTRIBUTION` and `EVIDENCE`),
- duplicate conflicting rules (same fact + operator with contradictory values).

UI surfaces these as inline errors at the bottom of the rules tab; Product version activation is blocked.

**Rule tester** (inside the builder):
Inputs: claim id **or** SSN + product. Click "Test this rule" → calls `resolveFact` with that context and shows:

| Rule | Actual | Expected | Source | Pass/Fail |

Read-only; no writes.

**Seed migration** (`bn_eligibility_rule` + product mapping) — realistic baselines for: Sickness, Maternity, Employment Injury, Age Pension, Age Grant, Invalidity, Survivors, Funeral Grant, Life Certificate, School Certificate, EFT Update. Per the brief.

---

## Phase 4 — Runtime Wiring

**Edit:** `src/services/bn/productService.ts` and `src/services/bn/forms/sectionCatalogue.ts`'s eligibility evaluator (will locate exact file in Phase 4).

- Replace direct JSON-key lookups with `resolveFact(rule.fact_key, ctx)`.
- Engine returns `{ ruleId, factKey, actual, expected, operator, pass, source }` for every rule — drives the Eligibility Pre-checks step on intake and the rule tester.
- Backwards compatibility: any legacy rule whose `fact_key` is missing in the registry surfaces as `WARN` and blocks activation of any *new* version.

---

## Technical details

**Files created**
- `src/services/bn/eligibility/eligibilityFactRegistry.ts`
- `src/services/bn/eligibility/eligibilityFactResolver.ts`
- `src/services/bn/eligibility/operators.ts`
- `src/services/bn/eligibility/ruleTemplates.ts`
- `src/services/bn/eligibility/validateRuleSet.ts`
- `src/components/bn/eligibility/RuleBuilderRow.tsx`
- `src/components/bn/eligibility/RuleTemplatesPanel.tsx`
- `src/components/bn/eligibility/RuleTester.tsx`
- `src/services/bn/eligibility/__tests__/resolver.test.ts`

**Files edited**
- Product eligibility tab (located in Phase 2).
- Eligibility evaluator (located in Phase 4).
- `bnMenuItems.ts` — no change required (lives under existing Product Catalog).

**Migration**
- `bn_eligibility_rule`: add `group_code text`, `severity text default 'BLOCK'`, `overrideable boolean default false`, `override_policy_code text null` if missing. No RLS changes (per project rule).

**Out of scope (for this redesign)**
- Editing the underlying source tables.
- Adding new resolver categories beyond those listed — extension is trivial in the registry but not in scope here.

---

## Delivery order

1. **Phase 1** — registry + resolvers + operators + tests. ✅ ship & review.
2. **Phase 2** — Rule Builder UI + templates + preview.
3. **Phase 3** — validation + tester + seeds.
4. **Phase 4** — runtime wiring, legacy compatibility.

Approve Phase 1 to start, or tell me to bundle phases differently.