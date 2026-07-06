# Enterprise Configuration Asset Framework — Epic B2 Acceptance

Status: Delivered.
Scope: Migrate Communication Policy and Document Policy to the shell.
Reference: Financial (Epic A), Numbering & Workflow (Epic B1).

## Wrappers added

| Asset | Wrapper | `assetKey` |
|---|---|---|
| Communication Policy | `src/components/admin/ssb/sections/CommunicationPolicyAsset.tsx` | `ssb.communication` |
| Document Policy      | `src/components/admin/ssb/sections/DocumentPolicyAsset.tsx`      | `ssb.documents`     |

Both wrap the existing `*PolicyForm` unchanged inside
`EnterpriseConfigurationAssetShell`. `SsbSetupPage` Communication and
Documents tabs now render the wrappers.

## Delegation (unchanged)

- Validation → `ssbConfigurationGovernanceService`
- Lifecycle → `ssbPolicyLifecycleService` (owned by inner form)
- Dependencies / Consumers → governance + Enterprise Consumption Registry
- Readiness → derived; refresh calls `runSsbSetupValidation`

No CRUD, validation or lifecycle logic re-implemented.

## Assets migrated so far

Financial · Numbering · Workflow · Communication · Documents.

## Remaining (Epic B3)

Address, Identity, Contribution Calendar, Legal.

## Acceptance

- ✅ Five policies use the common asset shell.
- ✅ Existing URLs and tabs still work.
- ✅ No duplicate governance/readiness/lifecycle logic.
- ✅ No new routes, no legacy table changes.
- ✅ Typecheck passes.
