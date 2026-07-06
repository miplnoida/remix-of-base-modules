import { SsbPolicySectionShell, type SectionConfig } from "@/components/admin/ssb/SsbPolicySectionShell";

const config: SectionConfig = {
  sectionKey: "identity",
  assetKey: "ssb.identity",
  table: "ssb_identity_policy",
  title: "Identity / NIS Policy",
  description: "Which identity types SSB accepts, which one is primary (NIS), and the validation pattern applied. Values are selected from the canonical Identity Domain — no manual codes.",
  scopeColumns: ["profile_id", "identity_type_code"],
  fields: [
    {
      name: "identity_type_code",
      label: "Identity type",
      type: "reference",
      required: true,
      source: { table: "ssp_identity_type", valueColumn: "code", labelColumn: "name", filter: { is_active: true }, sourceBadge: "Identity Domain" },
    },
    { name: "is_primary",  label: "Primary identity (NIS)", type: "boolean", helpText: "Exactly one type should be primary" },
    { name: "is_accepted", label: "Accepted for capture",   type: "boolean" },
    {
      name: "validation_pattern",
      label: "Validation pattern",
      type: "reference",
      helpText: "Pick a canonical validation pattern (regex + checksum) from the Identity Domain.",
      source: { table: "ssp_identity_validation_pattern", valueColumn: "code", labelColumn: "name", subLabelColumn: "regex", filter: { is_active: true }, sourceBadge: "Identity Domain · Pattern" },
    },
    { name: "notes", label: "Notes / issuing authority", type: "textarea", helpText: "Free text only — not used as logic." },
  ],
  newDraftDefaults: (profileId) => ({
    profile_id: profileId,
    identity_type_code: "",
    is_primary: true,
    is_accepted: true,
  }),
};

export default function IdentityPolicyForm() {
  return <SsbPolicySectionShell config={config} />;
}
