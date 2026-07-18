# Award 360 — Completion Register (AW360-WAVE-1)

Starting SHA: `f203f3ba7f5c8a313b77d3d71fb4ed8d0af445c3`
Owner: Award 360 workspace (`/bn/awards/:id`).
Scope: 13 operational tabs, read-only. No new mutations in this wave.

## Wave 1 Slice status

| Slice | Status |
|-------|--------|
| C1 Slice A — shell refactor + active-tab gating | CODE_COMPLETE |
| C1 Slice A.1 — pensioner alert edge cases | CODE_COMPLETE |
| C1 Slice B — action contract + table-aware schema contract | CODE_COMPLETE |
| C1 Slice B.1 — executable contract certification (scope enforcement, containment lockdown, envelope provenance, exact drift, route resolution, OPEN_CLAIM Option B, expanded gating) | CODE_COMPLETE |

| C1 Slice C — admin dataDiag panel + live 13-tab sweep | NOT STARTED |

Statuses used below: `CODE_COMPLETE` (typechecked + unit-tested against mocks),
`RUNTIME_VERIFIED` (proved against the live browser preview), `BUSINESS_ACCEPTED`,
`CLOSED`. A static schema contract is **not** deployed runtime certification.



Legend: `RO` read-only complete · `RO-P` read-only partial · `TODO` not started · `N/A` not applicable this wave.

| # | Tab | Status | Data source(s) | Permission gate | Notes |
|---|-----|--------|----------------|-----------------|-------|
| 1  | overview           | RO   | `bn_award`, `bn_product`, `bn_claim`, `bn_product_version`; summary aggregates | `AWARD_VIEW` (bn_awards_list.view) | Header + tri-state summary shell certified. |
| 2  | pensioner          | RO   | `ip_master`, `bn_award`, `bn_claim`, `ip_depend`, `bn_payment_profile`, `bn_payment_profile_change_request` | `PENSIONER_VIEW` (+ PAYMENT_PROFILE_VIEW, PERSON_360_VIEW) | SSN masking + `canonicalPersonId=null` when Person360 denied. |
| 3  | claim              | RO   | `bn_claim`, `bn_award`, `bn_claim_queue_assignment`, `bn_product_version`, `bn_claim_eligibility`, `bn_claim_calculation`, `bn_claim_decision`, `bn_claim_evidence`, `bn_doc_requirement`, `bn_claim_event`, `bn_claim_note`, `bn_override_request` | `CLAIM_VIEW` (+ CLAIM_EVIDENCE_VIEW, CLAIM_WORKFLOW_VIEW) | Workflow queries skipped when `canViewWorkflow=false`. Evidence baseline via `bn_doc_requirement`. |
| 4  | product            | RO   | `bn_product`, `bn_product_version`, `bn_product_formula_binding`, `bn_eligibility_rule`, `bn_approval_policy`, `bn_comm_mapping` | `PRODUCT_VIEW` (+ PRODUCT_CONFIGURATION_VIEW) | Explicit column selection; navigation to Formulas/Docs/Screens suppressed when configuration view denied. |
| 5  | beneficiaries      | RO   | `bn_award_beneficiary` | `AWARD_VIEW` | Paged + detail. Row actions gated by `canServiceBeneficiaries`. |
| 6  | schedule           | RO   | `bn_payment_schedule` | `PAYMENT_HISTORY_VIEW` ‖ `PAYMENT_PROFILE_VIEW` | Paged + detail. |
| 7  | payments           | RO   | `bn_payment_instruction` (scoped `award_id`) | `PAYMENT_HISTORY_VIEW` ‖ `PAYMENT_PROFILE_VIEW` | Ordered by `paid_date`. |
| 8  | life-certificates  | RO   | `bn_life_certificate` | `LIFE_CERTIFICATE_VIEW` | Reminder feed + paged. |
| 9  | medical            | RO   | `bn_medical_review_schedule` | `MEDICAL_REVIEW_VIEW` (+ SENSITIVE_MEDICAL_VIEW) | Safe/sensitive column split. |
| 10 | suspensions        | RO   | `bn_award_suspension_event`, `core_workflow_task` | `SUSPENSION_VIEW` | Uses `status`/`entered_at` (never `event_status`/`created_at`). |
| 11 | overpayments       | RO   | `bn_overpayment`, `bn_payment_schedule` | `OVERPAYMENT_VIEW` | Recovery timeline + waiver stub actions. |
| 12 | communications     | RO   | `bn_communication_log`, `bn_letter` | `COMMUNICATION_METADATA_VIEW` (+ CONTENT_VIEW) | Scoped by `claim_id` and `context @> {award_id}`. Subject/body masked without content view. |
| 13 | audit              | RO   | `bn_award_status_event`, `bn_award_rate_history`, `bn_award_suspension_event`, `core_audit_log` | `AWARD_VIEW` (+ CENTRAL_AUDIT_VIEW) | Paged, filtered, source-isolated. Central audit gated. |

