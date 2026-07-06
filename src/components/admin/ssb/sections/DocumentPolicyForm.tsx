import { SsbPolicySectionShell, type SectionConfig } from "@/components/admin/ssb/SsbPolicySectionShell";

const config: SectionConfig = {
  sectionKey: "documents",
  assetKey: "ssb.documents",
  table: "ssb_document_policy",
  title: "Document Policy",
  description: "Which document types are required (or optional) for each SSB process. Values are selected from the DMS / Document Configuration and the SSB Process Catalogue.",
  scopeColumns: ["profile_id", "document_type_code", "applies_to"],
  fields: [
    {
      name: "document_type_code",
      label: "Document type",
      type: "reference",
      required: true,
      source: { table: "core_dms_document_type", valueColumn: "document_type_code", labelColumn: "document_type_name", filter: { is_active: true }, sourceBadge: "DMS · Document Type" },
    },
    {
      name: "applies_to",
      label: "Applies to process",
      type: "reference",
      required: true,
      source: { table: "ssb_process_catalogue", valueColumn: "process_code", labelColumn: "process_name", filter: { is_active: true }, sourceBadge: "SSB Process Catalogue" },
    },
    { name: "is_mandatory",   label: "Mandatory", type: "boolean" },
    {
      name: "document_profile_code",
      label: "Document profile",
      type: "reference",
      helpText: "Optional binding to a canonical document profile (print/DMS/signature rules).",
      source: { table: "core_document_profile", valueColumn: "code", labelColumn: "name", filter: { is_active: true }, sourceBadge: "DMS · Document Profile" },
    },
    { name: "notes", label: "Expiry / verification notes", type: "textarea", helpText: "Free text only — not used as logic." },
  ],
  newDraftDefaults: (profileId) => ({
    profile_id: profileId,
    document_type_code: "",
    applies_to: "",
    is_mandatory: true,
  }),
};

export default function DocumentPolicyForm() {
  return <SsbPolicySectionShell config={config} />;
}
