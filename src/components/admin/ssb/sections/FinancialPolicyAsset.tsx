/**
 * Financial Policy — Reference implementation of the Enterprise
 * Configuration Asset Framework (Epic A).
 *
 * Wraps the existing FinancialPolicyForm inside
 * EnterpriseConfigurationAssetShell. No behaviour is changed — validation,
 * lifecycle, dependencies and readiness are read from existing services.
 */
import { EnterpriseConfigurationAssetShell } from "@/components/enterprise/EnterpriseConfigurationAssetShell";
import FinancialPolicyForm from "@/components/admin/ssb/sections/FinancialPolicyForm";

export default function FinancialPolicyAsset() {
  return (
    <EnterpriseConfigurationAssetShell
      descriptor={{
        assetKey: "ssb.financial",
        assetName: "Financial / Payment Policy",
        assetType: "POLICY",
        ownerDomain: "Social Security Board — Financial",
        canonicalRoute: "/admin/ssb-setup",
        canonicalTable: "ssb_financial_policy",
        registryEntityKey: "policy.ssb_financial",
        description:
          "Default currency, payment channels, banks, settlement methods and account types for Social Security. All values are sourced from the canonical Financial Reference domain.",
      }}
    >
      <FinancialPolicyForm />
    </EnterpriseConfigurationAssetShell>
  );
}
