/**
 * Contribution Calendar Policy Asset (Epic B4).
 * Wraps ContributionCalendarPolicyForm in the EnterpriseConfigurationAssetShell.
 */
import { EnterpriseConfigurationAssetShell } from "@/components/enterprise/EnterpriseConfigurationAssetShell";
import ContributionCalendarPolicyForm from "@/components/admin/ssb/sections/ContributionCalendarPolicyForm";

export default function ContributionCalendarPolicyAsset() {
  return (
    <EnterpriseConfigurationAssetShell
      descriptor={{
        assetKey: "ssb.contribution_calendar",
        assetName: "Contribution Calendar Policy",
        assetType: "POLICY",
        ownerDomain: "Social Security Board — Contribution Calendar",
        canonicalRoute: "/admin/ssb-setup",
        canonicalTable: "ssb_contribution_calendar_policy",
        registryEntityKey: "policy.ssb_contribution_calendar",
        description:
          "Contribution schedule, working-day and due-date rules. Consumes Organisation Calendar, Weekend Rules, Holiday Calendar and Business Day Adjustment. Used by Contribution Collection, Employer Registration, Benefits and Claims.",
      }}
    >
      <ContributionCalendarPolicyForm />
    </EnterpriseConfigurationAssetShell>
  );
}
