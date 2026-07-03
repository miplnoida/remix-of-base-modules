# Legal Master Data — Existence Audit

Scope: verify every required Legal master / reference item, decide reuse vs. create, and record the final action. No new master **tables** were created; all missing items were added as reference groups + seeded values in the existing `core_reference_group` / `core_reference_value` framework (module_code = `LEGAL`).

Legend for **Action**:
- **Reuse** — existing master is fit for purpose, consume it as-is.
- **Reuse + top-up** — existing group exists but was missing standard SSB values (added via seed).
- **Add group** — no equivalent existed; added as a new `LEGAL` reference group + seed values.
- **N/A** — covered by an existing enterprise capability (workflow, RBAC, DMS) and does not require a master.

## Must-have masters

| # | Item | Existing table / source | Admin screen | Hook / service | Seeded? | Consumed by | Status | Action |
|---|---|---|---|---|---|---|---|---|
| 1 | Courts | `lg_court`, `lg_court_division`, `lg_court_venue` | `LegalCourtAdmin.tsx` | `useLgCourtsAll` | Yes (5 courts) | Hearings, Filings, Orders, Appeals | Exists & consumed | Reuse |
| 2 | Judges / Magistrates | `lg_court_officer` (`officer_type`) | `LegalCourtAdmin.tsx` | `useLgCourtsAll` | Yes (6 officers) | Hearings, Orders | Exists & consumed | Reuse (no separate Judge master needed) |
| 3 | Hearing Types | `core_reference_group.LG_HEARING_TYPE` | Legal Reference Data | `useLegalReferenceGroup` | Yes (5 → topped up to 7) | Hearings, Court Ops | Exists, incomplete | Reuse + top-up |
| 4 | Order / Judgment Types | `core_reference_group.LG_ORDER_TYPE` | Legal Reference Data | ref-value hook | Yes (5 → topped up to 7) | Orders, Judgments, Consent Orders | Exists, incomplete | Reuse + top-up |
| 5 | Appeal Types | *(missing)* → `LG_APPEAL_TYPE` | Legal Reference Data | ref-value hook | Yes (5 seeded) | Appeals | Was missing | Add group |
| 5b | Appeal Grounds | *(missing)* → `LG_APPEAL_GROUND` | Legal Reference Data | ref-value hook | Yes (6 seeded) | Appeals | Was missing | Add group |
| 6 | Enforcement Types | *(missing)* → `LG_ENFORCEMENT_TYPE` (previously free text on `lg_enforcement_action.enforcement_type`) | Legal Reference Data | ref-value hook | Yes (7 seeded) | Enforcement, Recovery | Was missing | Add group |
| 7 | Fund Types | *(missing at legal level)* → `LG_FUND_TYPE` | Legal Reference Data | ref-value hook | Yes (8 seeded) | Recoverable Liabilities, Recovery, Fee Charges | Was missing | Add group (SSB-scoped) |
| 8 | Liability Types | *(missing enum)* → `LG_LIABILITY_TYPE` (previously free text on `lg_recoverable_liability.liability_type`) | Legal Reference Data | ref-value hook | Yes (8 seeded) | Recoverable Liabilities, Assignments, Orders | Was missing | Add group |
| 9 | Fee Master / Cost Types | `lg_fee_rule` + `fee_head_code`; `lg_fee_bundle`; `lg_fee_charge`; `lg_fee_waiver_policy` | `LegalAdminCodeSets`, fee admin | `lgFeeService` | Yes (8 heads) | Fees, Costs, Waivers | Exists & consumed | Reuse — see [Fee Policy](./LEGAL_FEE_MASTER_POLICY.md) |
| 10 | Document Types | `core_template_category` (module `LEGAL`) + `core_reference_group.LG_DOCUMENT_CATEGORY` (11 values) + `lg_document_template_registry` | Legal Reference Data, `LgTemplateRegistryAdmin` | `useLegalDocumentTypes` | Yes | Notices, Templates, Filings | Exists & consumed | Reuse |
| 11 | Legal Status / Stage | `LG_CASE_STATUS` (6), `LG_CASE_STAGE` (10) + workflow config (`lg_case_source_stage`, `lg_workflow_policy`) | Reference Data, Workflow Admin | ref-value hooks | Yes | Cases, Workflow | Exists & consumed | Reuse |
| 12 | Priority Levels | `LG_PRIORITY` (4) | Reference Data | ref-value hook | Yes | Cases, Tasks, Assignments | Exists & consumed | Reuse |
| 12b | Risk Levels | *(missing)* → `LG_RISK` | Reference Data | ref-value hook | Yes (4 seeded) | Health scoring, Assignments | Was missing | Add group |
| 13 | Closure Reasons | `LG_CLOSURE_REASON` | Reference Data | ref-value hook | Yes (5 → topped up to 7) | Case closure, Recovery closure | Exists, incomplete | Reuse + top-up |
| 14 | Write-off Reasons | *(missing at legal level; `cn_write_off.reason` is free text)* → `LG_WRITEOFF_REASON` | Reference Data | ref-value hook | Yes (6 seeded) | Recovery write-offs, Legal cost recovery | Was missing | Add group |

