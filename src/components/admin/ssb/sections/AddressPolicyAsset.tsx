/**
 * Address Policy Asset (Epic B4).
 * Wraps AddressPolicyForm in the EnterpriseConfigurationAssetShell.
 */
import { EnterpriseConfigurationAssetShell } from "@/components/enterprise/EnterpriseConfigurationAssetShell";
import AddressPolicyForm from "@/components/admin/ssb/sections/AddressPolicyForm";

export default function AddressPolicyAsset() {
  return (
    <EnterpriseConfigurationAssetShell
      descriptor={{
        assetKey: "ssb.address",
        assetName: "Address Policy",
        assetType: "POLICY",
        ownerDomain: "Social Security Board — Address",
        canonicalRoute: "/admin/ssb-setup",
        canonicalTable: "ssb_address_policy",
        registryEntityKey: "policy.ssb_address",
        description:
          "Address structure, admin levels, geo areas and address fields for Social Security. Consumes the Geography Domain and is used by Member, Employer, Claims and Benefits.",
      }}
    >
      <AddressPolicyForm />
    </EnterpriseConfigurationAssetShell>
  );
}
