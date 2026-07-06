/**
 * Communication Policy — Enterprise Configuration Asset Framework (Epic B2).
 * Wraps existing CommunicationPolicyForm inside the standard asset shell.
 */
import { EnterpriseConfigurationAssetShell } from "@/components/enterprise/EnterpriseConfigurationAssetShell";
import CommunicationPolicyForm from "@/components/admin/ssb/sections/CommunicationPolicyForm";

export default function CommunicationPolicyAsset() {
  return (
    <EnterpriseConfigurationAssetShell
      descriptor={{
        assetKey: "ssb.communication",
        assetName: "Communication Policy",
        assetType: "POLICY",
        ownerDomain: "Social Security Board — Communication",
        canonicalRoute: "/admin/ssb-setup",
        canonicalTable: "ssb_communication_policy",
        registryEntityKey: "policy.ssb_communication",
        description:
          "Binds notification templates per channel per SSB process. Templates and channels resolve against the canonical Communication Domain.",
      }}
    >
      <CommunicationPolicyForm />
    </EnterpriseConfigurationAssetShell>
  );
}