## Cross-cutting

- **Permission resolver:** `useAward360Permissions` + `useAward360TabAccess` are the single source of truth.
- **Restricted state:** Full-page + per-tab restricted panels; `?diag=1` shows admin diagnostics.
- **Retry access:** `refetchAllPermissions` is awaitable and surfaces refresh errors.
- **Query cache safety:** Every hook that varies with permissions encodes the flag into its query key.
- **Lazy loading:** Overview + summary always run when Overview visible; deep tabs run only when their tab is active.
- **Source-failure isolation:** Every multi-source loader returns `SectionResult<T>` (`ok | restricted | unavailable`).
- **No mutations:** Static safety test scans Award 360 tree for `.insert/.update/.upsert/.delete` (see `safety.test.ts`).

## AW360-WAVE-1-C1 Slice B.1a — Loader certification checkpoint

Starting SHA: `0e2a509169e32e9395262beed36160f4685ee035`

Six checkpoint loaders executed against the schema contract via the
table-aware `AwardQueryRecorder` (production functions imported directly;
Supabase client mocked at `@/integrations/supabase/client`).

### Executed loaders

| Loader | Scenarios | Tables certified | Status |
|---|---|---|---|
| `getAward360Header` | 4 (`with-ssn-claim-and-version`, `without-ssn`, `without-claim`, `with-claim-no-version`) | `bn_award`, `ip_master`, `bn_product`, `bn_claim`, `bn_product_version` | CODE_COMPLETE |
| `getAwardClaim` | 3 (`linked`, `not-linked`, `missing`) | `bn_award`, `bn_claim` | CODE_COMPLETE |
| `getAwardProduct` | 4 (`with-version`, `without-claim`, `with-claim-no-version`, `missing`) | `bn_award`, `bn_product`, `bn_claim`, `bn_product_version` | CODE_COMPLETE |
| `listAwardCommunications` | 4 (`claim-and-context`, `context-only`, `empty`, `query-error`) | `bn_award`, `bn_communication_log` | CODE_COMPLETE |
| `loadAwardAuditSources` + `listAwardAudit` | 5 (`without-central`, `with-central`, `wrong-scope`, `wrong-fixed-value`, `source-failure`, `flat-wrapper`) | `bn_award_status_event`, `bn_award_rate_history`, `bn_award_suspension_event`, `core_audit_log` | CODE_COMPLETE |
| `getAward360Summary` | 4 (`all-restricted`, `all-includes`, `medical-error`, `comm-error`, `pensioner-restricted`) | `bn_award_beneficiary`, `bn_payment_schedule`, `bn_payment_instruction`, `bn_life_certificate`, `bn_medical_review_schedule`, `bn_award_suspension_event`, `bn_overpayment`, `bn_award`, `bn_communication_log`, `ip_master`, `bn_payment_profile` | CODE_COMPLETE |

### Recorder operations implemented

`select`, `eq`, `neq`, `in`, `is`, `not`, `lt`, `lte`, `gt`, `gte`,
`filter`, `match`, `contains`, `order`, `range`, `limit`, `maybeSingle`,
`single`, `then` + per-table/per-query error injection + loader/scenario
tagging via `runAs()`. `.or()` is intentionally rejected as unsupported.

### Scope rule upgrades

