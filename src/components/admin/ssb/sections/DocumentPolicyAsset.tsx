/**
 * Document Policy — Enterprise Configuration Asset Framework (Epic B2).
 * Wraps existing DocumentPolicyForm inside the standard asset shell.
 */
import { EnterpriseConfigurationAssetShell } from "@/components/enterprise/EnterpriseConfigurationAssetShell";
import DocumentPolicyForm from "@/components/admin/ssb/sections/DocumentPolicyForm";

export default function DocumentPolicyAsset() {
  return (
    <EnterpriseConfigurationAssetShell
      descriptor={{
        assetKey: "ssb.documents",
        assetName: "Document Policy",
        assetType: "POLICY",
        ownerDomain: "Social Security Board — Documents",
        canonicalRoute: "/admin/ssb-setup",
        canonicalTable: "ssb_document_policy",
        registryEntityKey: "policy.ssb_documents",
        description:
          "Required document profiles per SSB process. Profiles resolve against the canonical Document Domain.",
      }}
    >
      <DocumentPolicyForm />
    </EnterpriseConfigurationAssetShell>
  );
}
