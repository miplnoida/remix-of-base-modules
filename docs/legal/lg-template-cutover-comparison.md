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
- [x] `useLegalSetupValidation` now checks Core Template presence by code (no legacy read)
- [x] Read-only users (LEGAL_READ_ONLY) see banner + Core editor's own gating suppresses Save/Publish
- [x] **Channel variants** — all 15 migrated Core Legal templates now expose explicit
      `PDF` (default) and `PRINT_LETTER` (LETTER) `core_template_channel_variant` rows so
      workflow/dispatch resolves the correct channel without relying on `template_type` alone.
      11 already carried the full channel set from the initial Core seed; the remaining 4
      (`LG-TPL-JUDGMENT-SUMMONS`, `LG-TPL-REQUEST-INFO-SOURCE`, `LG-TPL-SUMMONS`,
      `LG-TPL-WARRANT-COMMIT`) had `PDF` + `PRINT_LETTER` inserted in migration
      `20260701_legal_core_channel_variants`.
- [x] **Approval status** — migrated rows kept as `v1 PUBLISHED / ACTIVE`; each `core_template.description`
      carries a `[MIGRATED_FROM_LEGACY_LEGAL v1 PUBLISHED on 2026-07-01 …]` audit note.
- [x] Build/typecheck passes

### Retirement gate (must all be true before physical drop)

- [ ] Core Legal templates verified in Legal Template Management by Legal Admin
- [ ] Notice / letter / PDF generation verified from Core (spot-check per channel variant)
- [ ] Workflow-triggered template generation verified from Core (`lgStageTemplateService`)
- [ ] Zero runtime reads of `legal_templates` or `notification_templates WHERE category='legal'`
      (grep-verified in `src/`; only deprecation comments and this doc reference the names)
- [ ] `/legal/admin/policy` (`lg_workflow_policy`) — remains read-only until its own cut-over
      comparison is signed off

Once all four gate items are checked, drop `legal_templates` and strip the
`category='legal'` code path from `notification_templates` in a single follow-up
migration. Until then, both tables stay in place, unreferenced by runtime code
and clearly annotated as deprecated in `src/services/legal/lgTemplateService.ts`.

---

## 6. Business decisions (recorded)

1. **Channel variants** — Explicit `PDF` + `PRINT_LETTER` (LETTER) variants seeded for
   all 15 migrated Legal Core templates. `template_type` remains for classification;
   channel usage is now explicit for dispatch/workflow resolution. **Applied.**
2. **Approval status** — Migrated rows stay at `v1 PUBLISHED / ACTIVE`. Audit note
   stamped in `core_template.description`. Legal Admin re-approval **not** required
   for the migration itself. **Applied.**
3. **Legacy retirement** — Legacy tables kept deprecated / read-only for one release
   cycle. Physical drop only after all four retirement-gate items above are checked.
   **In effect.**