* `core_audit_log` — `allOf(entity_type='bn_award', entity_id)`
  A filter on `entity_id` alone fails; `entity_type='bn_claim'` fails.
* `bn_communication_log` — `anyOf(claim_id, contains(context))`
  Loader may issue either or both queries; each must satisfy anyOf.
* Simple `filter` rules retain the historical
  `required scope filter on "<col>"` diagnostic for backwards compat.

### Route validation

`extractRoutePatterns()` parses every `path="..."` from
`src/components/routing/AppRoutes.tsx` (>100 patterns) and matches
action-catalog templates against those patterns segment-by-segment,
allowing `:param` / `*splat`. Invented routes (e.g.
`/bn/totally-invented`, `/bn/awards/fake/sub-route/deeper`) fail. The
Slice B.1 hardcoded prefix list remains as a legacy sanity check.

### Loader manifest drift

`src/services/bn/awards/award360LoaderManifest.ts` classifies every
public export from the three service files. New async exports without a
manifest entry — or manifest entries pointing to missing exports, or
query loaders without any scenario id — fail
`award360LoaderManifest.test.ts`.

### Schema drift found this checkpoint

None. All queries issued by the six executed loaders pass the contract
without adding invented fields. The `bn_award_status_event` and
`core_audit_log` order-column allow-lists were widened to include
`event_date` / `event_time` — both fields already exist in the live
snapshot and are simply the columns the real loader orders by.

### Pending execution (Slice B.1b)

`getAwardPensioner`, `getAwardPensionerDeep`, `getAwardClaimDeep`,
`getAwardProductDeep`, `getAward360OverviewCounts`,
`listAwardBeneficiaries(Paged)`, `listAwardSchedules(Paged/Detail)`,
`listAwardPayments(Paged)`, `listAwardLifeCertificates(Paged/Reminders)`,
`listAwardMedicalReviews(Paged/Detail)`, `listAwardSuspensions`,
`listAwardOverpayments(Paged/Detail)`,
`listAwardCommunicationsPaged/Detail`, `listAwardAuditPaged`,
`getAwardBeneficiaryDetail`. Estimated 2–3 subsequent batches.

### Final counts

* Award 360 tests: **365** passing (up from 329).
* Files: 40 test files, all green.
* Typecheck: clean (`bunx tsgo --noEmit`).
* CI: harness-only run (no GitHub Actions triggered from this session).

## AW360-WAVE-1-C1 Sub-batch B2-b.1b — Certification evidence system

Status: **CODE_COMPLETE** (evidence derived from mocked execution of
real production loaders — not deployed runtime verification).

* New: `src/services/bn/awards/award360CertificationRegistry.ts`
  registers 9 completed loaders and their scenario ids (dependency-leaf;
  imports nothing from the manifest or contract).
* New: `src/services/bn/awards/award360LoaderEvidence.ts` derives
  `AWARD360_CERTIFIED_LOADERS_BY_TABLE` from registry + manifest.
* Manifest: completed loaders now source `scenarioIds` from the
  registry via `certificationScenariosFor(name)`. Stale entries removed
  (`audit-flat-with-central`, `summary-pensioner-alert-full`).
  `listAwardAudit.expectedTables` corrected to the three award-scoped
  audit sources (compat wrapper never queries `core_audit_log`).
* Recorder: `runAs()` emits a `RecordedScenarioExecution` for every
  invocation — including zero-query and rejected scenarios — via a new
  `onExecutionComplete` sink. Evidence survives ordinary `reset()`.
  Order-rejection diagnostics now include `loader=..., scenario=...`.
* Schema contract renderer: `Loaders` column is derived from
  `AWARD360_CERTIFIED_LOADERS_BY_TABLE` and sorted deterministically.
  Provenance banner reasserts CODE_COMPLETE (not RUNTIME_VERIFIED).
* Reconciliation: `certificationRegistryReconciliation.test.ts`
  proves bidirectional registry ↔ manifest structure; the final
  `describe` in `award360LoaderCertification.test.ts` proves runtime
  evidence — zero-query capture, rejection capture, per-loader table
  union equality against `manifest.expectedTables`, and no unknown
  tables leaked into evidence.
