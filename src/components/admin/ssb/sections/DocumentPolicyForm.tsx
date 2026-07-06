import { SsbPolicySectionShell, type SectionConfig } from "@/components/admin/ssb/SsbPolicySectionShell";

const APPLIES_TO = [
  { value: "MEMBER",    label: "Member Registration" },
  { value: "EMPLOYER",  label: "Employer Registration" },
  { value: "CLAIM",     label: "Claim" },
  { value: "BENEFIT",   label: "Benefit" },
  { value: "CONTRIBUTION", label: "Contribution" },
];

const config: SectionConfig = {
  sectionKey: "documents",
  assetKey: "ssb.documents",
  table: "ssb_document_policy",
  title: "Document Policy",
  description: "Which document types are required (or optional) for each SSB process. Consumes the shared DMS document type registry.",
  scopeColumns: ["profile_id", "document_type_code", "applies_to"],
  fields: [
    { name: "document_type_code", label: "Document type code", type: "text", required: true, helpText: "DMS core_dms_document_type.code" },
    { name: "applies_to",         label: "Applies to process", type: "select", options: APPLIES_TO, required: true },
    { name: "is_mandatory",       label: "Mandatory",          type: "boolean" },
    { name: "document_profile_code", label: "Document profile code", type: "text", helpText: "Optional core_document_profile binding" },
    { name: "notes",              label: "Expiry / verification notes", type: "textarea" },
  ],
  newDraftDefaults: (profileId) => ({
    profile_id: profileId,
    document_type_code: "",
    applies_to: "MEMBER",
    is_mandatory: true,
  }),
};

export default function DocumentPolicyForm() {
  return <SsbPolicySectionShell config={config} />;
}
