# Enterprise Configuration Asset Framework — Acceptance (Epic A)

Status: Delivered.
Scope: Framework + one reference asset (Financial Policy).
Legacy impact: **None.** No BN/BEMA/IA/`ip_*`/`er_*`/`cl_*`/`cn_*` table
touched. No new routes. Existing URLs continue to work.

## 1. Framework artefacts

| Artefact | Path | Purpose |
|---|---|---|
| Descriptor + Service | `src/services/enterprise/enterpriseConfigurationAssetService.ts` | Uniform read-model that delegates to existing services |
| Shell (UI)  | `src/components/enterprise/EnterpriseConfigurationAssetShell.tsx` | Reusable header + tabs + actions |
| Framework doc | `docs/enterprise/ENTERPRISE_CONFIGURATION_ASSET_FRAMEWORK.md` | Model, interface, rules |
| Acceptance | `docs/enterprise/ENTERPRISE_CONFIGURATION_ASSET_FRAMEWORK_ACCEPTANCE.md` | This document |

## 2. Reference asset — Financial Policy

- New wrapper: `src/components/admin/ssb/sections/FinancialPolicyAsset.tsx`.
- Wraps the existing `FinancialPolicyForm` inside
  `EnterpriseConfigurationAssetShell` with descriptor
  `{ assetKey: "ssb.financial", assetType: "POLICY", … }`.
- `SsbSetupPage` Financial tab now renders `<FinancialPolicyAsset />`; no
  other tab is changed.
- Existing form behaviour (fields, validation, lifecycle, canonical
  reference sources) is preserved unchanged.

## 3. Delegation map

| Shell surface | Delegated to |
|---|---|
| Configuration tab | Existing form (`FinancialPolicyForm`) |
| Validation tab | `ssbConfigurationGovernanceService.listValidationResults` (scoped to `asset_key`) |
| Dependencies / Consumers | `ssbConfigurationGovernanceService.listDependencies/listConsumers` + `enterpriseConsumptionRegistryService.listDependencies/listConsumers` |
| Readiness summary | derived from the two above; refresh triggers `runSsbSetupValidation` |
| History | Points to `ssb_configuration_snapshot` via Configuration Governance |
| Impact | Points to Enterprise Consumption Registry |

No validation, lifecycle or CRUD logic is re-implemented.

## 4. Non-duplication guarantees

- No new administration module (shell rendered inside existing SSB Setup tab).
- No duplicate Governance screen (validation tab reads governance service).
- No duplicate Platform Readiness (readiness summary reads existing service).
- No duplicate Enterprise Consumption Registry (dependencies read registry).
- No new routes; canonical route pointer only.

## 5. Migration path (Epic B — not in this epic)

Migrate the remaining SSB policy sections to the shell by creating a small
`*Asset.tsx` wrapper per section (mirroring `FinancialPolicyAsset.tsx`) and
swapping the tab content in `SsbSetupPage`:

- Address, Identity, Numbering, Contribution Calendar, Legal, Documents,
  Communication, Workflow.

Non-SSB assets (Workflow Definitions, Notification Templates, Number
Sequences, Banks, Payment Channels) become candidates for Epic B/C once
their descriptors are registered in `ssb_configuration_asset` and the
Enterprise Consumption Registry.

## 6. Rollback

- Revert the two lines in `src/pages/admin/SsbSetupPage.tsx` that switch
  the Financial tab back to `<FinancialPolicyForm />`.
- The framework files (`enterpriseConfigurationAssetService.ts`,
  `EnterpriseConfigurationAssetShell.tsx`, `FinancialPolicyAsset.tsx`)
  can be removed without any database or route change.

## 7. Acceptance

- ✅ Framework shell exists and is reusable.
- ✅ Financial Policy uses the shell as reference implementation.
- ✅ Governance, Platform Readiness and Enterprise Consumption Registry
  are integrated (read-only) — none duplicated.
- ✅ No existing route changed; no new administration screen created.
- ✅ No BN/BEMA/IA/legacy tables changed.
- ✅ Typecheck passes.