* Query matrix drift: `docs/bn/award360-query-matrix.md` regenerated;
  the exact-drift test now passes the derived loaders map so any manual
  edit to the `Loaders` column fails immediately.

### Final counts (B2-b.1b)

* Award 360 tests: **428** passing (up from 409).
* Typecheck: clean (`bunx tsgo --noEmit`).
* CI: harness-only run (no GitHub Actions triggered from this session).


## AW360-WAVE-1-C1 Sub-batch B2-b.2 — Pensioner Deep source-failure certification

Status: **CODE_COMPLETE** (mocked executable certification of real
production loaders — not deployed runtime verification).

Scope: `getAwardPensionerDeep` only. No Claim Deep, Product Deep,
Overview Counts, or operational-loader certification changes.

### Added scenarios (4)

* `deep-person-query-error` — Primary `ip_master` failure rejects. No
  optional-source result is substituted for the missing person row;
  evidence captures the scenario with `outcome:'rejected'` and honestly
  records `bn_award` + `ip_master` as tables reached.
* `deep-dependants-error` — `ip_depend` error is isolated. Identity,
  payment profile, related claims and related awards remain available;
  `related.dependants = []` with a Dependants partial warning.
* `deep-change-request-error` — `bn_payment_profile_change_request`
  error is isolated. `paymentProfile.present` stays `true` with valid
  bank/method/currency; `pendingChangeRequest = null` and a change-
  request partial warning is surfaced.
* `deep-related-awards-error` — Occurrence-2 `bn_award` failure via
  the recorder's `scenarioErrors` rule. Primary award (occurrence 1)
  succeeds; `related.relatedAwards = []` with a Related-awards partial
  warning; related claims and dependants survive.

### Primary vs. optional failure semantics

* Primary Person failure (`ip_master`) → loader throws, no partial
  warning masquerade.
* Optional enrichment failures (`ip_depend`,
  `bn_payment_profile_change_request`, related `bn_award` occurrence 2)
  → loader resolves with `partialWarnings`.
* Empty successful result is preserved as distinct from an unavailable
  source: an empty `ip_depend` / change-request / related-awards
  response yields the same `[]`/`null` shape without adding a partial
  warning.

### Reconciliation

* `getAwardPensionerDeep` registered scenarios: **13** (9 prior + 4).
* Manifest `scenarioIds` continue to derive from the registry via
  `certificationScenariosFor()`; no manifest edit was required.
* `getAwardPensionerDeep.expectedTables` union remains exact:
  `bn_award, ip_master, ip_depend, bn_payment_profile,
  bn_payment_profile_change_request, bn_claim`.
* Query Matrix `Loaders` column: no drift (derived from manifest).

### Final counts (B2-b.2)

* Award 360 tests: **432** passing (up from 428).
* Typecheck: clean.
* CI: harness-only run (no GitHub Actions triggered from this session).

Remaining B2-b.3 work: Product Deep, Overview Counts, and the remaining
operational-loader certifications.

---

## AW360-WAVE-1-C1 Sub-batch B2-b.3a — Claim Deep schema repair and core-path certification — CODE_COMPLETE

**Scope:** Repair the `bn_claim_eligibility` → `bn_override_request` fabrication,
certify primary Claim Deep paths, permission suppression, exact scope + order
contracts. The full optional-source failure matrix remains **B2-b.3b**.

### Production repair — `getAwardClaimDeep`

* `bn_claim_eligibility.override_id` does NOT exist in the live schema. The
  loader previously selected it and issued a follow-up query against
  `bn_override_request` to display override actor/reason.
* The canonical override metadata (`override_applied`, `override_by`,
  `override_reason`) is stored directly on `bn_claim_eligibility`. The
  eligibility read now maps these fields verbatim; the follow-up query is
  removed.
* `bn_override_request` is a request-history table, not the decision source
  of truth. Reading it for display was incorrect and has been dropped from
  Claim Deep. `bn_override_request` is no longer in the `getAwardClaimDeep`
  `expectedTables` union.
* Historical regression: `bn_claim_eligibility.override_id` added to
  `HISTORICAL_FORBIDDEN_COLUMNS` and to
  `award360SchemaCertification.test.ts` contextual violations.

