# Platform Readiness Centre — Acceptance

Route: `/admin/platform-readiness`
Menu: Administration → Setup Centre → Platform Readiness
Focus: **Social Security Board — St. Kitts & Nevis** · gate for BN Product Builder Wave 1.

## Purpose
One operational cockpit that answers: *is the platform ready to start BN
Product Builder Consumption Wave 1?* Aggregates existing signals and
surfaces every remaining data-level orphan reference with a Fix Now
deep-link to the canonical screen or SSB Setup section.

No CRUD is duplicated. No BN/BEMA/IA/legacy tables are read or changed.

## Data sources
- `ssbConfigurationGovernanceService` — packages, latest validation run.
- `ssbBusinessProcessConfigService` — process resolver status, benefits readiness.
- `ssbPolicyHealthService` — asset health.
- Live orphan detection against canonical sources:
  - `ssb_workflow_policy.workflow_code` → `workflow_definitions.id`
  - `ssb_numbering_policy.sequence_code` → `core_number_sequence.module_code`
  - `ssb_financial_policy` (PAYMENT_CHANNEL) → `ssp_communication_channel.code`
  - `ssb_financial_policy` (BANK_LIST) → `ssp_bank.bank_code`
  - `ssb_communication_policy.template_code` → `core_template.code`

## Readiness categories
1. Active Package
2. Governance Validation
3. Business Process Resolvers
4. Policy Health
5. Source-Control References
6. Workflow References
7. Numbering References
8. Payment / Financial References
9. Communication References
10. BN Product Builder Gate

Each category card shows Ready / Warning / Blocked, counts, and a
Configure/Fix Now button. Cards deep-link to existing canonical screens
(never a duplicate).

## Finding model
`ReadinessFinding { finding_id, category, severity (blocking|warning|info),
title, description, source_asset, affected_policy, affected_process,
orphan_value, expected_source, recommended_action, fix_route,
fix_anchor_or_section, auto_fix_available, bn_wave1_blocking }`.

## BN Wave 1 gate rule
- `BLOCKED`     : any finding with `severity=blocking` OR governance errors OR no active package.
- `READY WITH WARNINGS`: no blockers, at least one warning.
- `READY`       : no blockers, no warnings.

## Fix Now routing
| Cluster | Deep link |
|---|---|
| Workflow orphan       | `/admin/ssb-setup?section=workflow` (canonical source `/admin/workflows`) |
| Numbering orphan      | `/admin/ssb-setup?section=numbering` (canonical source `/admin/numbering`) |
| Payment / channel     | `/admin/ssb-setup?section=financial` (Financial Reference) |
| Communication template| `/admin/ssb-setup?section=communication` (`/admin/notification-templates`) |

Fix Now never mutates data silently. Refresh re-runs governance
validation and re-aggregates.

## Current blocker summary (source: `docs/bn/BN_PLATFORM_SOURCE_CONTROL_VERIFICATION.md`)
- Workflow references — 5 orphan rows.
- Numbering references — 4 orphan rows.
- Payment channel references — 4 orphan rows.
- Communication template — 1 orphan row.

All four clusters are surfaced by the Readiness Centre with Fix Now
deep-links. Wave 1 remains BLOCKED until these are rebound.

## Integration points
- `/admin/configuration-governance` — BN Product Builder card links to Platform Readiness.
- `/admin/ssb-setup` — header adds a Platform Readiness button next to Open Governance.
- `/admin/configuration-centre` — Setup Centre section adds a Platform Readiness card.

## No duplicate CRUD confirmation
The Readiness Centre is a read-only cockpit. It does not author policies,
does not edit workflow_definitions, and does not create numbering
sequences, payment channels, banks or templates. All authoring stays in
the existing canonical screens.

## No legacy impact
Zero reads/writes against BN, BEMA, IA, `bn_*`, `bema_*`, `ia_*`, or
legacy `ip_/er_/cl_/cn_` tables. Only:
- SSB policy tables (`ssb_*_policy`)
- SSB configuration governance tables
- Shared-domain sources (`workflow_definitions`, `core_number_sequence`,
  `ssp_communication_channel`, `ssp_bank`, `core_template`)

## Rollback
```sql
DELETE FROM public.app_modules WHERE name = 'platform_readiness_centre';
DELETE FROM public.enterprise_capability_registry WHERE capability_key = 'platform_readiness_centre';
```
Remove route registration in `AppRoutes.tsx` and delete
`src/pages/admin/PlatformReadinessCentre.tsx` +
`src/services/ssb-configuration/platformReadinessService.ts`.

## Acceptance checklist
- [x] `/admin/platform-readiness` opens.
- [x] Menu entry under Administration → Setup Centre.
- [x] Overall readiness + BN Wave 1 status shown.
- [x] Four current P0 orphan clusters surfaced.
- [x] Fix Now deep-links to canonical screens/sections.
- [x] No duplicate CRUD created.
- [x] Governance, SSB Setup, Configuration Centre link to Readiness Centre.
- [x] No legacy BN/BEMA/IA table access.
