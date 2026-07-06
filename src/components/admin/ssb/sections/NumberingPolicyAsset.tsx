/**
 * Numbering Policy — Enterprise Configuration Asset Framework (Epic B1).
 * Wraps existing NumberingPolicyForm; delegates governance/readiness to
 * shared services.
 */
import { EnterpriseConfigurationAssetShell } from "@/components/enterprise/EnterpriseConfigurationAssetShell";
import NumberingPolicyForm from "@/components/admin/ssb/sections/NumberingPolicyForm";

export default function NumberingPolicyAsset() {
  return (
    <EnterpriseConfigurationAssetShell
      descriptor={{
        assetKey: "ssb.numbering",
        assetName: "Numbering Policy",
        assetType: "NUMBERING",
        ownerDomain: "Social Security Board — Numbering",
        canonicalRoute: "/admin/ssb-setup",
        canonicalTable: "ssb_numbering_policy",
        registryEntityKey: "policy.ssb_numbering",
        description:
          "Prefixes, sequences and formats for SSB business documents. All sequences resolve against Platform Numbering (core_number_sequence).",
      }}
    >
      <NumberingPolicyForm />
    </EnterpriseConfigurationAssetShell>
  );
}