### Recorder — query-specific successful response rules

`AwardQueryRecorder` gained `ScenarioResponseRule` (parallel to
`ScenarioErrorRule`) so a single scenario can distinguish "primary
`bn_award` returned award X" from "related-awards `bn_award` returned []"
without touching production code. Resolution precedence:

1. Scenario response matching `(loader?, scenario?, table, occurrence?)`.
2. General `responses[table]`.
3. Default empty response.

Occurrences are the immutable IDs assigned at `.from(table)` call time.

### Pensioner Deep — empty-success evidence closed

Three new scenarios replace vacuous `>=0` assertions with concrete
configured data:

* `deep-related-awards-empty-success` — occurrence-2 `bn_award` returns []
  cleanly; `relatedAwards=[]`; no "Related awards" partial warning.
* `deep-dependants-empty-success` — `ip_depend` returns [] cleanly;
  `dependants=[]`; no dependants partial warning.
* `deep-change-request-empty-success` — change-request `maybeSingle` returns
  null cleanly; `pendingChangeRequest=null`; no change-request partial
  warning.

### Claim Deep — order and scope contracts

Order allow-lists added:

* `bn_claim_eligibility`  → `['check_date', 'entered_at']`
* `bn_claim_calculation`  → `['calc_date', 'entered_at']`
* `bn_claim_decision`     → `['performed_at', 'effective_date']`
* `bn_claim_event`        → `['performed_at']`

Existing allow-lists preserved: `bn_claim_queue_assignment.assigned_at`,
`bn_claim_note.entered_at`, `bn_claim.claim_date/submission_date/decision_date/entered_at`.

Loader-specific scope for `bn_claim` under `getAwardClaimDeep` remains
`eq(id)` (declared in Sub-batch B2-b.1a); the negative test
`claim-deep-negative-scope-ssn-only` proves an ssn-only filter is rejected
with `loader=getAwardClaimDeep` in the diagnostic.

### Claim Deep — certified scenarios (13)

`claim-deep-full-access`, `claim-deep-unlinked-award`,
`claim-deep-award-query-error`, `claim-deep-claim-not-found`,
`claim-deep-claim-query-error`, `claim-deep-workflow-restricted`,
`claim-deep-evidence-restricted`, `claim-deep-product-version-missing`,
`claim-deep-queue-empty`, `claim-deep-evidence-empty`,
`claim-deep-document-baseline-empty`, `claim-deep-eligibility-with-override`,
`claim-deep-negative-scope-ssn-only`.

Manifest: `getAwardClaimDeep` no longer marked `pendingExecution`; its
`scenarioIds` are derived from the registry; `bn_override_request` removed
from `expectedTables`. Runtime reconciliation proves the observed table
union equals `expectedTables` across all scenarios.

### Final counts (B2-b.3a)

* Award 360 tests: **448** passing (up from 432).
* Typecheck: clean.
* CI: harness-only run (no GitHub Actions triggered from this session).
* Query Matrix regenerated (`docs/bn/award360-query-matrix.md`).

Remaining B2-b.3b work: full Claim Deep optional-source failure matrix
(eligibility / calculation / decision / evidence / doc-requirement / event /
note / queue / product-version primary failures and empty-success where not
already covered).


---

## AW360-WAVE-1-C1 Sub-batch B2-b.3b — Claim Deep optional-source certification — CODE_COMPLETE

**Scope:** Complete `getAwardClaimDeep` executable certification by
exercising every optional source in isolation, and correct two
registry-accuracy carry-overs from B2-b.3a.

### Registry cleanup

* Removed `claim-deep-negative-scope-ssn-only` from
  `AWARD360_CERTIFICATION_REGISTRY`. The negative scope check is a
  contract-level guard, not a real-loader execution; it now lives in
  `loaderSpecificScope.test.ts` under a dedicated B2-b.3b describe block
  and can no longer inflate the Claim Deep scenario count.
* Removed the mislabelled `deep-empty-related` scenario from
  `getAwardPensionerDeep`. The test injected an error into the second
  `bn_award` query, so it describes an error path already covered by
  `deep-related-awards-error` and cannot honestly describe an
  empty-success case.

