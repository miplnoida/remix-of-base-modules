/**
 * Legal Policy — Enterprise Configuration Asset Framework (Epic B3).
 * Wraps existing LegalPolicyForm inside the standard asset shell.
 */
import { EnterpriseConfigurationAssetShell } from "@/components/enterprise/EnterpriseConfigurationAssetShell";
import LegalPolicyForm from "@/components/admin/ssb/sections/LegalPolicyForm";

export default function LegalPolicyAsset() {
  return (
    <EnterpriseConfigurationAssetShell
      descriptor={{
        assetKey: "ssb.legal",
        assetName: "Legal Policy",
        assetType: "POLICY",
        ownerDomain: "Social Security Board — Legal",
        canonicalRoute: "/admin/ssb-setup",
        canonicalTable: "ssb_legal_policy",
        registryEntityKey: "policy.ssb_legal",
        description:
          "Bindings from SSB processes to the canonical Legal Reference Domain (act, section, process).",
      }}
    >
      <LegalPolicyForm />
    </EnterpriseConfigurationAssetShell>
  );
}
