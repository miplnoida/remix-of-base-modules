# SSB Business Process Configuration — Epic 5.1 Acceptance

Additive bridge between SSB policy configuration and business modules for
**Social Security Board — St. Kitts & Nevis**. No policy CRUD, shared-domain
CRUD, benefit/product-builder screens, or BN/BEMA/IA/legacy tables were changed.

## Business processes

| Process key                    | Process name                 | Required policies (resolved via lifecycle) | Optional / recommended |
| ------------------------------ | ---------------------------- | ------------------------------------------ | ---------------------- |
| `member_registration`          | Member Registration          | Address, Identity/NIS, Member Numbering, Documents (MEMBER), Workflow (MEMBER) | Communication |
| `employer_registration`        | Employer Registration        | Address, Employer Numbering, Documents (EMPLOYER), Legal (EMPLOYER), Workflow (EMPLOYER) | Communication |
| `contribution_collection`      | Contribution Collection      | Contribution Calendar, Financial/Payment | Contribution Numbering, Workflow (CONTRIBUTION), Documents, Communication |
| `benefit_administration`       | Benefit Administration       | Financial, Legal, Documents, Workflow, Communication, Contribution Calendar | Benefit Numbering |
| `claims_processing`            | Claims Processing            | Claim Numbering, Workflow (CLAIM), Documents, Identity | Legal, Communication |
| `payments`                     | Payments                     | Financial, Workflow (PAYMENT/BENEFIT) | Payment Numbering, Communication |
| `compliance_case_management`   | Compliance Case Management   | Workflow (CASE/COMPLIANCE), Legal, Documents | Case Numbering, Communication |

## Resolver service

`src/services/ssb-configuration/ssbBusinessProcessConfigService.ts`

Exports:

- `getMemberRegistrationConfiguration(asOfDate?)`
- `getEmployerRegistrationConfiguration(asOfDate?)`
- `getContributionCollectionConfiguration(asOfDate?)`
- `getBenefitAdministrationConfiguration(asOfDate?)`
- `getClaimsProcessingConfiguration(asOfDate?)`
- `getPaymentsConfiguration(asOfDate?)`
- `getComplianceCaseConfiguration(asOfDate?)`
- `listBusinessProcesses(asOfDate?)`
- `getBusinessProcessReadiness(processKey, asOfDate?)`
- `evaluateBenefitsReadiness(asOfDate?)`

Every resolver returns:

```ts
{
  processKey, processName, status: "Ready" | "Partial" | "Missing",
  resolvedPolicies, missingPolicies, optionalWarnings,
  linkedSetupSections, consumers, asOfDate
}
```

All reads go through `ssbPolicyLifecycleService.resolvePolicy` /
`resolveAllPolicies` / `getMemberRegistrationConfig` /
`getEmployerRegistrationConfig` / `getBenefitSetupConfig`. No raw
`ssb_*_policy` queries.

## Hooks

`src/hooks/ssb-configuration/useSsbBusinessProcessConfig.ts`:

- `useSsbBusinessProcesses`
- `useMemberRegistrationConfiguration`
- `useEmployerRegistrationConfiguration`
- `useContributionCollectionConfiguration`
- `useBenefitAdministrationConfiguration`
- `useClaimsProcessingConfiguration`
- `usePaymentsConfiguration`
- `useComplianceCaseConfiguration`
- `useBusinessProcessReadiness(processKey)`
- `useBenefitsReadiness()`

## UI changes

**`/admin/ssb-setup`** — new **Business Processes** tab
(`?section=business_processes`) rendering
`src/components/admin/ssb/BusinessProcessesPanel.tsx`. Each card shows:

- readiness status (Ready / Partial / Missing)
- resolved policies, missing required, optional recommendations
- consuming modules
- **Configure** buttons deep-link to `/admin/ssb-setup?section=<section>`
- **View in Governance** link to `/admin/configuration-governance`

The card never edits policies — it is resolver output only. The legacy
"Process Readiness" tab is retained as-is for backwards compatibility.

**`/admin/configuration-governance`**:

- Header BN Product Builder card now shows Benefit Administration process
  status + governance error count and lists blocking reasons.
- **Validation** tab now includes a **Business Process Readiness** summary
  table above the findings list.

No policy CRUD is duplicated in Governance.

## BN readiness rule

BN Product Builder is **Ready** only when:

1. `getBenefitAdministrationConfiguration()` returns `Ready`, AND
2. Latest governance validation has `errors_count === 0`.

Otherwise BN Product Builder is **Blocked**. The BN HOLD flag is not
auto-lifted — this integration only reports status. An active configuration
package or explicit draft override remains a governance concern and is
surfaced in the Governance page's Active Package card.

## No duplicate CRUD

- Policies are still authored only in `/admin/ssb-setup` section forms.
- Shared masters (banks, legal acts, holidays, templates, geography) are
  still owned by their engines — this layer only references them via
  policy resolvers.
- Governance still owns packages / validation / snapshots — no duplicate UI.
- No new benefit/product builder screens created.

## No legacy impact

No BN, BEMA, IA, or legacy `au_*` / `bn_*` / `bema_*` / `ia_*` tables read
or written. Only reads are:

- `ssb_*_policy` (via lifecycle resolver)
- `ssb_configuration_validation_run` (via governance service)

## Rollback

Delete the new files:

```
src/services/ssb-configuration/ssbBusinessProcessConfigService.ts
src/hooks/ssb-configuration/useSsbBusinessProcessConfig.ts
src/components/admin/ssb/BusinessProcessesPanel.tsx
docs/social-security/SSB_BUSINESS_PROCESS_CONFIGURATION_ACCEPTANCE.md
```

Revert the two touched pages:

```
src/pages/admin/SsbSetupPage.tsx
src/pages/admin/ConfigurationGovernancePage.tsx
```

No database migration, no data change.
