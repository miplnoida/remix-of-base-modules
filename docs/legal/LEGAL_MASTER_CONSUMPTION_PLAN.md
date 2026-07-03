# Legal Master Data — Consumption Plan

Purpose: map every Legal form field that currently accepts free text (or an ad-hoc enum) to the correct reference master, so the follow-up **Master Data Consumption Implementation** pass is a mechanical selector swap with no UX guesswork.

Convention:
- Groups live in `core_reference_group` (module `LEGAL`) → resolved via a shared `ReferenceValueSelect` component reading `useLegalReferenceGroup(code)`.
- Court entities resolved via `useLgCourtsAll` (`lg_court*`).
- Fee heads resolved via `lgFeeService.listFeeRules({ head })`.
- Templates resolved via `resolveTemplate(code)` (registry).

## Field → master map

### Intake (`LgIntakeWorkbench`, `lg_case_intake`)
| Field | Current | Target master |
|---|---|---|
| Case type | dropdown (partial) | `LG_CASE_TYPE` |
| Case category | free/enum | `LG_CASE_CATEGORY` |
| Source mode | enum | `LG_CASE_SOURCE_MODE` |
| Priority | enum | `LG_PRIORITY` |
| Risk | free text | `LG_RISK` *(new)* |
| Party role / type | mixed | `LG_PARTY_ROLE`, `LG_PARTY_TYPE` |

### Matter Workspace (`LgCaseDetail`, `lg_case`)
| Field | Target master |
|---|---|
| Stage | `LG_CASE_STAGE` (already) |
| Status | `LG_CASE_STATUS` (already, workflow-driven) |
| Priority / Risk | `LG_PRIORITY`, `LG_RISK` *(new)* |
| Closure reason | `LG_CLOSURE_REASON` |

### Recoverable Liabilities (`lg_recoverable_liability`)
| Field | Current | Target |
|---|---|---|
| `liability_type` | free text | `LG_LIABILITY_TYPE` *(new)* |
| `fund_type` | free text | `LG_FUND_TYPE` *(new)* |
| Write-off reason | free text | `LG_WRITEOFF_REASON` *(new)* |

### Court Operations (`LgHearingWorkbench`, `lg_hearing`, `lg_court_filing`)
| Field | Target |
|---|---|
| Court / Division / Venue | `lg_court`, `lg_court_division`, `lg_court_venue` |
| Judge / Court officer | `lg_court_officer` (filter `officer_type` = Judge/Magistrate) |
| Hearing type | `LG_HEARING_TYPE` (topped up) |
| Hearing outcome | `LG_HEARING_OUTCOME` |
| Filing type / document category | `LG_DOCUMENT_CATEGORY`, `core_template_category` |

### Orders / Judgments (`lg_order`, `lg_judgment_compliance`, `lg_consent_order`)
| Field | Target |
|---|---|
| Order type | `LG_ORDER_TYPE` (topped up) |
| Compliance status | workflow (`lg_workflow_policy`) |
| Cost head on cost order | Fee Master (`lg_fee_rule`) |

### Appeals (`lg_appeal`)
| Field | Current | Target |
|---|---|---|
| Appeal type | free text | `LG_APPEAL_TYPE` *(new)* |
| Grounds | free text | `LG_APPEAL_GROUND` *(new, multi-select)* |
| Appeal fee | free | Fee Master head `LEGAL_APPEAL_FEE` |

### Enforcement (`lg_enforcement_action`)
| Field | Current | Target |
|---|---|---|
| `enforcement_type` | free text | `LG_ENFORCEMENT_TYPE` *(new)* |
| Enforcement fee | free | Fee Master head `LEGAL_RECOVERY_COST` |

### Consent Orders, Settlements, Filings
| Field | Target |
|---|---|
| Consent order type | `LG_ORDER_TYPE` |
| Settlement closure reason | `LG_CLOSURE_REASON` |
| Filing fee | Fee Master `LEGAL_COURT_FILING_FEE` (event-scoped) |

### External Counsel (`lg_external_counsel*`)
| Field | Target |
|---|---|
| Fee head on invoice | Fee Master `LEGAL_ATTORNEY_COST` |
| Engagement scope / matter type | `lg_matter_type` |

### Legal Costs (`lg_legal_cost`)
| Field | Current | Target |
|---|---|---|
| Cost category | free text | Fee Master fee head (never a new master) |
| Fund | free | `LG_FUND_TYPE` *(new)* |
| Recovery status | enum | workflow |

### Legal Recovery Assignments (`lg_recovery_assignment`)
| Field | Target |
|---|---|
| Strategy | `lg_recovery_strategy_type` |
| Campaign | `lg_recovery_campaign_type` |
| Workload rule | `lg_recovery_workload_rule` |
| Fund / Liability filter | `LG_FUND_TYPE`, `LG_LIABILITY_TYPE` *(new)* |
| Priority / Risk | `LG_PRIORITY`, `LG_RISK` *(new)* |
| Closure reason | `LG_CLOSURE_REASON` |

### Admin screens
Existing `LegalReferenceData` admin auto-surfaces every new group because it filters by `module_code = 'LEGAL'` — no code changes required to manage the new groups. `LgTemplateRegistryAdmin`, `LgSlaPoliciesAdmin`, `LgNotificationRulesAdmin`, `LgRecoveryStrategyTypesAdmin`, `LgRecoveryCampaignTypesAdmin`, `LgRecoveryWorkloadRulesAdmin` remain the specialised admins.

## Implementation guidance

1. Prefer a single `ReferenceValueSelect` shared component; do not build one-off dropdowns per screen.
2. Never persist labels — always persist `value_code`.
3. Keep legacy free-text values readable during migration: selector should tolerate values not in the master and show them tagged "(legacy)".
4. Add a lint-style check in code review: new columns of type `text`/`varchar` in `lg_*` tables that describe a category must have a matching reference group before merge.

## Not in this pass

- No mass data backfill of legacy free-text values — will be handled by a targeted normalisation script after selectors are live.
- No new admin screens.
- No workflow changes.
