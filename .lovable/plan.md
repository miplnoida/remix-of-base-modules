
## Goal
Make every eligibility rule executable against real business facts. No more `field=CLAIM / op=REFER / value=Yes` placeholders. EI-REPORT-3D must actually compute `days_between(injury_date, reported_date ?? submission_date) <= 3`.

## 1. Schema (migration)
Extend `bn_eligibility_rule` with typed-rule columns (additive, nullable — existing data preserved):
- `rule_kind` enum: `LITERAL | FACT_TO_FACT | DATE_DIFFERENCE | DOCUMENT_STATUS | EXISTS | CROSS_PRODUCT | DERIVED_FACT | CONDITIONAL`
- `start_fact_key`, `end_fact_key`, `fallback_end_fact_key` (DATE_DIFFERENCE)
- `compare_fact_key` (FACT_TO_FACT)
- `document_type_code`, `required_status` (DOCUMENT_STATUS)
- `existence_check_code` (EXISTS / CROSS_PRODUCT)
- `unit` enum: `DAYS | WEEKS | MONTHS | YEARS`
- `severity` enum: `BLOCKING | REFER | WARNING | INFO`
- `overrideable bool`, `override_policy_code`, `reason_code_group`
- `conditional_when jsonb` (CONDITIONAL pre-guard)
- `message_template text`
Keep legacy `field_name/operator/expected_value` for LITERAL fallback.
Add `bn_eligibility_diagnostic` table (run_id, rule_id, source_fact, resolver, actual_value, expected_value, operator, result, severity, override_status, evaluated_at) for trace persistence.

## 2. Fact Registry (`eligibilityFactRegistry.ts` rewrite)
Replace current registry with all facts listed in the brief, grouped:
Person, Contribution, Employer, Claim, Document, Existing, Medical, MedicalBoard, MeansTest, Beneficiary, PaymentProfile, Applicant.
Each entry: `{ key, label, group, type, unit?, resolverId, source, sample, description }`. Add `getFactsByKind(kind)` helpers so the builder only shows compatible facts per rule kind.

## 3. Resolver layer (`eligibilityFactResolver.ts`)
Add resolvers for new facts (or stub with `notImplemented:true` flag surfaced in diagnostics) mapped to:
- `ip_master`, `ip_wages`, `ip_wages_ann_sum`, `er_master`
- `bn_claim`, `bn_claim_document`, `bn_claim_evidence`
- `bn_award`, `bn_award_beneficiary`
- `bn_medical_recommendation`, `bn_payment_profile`
Resolver returns `{ value, sourceTable, sourceColumn, missing }` so diagnostics can render.

## 4. Rule Builder UI (`EligibilityRulesTab.tsx` + new `RuleWizardDialog`)
Step wizard replacing the flat grid:
1. Pick **Rule Kind** (cards with descriptions)
2. Pick **Fact(s)** from registry — filtered by kind, grouped picker, no free-text
3. Pick **Operator** — driven by fact type + rule kind
4. Configure **value / second fact / period+unit / document type+status / existence code**
5. **Severity** select
6. **Override** toggle + policy + reason group
7. **Message template**
Existing list still renders rows but now shows `rule_kind` badge and human-readable summary built from registry (e.g. *"Days between Injury date → Reported date (fallback Submission date) ≤ 3 DAYS — REFER"*).

## 5. Evaluator updates (`operatorEvaluator.ts` + new `ruleEvaluator.ts`)
- `evaluateRule(rule, context)` dispatches on `rule_kind`.
- DATE_DIFFERENCE: resolve start + end (fallback if end missing) → compute diff in unit → compare.
- DOCUMENT_STATUS: lookup `bn_claim_document` row by type, compare status.
- EXISTS / CROSS_PRODUCT: call existence resolver.
- FACT_TO_FACT: resolve both facts, coerce to common type, apply operator.
- CONDITIONAL: evaluate `conditional_when` first; skip if false.
- Every eval emits a diagnostic record (in-memory + optional persist).

## 6. Diagnostics panel
New `RuleDiagnosticsPanel` shown on the rule row (expandable) and inside the simulator: source fact, resolver/table, actual, expected, operator, pass/fail, severity, override status. Wired to evaluator output.

## 7. Configuration validator (extend `validateProductChannelConfig.ts`)
Add checks blocking publish:
- unknown fact key
- missing resolver
- DATE_DIFFERENCE missing start/end
- DOCUMENT_STATUS missing document_type_code
- value type mismatch with fact type
- seeded placeholder values (`REFER`, `Yes`) used as literal expected
Surface in existing `ChannelConfigValidationPanel`.

## 8. Re-seed SKN rules (data migration via insert tool, not schema)
Rewrite seeded rules for: Sickness, Maternity, Employment Injury (incl. fixed **EI-REPORT-3D**), Disablement, Invalidity, Age, Survivors, Funeral, NCP, Life Certificate, School Certificate, EFT Update — using new columns, exactly per the spec list.

## 9. Tests
Extend `eligibility/__tests__/registry.test.ts` and add `ruleEvaluator.test.ts` covering each rule kind incl. EI-REPORT-3D pass/fail/fallback.

## Delivery order (separate turns to keep diffs reviewable)
1. **Migration** (schema + diagnostic table) — review & approve.
2. **Registry + resolver + evaluator** + unit tests.
3. **Builder wizard UI + diagnostics panel**.
4. **Validator extensions + re-seed SKN rules**.

## Out of scope (call out)
- Wiring evaluator into batch claim processing (only intake pre-check uses it now).
- Real `medical_board.invalidity_confirmed`, `means_test.result` data sources — seeded as resolvers returning `missing:true` until source tables exist; diagnostics will flag them. Confirm OK?

## Question before I start
Two things to confirm so I don't ping-pong:
- (a) OK that medical-board / means-test facts ship as stub resolvers (flagged `notImplemented`) until backing tables exist?
- (b) Should I keep legacy rows readable (rule_kind defaulting to `LITERAL`) and migrate them lazily, or hard-rewrite all existing seeded rules in this pass?
