# Enterprise Configuration Asset Framework — Epic B4 Acceptance

**Status:** ✅ Complete — Platform v1.0 Freeze Candidate

## Scope

Migrate the final two SSB policies — Address and Contribution Calendar — into the Enterprise Configuration Asset Shell, completing the 9-asset framework.

## Deliverables

| # | Asset | Wrapper | Shell | Lifecycle | Validation | Deps | Consumers | Impact | History | Readiness |
|---|-------|---------|-------|-----------|------------|------|-----------|--------|---------|-----------|
| 1 | Financial | `FinancialPolicyAsset` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2 | Workflow | `WorkflowPolicyAsset` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3 | Numbering | `NumberingPolicyAsset` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 4 | Communication | `CommunicationPolicyAsset` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 5 | Documents | `DocumentPolicyAsset` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 6 | Legal | `LegalPolicyAsset` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 7 | Identity | `IdentityPolicyAsset` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 8 | **Address** | `AddressPolicyAsset` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 9 | **Contribution Calendar** | `ContributionCalendarPolicyAsset` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Address Asset

- `assetKey: ssb.address`
- Registry entity: `policy.ssb_address`
- **Consumes:** Geography Domain, Address Fields, Admin Levels, Geo Areas
- **Used By:** Member Registration, Employer Registration, Claims, Benefits
- Existing relational child tables **unchanged**. No JSON.

## Contribution Calendar Asset

- `assetKey: ssb.contribution_calendar`
- Registry entity: `policy.ssb_contribution_calendar`
- **Consumes:** Organisation Calendar, Weekend Rules, Holiday Calendar, Business Day Adjustment
- **Used By:** Contribution Collection, Employer Registration, Benefits, Claims
- Working-day/due-date/lifecycle previews remain in the underlying form.
- Existing relational child tables **unchanged**.

## Non-duplication

- No new routes.
- No new admin pages.
- Governance → `ssbConfigurationGovernanceService` (single instance).
- Lifecycle → `ssbPolicyLifecycleService` (single instance).
- Dependencies/Consumers → `enterpriseConsumptionRegistryService` (single instance).
- Readiness → `enterpriseConfigurationAssetService.loadAssetReadiness` (derived from `runSsbSetupValidation`).
- No BN/BEMA/IA/legacy table changes.

## Acceptance

- ✅ Address migrated
- ✅ Contribution Calendar migrated
- ✅ Nine assets share identical shell
- ✅ No duplicated governance/readiness/lifecycle
- ✅ Existing URLs unchanged
- ✅ Existing behaviour unchanged
- ✅ Typecheck passes

See also: `PLATFORM_CONFIGURATION_ASSET_COMPLIANCE_REPORT.md`.