### Claim Deep optional-source scenarios (9 new)

Each scenario keeps `fullClaimResponses()` intact and injects an error
into exactly one table via `setErrors`:

| Scenario | Failing table | Key invariants |
| --- | --- | --- |
| `claim-deep-queue-error` | `bn_claim_queue_assignment` | `workbasket=null`, `slaDueAt=null`, `Queue …` partial; Eligibility/Calculation/Decision/Evidence/timeline survive |
| `claim-deep-product-version-error` | `bn_product_version` | `productVersionId` preserved from Claim, `productVersionLabel=null`, no `MISSING_PRODUCT_VERSION` fabrication |
| `claim-deep-eligibility-error` | `bn_claim_eligibility` | `eligibility.present=false`, override actor/reason null, `ELIGIBILITY_NOT_RUN` warning; no `bn_override_request` query |
| `claim-deep-calculation-error` | `bn_claim_calculation` | `calculation.present=false`, `CALCULATION_NOT_RUN`, no fabricated `AWARD_AMOUNT_MISMATCH` |
| `claim-deep-evidence-error` | `bn_claim_evidence` | `evidence.present=false`, requirements query still fires successfully |
| `claim-deep-requirements-error` | `bn_doc_requirement` | Evidence rows preserved (`received=1`, `verified=1`), `required/missing=null`, `baselineUnknown=true` |
| `claim-deep-decision-error` | `bn_claim_decision` | `decision.present=false`, `MISSING_DECISION` warning |
| `claim-deep-events-error` | `bn_claim_event` | Notes remain in timeline; `workflowRestricted=false` |
| `claim-deep-notes-error` | `bn_claim_note` | Events remain in timeline; `workflowRestricted=false` |

Every scenario asserts:

* loader resolves (non-null when Claim is linked),
* exactly the matching partial-warning label appears,
* unrelated sections stay populated with configured fixture data,
* `bn_override_request` remains unqueried,
* observed table union stays within `manifest.expectedTables`,
* scope and order contracts remain active.

### Claim Deep — certified scenarios (21)

12 real-loader scenarios from B2-b.3a (minus the synthetic scope guard) plus
9 optional-source scenarios:

`claim-deep-full-access`, `claim-deep-unlinked-award`,
`claim-deep-award-query-error`, `claim-deep-claim-not-found`,
`claim-deep-claim-query-error`, `claim-deep-workflow-restricted`,
`claim-deep-evidence-restricted`, `claim-deep-product-version-missing`,
`claim-deep-queue-empty`, `claim-deep-evidence-empty`,
`claim-deep-document-baseline-empty`, `claim-deep-eligibility-with-override`,
`claim-deep-queue-error`, `claim-deep-product-version-error`,
`claim-deep-eligibility-error`, `claim-deep-calculation-error`,
`claim-deep-evidence-error`, `claim-deep-requirements-error`,
`claim-deep-decision-error`, `claim-deep-events-error`,
`claim-deep-notes-error`.

Claim Deep now has:

* primary-source failure coverage,
* permission-suppression coverage,
* successful-empty coverage,
* independent optional-source failure coverage,
* exact scope/order enforcement,
* zero `bn_override_request` accesses.

### Reconciliation and drift

* Manifest `scenarioIds` continue to be derived from the registry — no
  drift.
* Observed table union per Claim Deep scenario continues to equal
  `manifest.expectedTables`.
* Loader-to-table map is unchanged (no new tables added).
* `docs/bn/award360-query-matrix.md` requires no regeneration —
  `AWARD360_CERTIFIED_LOADERS_BY_TABLE` is stable.

### Final counts (B2-b.3b)

* Award 360 tests: **461** passing (up from 448).
* Typecheck: clean (harness auto).
* CI: harness-only run (no GitHub Actions triggered from this session).
* Status: **CODE_COMPLETE**; **not** `RUNTIME_VERIFIED`.

Remaining work: Product Deep certification, Overview Counts, operational
loaders (schedules / payments / life certificates / beneficiaries /
overpayments / paged communications), dataDiag and browser runtime
verification.
