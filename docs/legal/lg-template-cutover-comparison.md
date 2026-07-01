# Legal Templates → Core Template — Cut-over Comparison

**Status:** Data migration complete (Phase 1 + Phase 4). Runtime swap and UI
gating deployed (Phase 2 + Phase 3). Legacy tables remain read-only pending
Legal Admin sign-off, mirroring the `lg_workflow_policy` cadence.

**Guiding rule:** Core stores template content. Legal stores only *which
template to use when* (`lg_stage_template_mapping`).

---

## 1. Source stores — before vs after

| Store | Before | After |
|---|---:|---:|
| `legal_templates` (Legal-only, raw HTML, no versioning) | 15 active | **0 active** — all marked `is_active=false`, `status='MIGRATED_TO_CORE'`, description stamped `[MIGRATED_TO_CORE:<core_template_id>]` |
| `notification_templates` where `category='legal'` | 9 enabled | **0 enabled** — `is_enabled=false`, description stamped `[MIGRATED_TO_CORE:<core_template_id>]` |
| `core_template` where `module_code='LEGAL'` | 66 | **68** (added `LG-TPL-JUDGMENT-SUMMONS`, `LG-TPL-REQUEST-INFO-SOURCE`) |
| `core_template_token` where `module_code='LEGAL'` | 19 | **31** (added 12 tokens — party/employer/member/hearing/court/officer/etc.) |
| `lg_stage_template_mapping` | 42 active | 42 (unchanged — already Core-backed) |
| `lg_notice.template_ref_id` | 8 rows, all NULL | 8 rows, all NULL (no repointing required) |

---

## 2. Legacy `legal_templates` → Core mapping

| Legacy `type` | Legacy name | Core `code` | Notes |
|---|---|---|---|
| DEMAND_LETTER | Demand Letter | `LG-TPL-DEMAND-LETTER` | exact |
| FINAL_DEMAND_LETTER | Final Demand Letter | `LG-TPL-FINAL-DEMAND` | exact |
| PAYMENT_ARRANGEMENT_LETTER | Agreement / Payment Arrangement Letter | `LG-TPL-PAYPLAN-LEGAL` | exact |
| ADJOURNMENT_LETTER | Adjournment Letter | `LG-TPL-ADJOURNMENT` | template_type = NOTICE (acceptable) |
| JUDGMENT_LETTER | Judgment Letter | `LG-TPL-JUDGMENT` | template_type = NOTICE (acceptable) |
| SUMMONS_APPEAR | Summons to Appear | `LG-TPL-SUMMONS` | exact |
| **JUDGMENT_SUMMONS** | Judgment Summons | **`LG-TPL-JUDGMENT-SUMMONS`** | **NEW — body imported from legacy** |
| WRIT_EXECUTION | Writ of Execution | `LG-TPL-EXECUTION` | exact |
| WARRANT_COMMITMENT | Warrant / Commitment | `LG-TPL-WARRANT-COMMIT` | exact |
| COURT_ORDER_NOTICE | Court Order Recording Notice | `LG-TPL-FINAL-ORDER` | closest equivalent |
| SETTLEMENT_CONFIRMATION | Settlement Confirmation | `LG-TPL-SETTLE-TERMS` | exact |
| PAYMENT_DEFAULT_NOTICE | Payment Default Notice | `LG-TPL-PAYMENT-DEFAULT` | exact |
| ENFORCEMENT_NOTICE | Enforcement Notice | `LG-TPL-ENFORCEMENT` | exact |
| CASE_CLOSURE | Case Closure Letter | `LG-TPL-CASE-CLOSURE` | exact |
| **REQUEST_INFO_SOURCE** | Request for Information from Source Department | **`LG-TPL-REQUEST-INFO-SOURCE`** | **NEW — body imported from legacy** |

---

## 3. Legacy `notification_templates` (category='legal') → Core mapping

| Legacy `template_code` | Core `code` |
|---|---|
| LG_DEMAND_LETTER | `LG-TPL-DEMAND-LETTER` |
| LG_FINAL_DEMAND | `LG-TPL-FINAL-DEMAND` |
| LG_NOTICE_BEFORE_ACTION | `LG-TPL-NBA` |
| LG_HEARING_NOTICE | `LG-TPL-HEARING-NOTICE` |
| LG_COURT_FILING_COVER | `LG-TPL-COURT-COVER` |
| LG_SETTLEMENT_OFFER | `LG-TPL-SETTLEMENT-OFFER` |
| LG_PAYMENT_DEFAULT | `LG-TPL-PAYMENT-DEFAULT` |
| LG_JUDGMENT_NOTICE | `LG-TPL-JUDGMENT` |
| LG_ENFORCEMENT_NOTICE | `LG-TPL-ENFORCEMENT` |

All 9 already existed in Core — content stays canonical in Core; the
notification-table rows were simply disabled to remove the parallel runtime
read path.

---

## 4. Runtime path — before vs after

| Consumer | Before | After |
|---|---|---|
| `/legal/notices` (`NoticeGeneration`) | `notification_templates` where `category='legal'` via `lgTemplateService` | `core_template` (module=LEGAL) via `lgTemplateService` → `coreTemplateResolverService.resolveActiveVersion` |
| `/legal/admin/templates` (`LegalTemplateManagement`) | Core Template UI, filtered to LEGAL | **Unchanged** — plus new banner + read-only gating |
| `/legal/admin/stage-template-mapping` | `lg_stage_template_mapping` → `core_template` | **Unchanged** — this is the sanctioned Legal-side mapping surface |
| Stage-driven document generation (`lgStageTemplateService`) | Already Core-backed via `lg_stage_template_mapping` | **Unchanged** |

---

## 5. Verification checklist

- [x] All 15 legacy `legal_templates` rows deprecated with Core pointer in description
- [x] All 9 legacy `notification_templates` legal rows deprecated with Core pointer
- [x] 2 new Core templates created for legacy types with no prior Core equivalent
- [x] Every Legal event/stage covered by an active `lg_stage_template_mapping` row (42 mappings retained)
- [x] `lg_notice.template_ref_id` values audited (all NULL — no repointing needed)
- [x] 12 missing LEGAL tokens registered in `core_template_token`
- [x] Runtime `NoticeGeneration` now resolves via Core (no `notification_templates` read)
- [x] Read-only users (LEGAL_READ_ONLY) see banner + Core editor's own gating suppresses Save/Publish
- [x] Build/typecheck passes
- [ ] **Business sign-off** to physically retire legacy tables (drop `legal_templates`; strip `category='legal'` handling from `notification_templates`) — pending, mirrors `lg_workflow_policy` retirement cadence
- [ ] Channel variants (LETTER + PDF) — deferred to sign-off; migrated templates currently use `template_type` on the Core row only
- [ ] `/legal/admin/policy` (`lg_workflow_policy`) — remains read-only until its own cut-over comparison is signed off

---

## 6. Pending business confirmations

1. **Channel defaults** — should the 15 migrated Legal templates each get an explicit `LETTER` + `PDF` `core_template_channel_variant`, or is the row-level `template_type` sufficient for the first cut? *Default currently applied: `template_type` only.*
2. **Approval state on migration** — migrated templates were published as `v1 PUBLISHED / ACTIVE` since the legacy rows were already published. Confirm this vs. requiring Legal Admin re-approval.
3. **Legacy table retirement date** — how long after sign-off before we drop `legal_templates` and remove the `category='legal'` code path from `notification_templates`?