## Config / simple reference

| # | Item | Table | Admin | Status | Action |
|---|---|---|---|---|---|
| 15 | SLA Policies | `lg_sla_policy` | `LgSlaPoliciesAdmin` | Exists & consumed | Reuse |
| 16 | Notification Rules | `lg_notification_rule` | `LgNotificationRulesAdmin` | Exists & consumed | Reuse |
| 17 | Template Registry | `lg_document_template_registry` (+ `core_template`) | `LgTemplateRegistryAdmin`, `LegalTemplateEditor` | Exists & consumed | Reuse |
| 18 | Recovery Strategy Types | `lg_recovery_strategy_type` | `LgRecoveryStrategyTypesAdmin` | Exists & consumed | Reuse |
| 18b | Recovery Campaign Types | `lg_recovery_campaign_type` | `LgRecoveryCampaignTypesAdmin` | Exists & consumed | Reuse |
| 19 | Assignment Statuses | Enum on `lg_recovery_assignment` + workflow policy | Workflow Admin | Sufficient via workflow | Reuse (no separate master) |
| 20 | Territory / Office Settings | `office_locations`, `tb_office`, `lg_department_profile` | Office admin | Shared master | Reuse |
| 21 | Participant / Legal Role Types | `LG_PARTY_ROLE` (22), `LG_PARTY_TYPE` (13), `lg_role_type_mapping` | Reference Data | Exists & consumed | Reuse |
| 22 | Court Venues / Rooms | `lg_court_venue` | `LegalCourtAdmin` | Exists & consumed | Reuse |

## Shared masters (already governed elsewhere — reuse)

| # | Item | Source | Action |
|---|---|---|---|
| 23 | Offices / Territories | `office_locations`, `tb_office` | Reuse |
| 24 | Users / Officers | `profiles`, `lg_staff`, `lg_team_member` | Reuse |
| 25 | External Counsel / Contacts | `lg_external_counsel` (+ engagement, invoice) | Reuse |
| 26 | Employers | `er_master` | Reuse |
| 27 | Insured Persons | `ip_master` | Reuse |

## Deliberately NOT created

Per the plan's creation rules, the following were **not** created — an existing capability already covers them:

- **Court clerk / witness type / external agency** → captured on `lg_court_officer`, `lg_hearing_attendee`, `lg_external_counsel`.
- **Separate Attorney Fee / Legal Cost master** → covered by `lg_fee_rule` fee heads (see [Fee Policy](./LEGAL_FEE_MASTER_POLICY.md)).
- **Order / Hearing / Case status masters** → workflow (`lg_workflow_policy`, stage/transition rules) is the single source of truth.
- **Judge master separate from `lg_court_officer`** → `officer_type` already distinguishes Judge / Magistrate / Registrar.
- **Assignment Status master** → status is enum on `lg_recovery_assignment`, driven by workflow.

## Duplicate check

No duplicates were introduced. All new groups use the `LG_` prefix in the shared `core_reference_group` catalog and are scoped by `module_code = 'LEGAL'`. Seed inserts use `ON CONFLICT DO NOTHING` on `(group_id, value_code)`.

## Remaining gaps

- UI selectors on Appeals, Enforcement, Recoverable Liabilities and Recovery still read free text on some legacy columns — replacement with reference-value selectors is scheduled in the **Master Data Consumption Implementation** pass (see [Consumption Plan](./LEGAL_MASTER_CONSUMPTION_PLAN.md)).
- No net-new admin screens required; the existing `LegalReferenceData` admin exposes the new groups automatically because it filters by `module_code = 'LEGAL'`.
