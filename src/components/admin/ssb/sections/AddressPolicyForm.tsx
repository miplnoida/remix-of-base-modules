import { SsbPolicySectionShell, type SectionConfig } from "@/components/admin/ssb/SsbPolicySectionShell";

const ADDRESS_COMPONENTS = [
  { value: "street",  label: "Street" },
  { value: "village", label: "Village" },
  { value: "parish",  label: "Parish" },
  { value: "island",  label: "Island" },
  { value: "postal_code", label: "Postal Code" },
  { value: "country", label: "Country" },
];

const config: SectionConfig = {
  sectionKey: "address",
  assetKey: "ssb.address",
  table: "ssb_address_policy",
  title: "Address & Geography Policy",
  description: "Which address components apply to KN, which are mandatory, and whether parish/village hierarchy is used. Consumes the shared Geography domain.",
  scopeColumns: ["profile_id", "country_code"],
  fields: [
    { name: "country_code",   label: "Country Code", type: "text", required: true, helpText: "ISO-2, e.g. KN", placeholder: "KN" },
    { name: "mandatory_fields", label: "Mandatory address fields", type: "multiselect", options: ADDRESS_COMPONENTS, helpText: "Selected fields are required at capture time" },
    { name: "optional_fields",  label: "Optional address fields",  type: "multiselect", options: ADDRESS_COMPONENTS },
    { name: "admin_level_codes", label: "Admin hierarchy codes", type: "json", helpText: "Ordered list matching Geography levels, e.g. [\"ISLAND\",\"PARISH\",\"VILLAGE\"]" },
    { name: "use_parish",  label: "Use parish level",  type: "boolean" },
    { name: "use_village", label: "Use village level", type: "boolean" },
  ],
  newDraftDefaults: (profileId) => ({
    profile_id: profileId,
    country_code: "KN",
    mandatory_fields: ["street", "parish", "island", "country"],
    optional_fields: ["village", "postal_code"],
    admin_level_codes: ["ISLAND", "PARISH", "VILLAGE"],
    use_parish: true,
    use_village: true,
  }),
};

export default function AddressPolicyForm() {
  return <SsbPolicySectionShell config={config} />;
}
