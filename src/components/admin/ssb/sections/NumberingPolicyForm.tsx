import { SsbPolicySectionShell, type SectionConfig } from "@/components/admin/ssb/SsbPolicySectionShell";

const ENTITY_CODES = [
  { value: "MEMBER",   label: "Member (Insured Person)" },
  { value: "EMPLOYER", label: "Employer" },
  { value: "CLAIM",    label: "Claim" },
  { value: "BENEFIT",  label: "Benefit / Award" },
  { value: "INVOICE",  label: "Invoice" },
];

const config: SectionConfig = {
  sectionKey: "numbering",
  assetKey: "ssb.numbering",
  table: "ssb_numbering_policy",
  title: "Numbering Policy",
  description: "Binds each SSB entity to a platform number sequence. Prefix, length and reset policy are configured on the platform sequence itself.",
  scopeColumns: ["profile_id", "entity_code"],
  fields: [
    { name: "entity_code",    label: "Entity", type: "select", options: ENTITY_CODES, required: true },
    { name: "sequence_code",  label: "Platform sequence code", type: "text", required: true, helpText: "core_number_sequence.code, e.g. SSB.KN.MEMBER" },
    { name: "format_pattern", label: "Format pattern", type: "text", placeholder: "M-{yyyy}-{seq:6}", helpText: "Tokens: {yyyy}, {mm}, {seq:N}" },
    { name: "notes",          label: "Notes / reset policy", type: "textarea" },
  ],
  newDraftDefaults: (profileId) => ({
    profile_id: profileId,
    entity_code: "MEMBER",
    sequence_code: "SSB.KN.MEMBER",
    format_pattern: "M-{yyyy}-{seq:6}",
  }),
};

export default function NumberingPolicyForm() {
  return <SsbPolicySectionShell config={config} />;
}
