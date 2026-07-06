# Enterprise Configuration Asset Framework — Epic B1 Acceptance

Status: Delivered.
Scope: Migrate Numbering Policy and Workflow Policy to the shell.
Reference implementation: Financial Policy (Epic A).

## Wrappers added

| Asset | Wrapper | Descriptor `assetKey` |
|---|---|---|
| Numbering Policy | `src/components/admin/ssb/sections/NumberingPolicyAsset.tsx` | `ssb.numbering` |
| Workflow Policy  | `src/components/admin/ssb/sections/WorkflowPolicyAsset.tsx`  | `ssb.workflow`  |

Both wrap the existing `*PolicyForm` unchanged inside
`EnterpriseConfigurationAssetShell`. `SsbSetupPage` now renders these
wrappers in the Numbering and Workflow tabs.

## Delegation (unchanged from Epic A)

- Validation → `ssbConfigurationGovernanceService`
- Lifecycle → `ssbPolicyLifecycleService` (owned by the inner form)
- Dependencies / Consumers → governance + Enterprise Consumption Registry
- Readiness → derived; refresh calls `runSsbSetupValidation`

No CRUD, validation or lifecycle logic re-implemented.

## Non-duplication

- No new routes.
- No new administration screens.
- No legacy (BN/BEMA/IA/`ip_*`/`er_*`/`cl_*`/`cn_*`) table changes.

## Remaining for Epic B2

Address, Identity, Contribution Calendar, Legal, Documents, Communication.
Same one-file wrapper pattern.

## Acceptance

- ✅ Financial, Numbering, Workflow use the common asset shell.
- ✅ Existing URLs and tabs still work.
- ✅ No duplicate validation or lifecycle logic.
- ✅ Typecheck passes.
