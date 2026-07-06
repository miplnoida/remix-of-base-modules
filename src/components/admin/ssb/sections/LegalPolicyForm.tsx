import { SsbPolicySectionShell, type SectionConfig } from "@/components/admin/ssb/SsbPolicySectionShell";

const config: SectionConfig = {
  sectionKey: "legal",
  assetKey: "ssb.legal",
  table: "ssb_legal_policy",
  title: "Legal Policy",
  description: "Bindings from KN SSB processes to the Legal Reference Domain. Act, section and process are selected from canonical sources.",
  scopeColumns: ["profile_id", "legal_reference_code", "applies_to"],
  fields: [
    {
      name: "legal_reference_code",
      label: "Legal reference",
      type: "reference",
      required: true,
      source: { table: "core_legal_reference", valueColumn: "ref_code", labelColumn: "short_title", subLabelColumn: "ref_type", filter: { is_active: true }, sourceBadge: "Legal Reference Domain" },
    },
    {
      name: "applies_to",
      label: "Applies to process",
      type: "reference",
      required: true,
      source: { table: "ssb_process_catalogue", valueColumn: "process_code", labelColumn: "process_name", filter: { is_active: true }, sourceBadge: "SSB Process Catalogue" },
    },
    { name: "is_active",  label: "Active",             type: "boolean" },
    { name: "notes",      label: "Deadlines / notes",  type: "textarea", helpText: "Free text only — not used as logic." },
  ],
  newDraftDefaults: (profileId) => ({
    profile_id: profileId,
    legal_reference_code: "",
    applies_to: "",
    is_active: true,
  }),
};

export default function LegalPolicyForm() {
  return <SsbPolicySectionShell config={config} />;
}
