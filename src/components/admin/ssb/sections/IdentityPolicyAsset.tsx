/**
 * Identity Policy — Enterprise Configuration Asset Framework (Epic B3).
 * Wraps existing IdentityPolicyForm inside the standard asset shell.
 */
import { EnterpriseConfigurationAssetShell } from "@/components/enterprise/EnterpriseConfigurationAssetShell";
import IdentityPolicyForm from "@/components/admin/ssb/sections/IdentityPolicyForm";

export default function IdentityPolicyAsset() {
  return (
    <EnterpriseConfigurationAssetShell
      descriptor={{
        assetKey: "ssb.identity",
        assetName: "Identity / NIS Policy",
        assetType: "POLICY",
        ownerDomain: "Social Security Board — Identity",
        canonicalRoute: "/admin/ssb-setup",
        canonicalTable: "ssb_identity_policy",
        registryEntityKey: "policy.ssb_identity",
        description:
          "Accepted identity types, primary NIS identifier, and validation pattern sourced from the canonical Identity Domain.",
      }}
    >
      <IdentityPolicyForm />
    </EnterpriseConfigurationAssetShell>
  );
}
