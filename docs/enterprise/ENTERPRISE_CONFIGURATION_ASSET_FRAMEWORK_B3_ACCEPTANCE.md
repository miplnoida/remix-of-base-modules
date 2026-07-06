# Enterprise Configuration Asset Framework — Acceptance (Epic B3)

Status: Delivered.
Scope: Migrate Legal Policy and Identity Policy to the Enterprise
Configuration Asset Shell.

## 1. Migrated assets

| Asset | Wrapper | assetKey | Underlying form (unchanged) |
|---|---|---|---|
| Legal Policy | `src/components/admin/ssb/sections/LegalPolicyAsset.tsx` | `ssb.legal` | `LegalPolicyForm` |
| Identity / NIS Policy | `src/components/admin/ssb/sections/IdentityPolicyAsset.tsx` | `ssb.identity` | `IdentityPolicyForm` |

Both wrappers render `EnterpriseConfigurationAssetShell` with the standard
descriptor (`assetKey`, `assetName`, `assetType: "POLICY"`, `ownerDomain`,
`canonicalRoute: "/admin/ssb-setup"`, `canonicalTable`,
`registryEntityKey`).

## 2. SsbSetupPage wiring

`src/pages/admin/SsbSetupPage.tsx` now renders `<IdentityPolicyAsset />`
and `<LegalPolicyAsset />` in the `identity` and `legal` tabs
respectively. Tab keys, ordering, and labels are unchanged. All other
tabs are untouched.

## 3. Shell surfaces (delegated, not re-implemented)

| Surface | Source |
|---|---|
| Configuration | Existing policy form |
| Validation | `ssbConfigurationGovernanceService.listValidationResults` (scoped to `asset_key`) |
| Dependencies / Consumers | `ssbConfigurationGovernanceService.listDependencies/listConsumers` + `enterpriseConsumptionRegistryService` |
| Readiness / Impact | Derived from validation + consumers; refresh triggers `runSsbSetupValidation` |
| History / Audit | `ssb_configuration_snapshot` via Configuration Governance |
| Lifecycle | `ssbPolicyLifecycleService` (via governance) |

No CRUD, validation, or lifecycle logic re-implemented in either wrapper.

## 4. Non-duplication guarantees

- ✅ No new routes.
- ✅ No new administration screens.
- ✅ No duplicate Governance / Platform Readiness / Enterprise
  Consumption Registry.
- ✅ Existing SSB Setup tabs, URL, and behaviour preserved.
- ✅ No BN/BEMA/IA/`ip_*`/`er_*`/`cl_*`/`cn_*` legacy tables touched.

## 5. Migration progress

| Asset | Status |
|---|---|
| Financial | ✅ Epic A |
| Numbering | ✅ Epic B1 |
| Workflow | ✅ Epic B1 |
| Communication | ✅ Epic B2 |
| Documents | ✅ Epic B2 |
| Legal | ✅ Epic B3 |
| Identity | ✅ Epic B3 |
| Address | ⏳ Remaining |
| Contribution Calendar | ⏳ Remaining |

## 6. Acceptance

- ✅ Legal and Identity policies use the common asset shell.
- ✅ Existing SSB Setup tabs still work.
- ✅ No duplicate governance/readiness/lifecycle logic.
- ✅ Typecheck passes.
