import { SsbPolicySectionShell, type SectionConfig } from "@/components/admin/ssb/SsbPolicySectionShell";

const config: SectionConfig = {
  sectionKey: "numbering",
  assetKey: "ssb.numbering",
  table: "ssb_numbering_policy",
  title: "Numbering Policy",
  description: "Binds each SSB process/entity to a platform number sequence. Entity and sequence are selected from canonical registries — no manual codes.",
  scopeColumns: ["profile_id", "entity_code"],
  fields: [
    {
      name: "entity_code",
      label: "SSB process / entity",
      type: "reference",
      required: true,
      source: { table: "ssb_process_catalogue", valueColumn: "process_code", labelColumn: "process_name", filter: { is_active: true }, sourceBadge: "SSB Process Catalogue" },
    },
    {
      name: "sequence_code",
      label: "Platform number sequence",
      type: "reference",
      required: true,
      helpText: "Configured on the Platform Numbering engine — prefix, length and reset policy live there.",
      source: { table: "core_number_sequence", valueColumn: "module_code", labelColumn: "entity_type", subLabelColumn: "prefix_pattern", filter: { is_active: true }, sourceBadge: "Platform Numbering" },
    },
    { name: "format_pattern", label: "Format pattern (literal preview)", type: "text", placeholder: "M-{yyyy}-{seq:6}", helpText: "Literal output preview only — the real pattern is owned by the platform sequence." },
    { name: "notes", label: "Notes (non-logic)", type: "textarea" },
  ],
  newDraftDefaults: (profileId) => ({
    profile_id: profileId,
    entity_code: "",
    sequence_code: "",
  }),
};

export default function NumberingPolicyForm() {
  return <SsbPolicySectionShell config={config} />;
}
