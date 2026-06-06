
# Smart BN Configuration Screens — Phased Rollout

This is a large, cross-cutting refactor across 15 configuration screens. Doing it all in a single pass would be risky (regressions, TypeScript breakage, hard to review). I propose a **4-phase rollout** that builds shared foundations first, then upgrades each screen incrementally.

Please confirm the phase order (or tell me to start with a specific screen, e.g. Product Catalog or Formula Library first).

---

## Phase 1 — Shared foundations (build once, reuse everywhere)

Create the reusable building blocks every screen will depend on.

**Smart components** (`src/components/bn/smart/`):
- `SmartSelect` — searchable dropdown wrapper around `SearchableSelect` with async loading
- `ReferenceLookup` — picks a record from a library (formula, document, workbasket, etc.) with preview chip
- `CodeFieldWithAutoGenerate` — auto-suggests codes from prefix + sequence, blocks duplicates (server-checked)
- `RuleBuilder` — condition rows: field → operator (filtered by field type) → value control (filtered by field type)
- `FormulaBuilder` — token-based formula editor with variable picker, operator toolbar, live parser, output type
- `ConditionBuilder` — used by escalation/transition preconditions
- `ValidationSummary` — re-used (already exists; extend for config context)
- `ConfigPreviewPanel` — right-side panel showing live preview / test result / trace
- `ReadOnlyVersionBanner` — enforced when status ∈ {ACTIVE, PENDING_APPROVAL, RETIRED}

**Registries & services** (`src/services/bn/registries/`):
- `eligibilityFieldRegistry.ts` — typed catalogue (person.age_at_claim_date, contribution.paid_weeks, …) with `{ key, label, type, sourceTable, sourceColumn, sampleValue }`
- `formulaVariableRegistry.ts` — allowed variables (avg_weekly_wage, paid_weeks, rate_pct, …) with type + sample
- `smartFieldRegistry.ts` — UI field types (SSN_LOOKUP, MONEY, DECLARATION_CHECKBOX, …)
- `transitionRegistry.ts` — allowed (fromStatus, action, toStatus) tuples per benefit branch
- `communicationEventRegistry.ts` — fires on which workflow events
- `operatorRegistry.ts` — operators per data type (number/string/boolean/date/list)
- `configLookupService.ts` — fetches library records (formulas, documents, workbaskets, escalation policies, reason codes, screens, workflows, comm templates) and caches with react-query

**Formula parser** (`src/lib/bn/formulaParser.ts`):
- Tokenize, validate variables against registry, return AST + output type + errors
- `evaluateFormula(ast, inputs)` for the test/trace button

**Audit hook**:
- `useBnConfigAudit` — writes to `system_audit_trail` on every save, capturing before/after JSON

---

## Phase 2 — High-impact screens (Product Catalog + Libraries)

Upgrade screens where uncontrolled text is most dangerous.

1. **Product Catalog** + version detail
   - All metadata fields → dropdowns (country, scheme, branch, category, payment type, duration type)
   - Version assembly tabs: each picker uses `ReferenceLookup` against the corresponding library
   - Status gating: DRAFT editable, others read-only
2. **Formula Library** — `FormulaBuilder` + validate/test/trace buttons
3. **Document Library** + **Service Document Types** — controlled category/stage/file-type fields, duplicate-code block
4. **Reason Codes** — category, applies-to multi-select, toggles
5. **Rule Group Library** — auto-generated code, category dropdown, sort order

---

## Phase 3 — Workflow & medical screens

6. **Workbaskets** — owning role / queue type / assignment strategy / SLA dropdowns
7. **Escalation Policies** — `ConditionBuilder` + numeric+unit + target role
8. **Transition Matrix** — from/action/to builder, blocks invalid transitions via `transitionRegistry`
9. **Medical Policy Library** — review type/interval/board-required/outcome controls
10. **Screen & Field Library** — field-type dropdown driven by `smartFieldRegistry`; per-field channels/roles/source adapter/validation

---

## Phase 4 — Governance, simulation, validation

11. **Rule Version Governance** — actions-only UI (compare/submit/approve/reject/publish/retire/rollback) + diff view; remove any inline rule editing
12. **Calculation Simulator** — pick product + version → auto-load formula inputs from registry → run → trace + expected-vs-actual
13. **Configuration Validation Dashboard** — new checks:
    - missing required references
    - invalid formula variables (parser-checked)
    - invalid eligibility field keys (registry-checked)
    - missing required documents / workflow / comm templates
    - overlapping active versions
    - duplicate codes
    - orphan records
    - active references to inactive library records
14. **Country Pack** — country/locale/calendar/currency dropdowns; no free-text where a list exists

---

## Technical notes

- **No new database schema** is strictly required for Phase 1–3 (the existing `bn_*` tables already cover this). Phase 4 may add a `bn_config_validation_findings` cache table — I'll surface a migration only if you confirm Phase 4.
- All dropdowns load via react-query with 60s staleTime; cached in `configLookupService`.
- All writes go through a single `saveWithAudit()` wrapper to guarantee `system_audit_trail` entries with `user_code`.
- Read-only enforcement is centralized in a `useVersionEditability(versionId)` hook so every screen behaves identically.
- TypeScript: every registry is exported as a `const` tuple + derived union type so the compiler catches typos at call sites.

---

## What I need from you

Pick one:
- **(A)** Proceed in order: Phase 1 → 2 → 3 → 4 (recommended). I'll deliver Phase 1 first, then pause for review.
- **(B)** Start with a specific screen (e.g. Product Catalog or Formula Library) end-to-end, foundations built only as needed.
- **(C)** Different ordering — tell me which screens are highest priority.
