import { SsbPolicySectionShell, type SectionConfig } from "@/components/admin/ssb/SsbPolicySectionShell";

const APPLIES_TO = [
  { value: "ACT",         label: "Governing Act" },
  { value: "MEMBER",      label: "Member" },
  { value: "EMPLOYER",    label: "Employer" },
  { value: "CONTRIBUTION",label: "Contribution" },
  { value: "CLAIM",       label: "Claim" },
  { value: "BENEFIT",     label: "Benefit" },
  { value: "APPEAL",      label: "Appeal" },
  { value: "PENALTY",     label: "Penalty" },
];

const config: SectionConfig = {
  sectionKey: "legal",
  assetKey: "ssb.legal",
  table: "ssb_legal_policy",
  title: "Legal Policy",
  description: "Bindings from KN SSB processes to the Legal Reference domain — acts, sections, appeal timelines and statutory deadlines.",
  scopeColumns: ["profile_id", "legal_reference_code", "applies_to"],
  fields: [
    { name: "legal_reference_code", label: "Legal reference code", type: "text", required: true, helpText: "e.g. CAP329, CAP329.S26" },
    { name: "applies_to",           label: "Applies to",           type: "select", options: APPLIES_TO, required: true },
    { name: "is_active",            label: "Active",               type: "boolean" },
    { name: "notes",                label: "Deadlines / notes",    type: "textarea" },
  ],
  newDraftDefaults: (profileId) => ({
    profile_id: profileId,
    legal_reference_code: "CAP329",
    applies_to: "ACT",
    is_active: true,
  }),
};

export default function LegalPolicyForm() {
  return <SsbPolicySectionShell config={config} />;
}
