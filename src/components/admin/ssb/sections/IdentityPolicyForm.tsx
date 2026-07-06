import { SsbPolicySectionShell, type SectionConfig } from "@/components/admin/ssb/SsbPolicySectionShell";

const IDENTITY_TYPES = [
  { value: "NIS",            label: "NIS Number" },
  { value: "NATIONAL_ID",    label: "National ID" },
  { value: "PASSPORT",       label: "Passport" },
  { value: "TIN",            label: "Tax ID (TIN)" },
  { value: "DRIVER_LICENSE", label: "Driver's Licence" },
  { value: "BIRTH_CERT",     label: "Birth Certificate" },
];

const config: SectionConfig = {
  sectionKey: "identity",
  assetKey: "ssb.identity",
  table: "ssb_identity_policy",
  title: "Identity / NIS Policy",
  description: "Which identity types SSB accepts, which one is the primary (NIS), and the validation pattern used when capturing them. Consumes the shared Identity domain.",
  scopeColumns: ["profile_id", "identity_type_code"],
  fields: [
    { name: "identity_type_code", label: "Identity type", type: "select", options: IDENTITY_TYPES, required: true },
    { name: "is_primary",  label: "Primary identity (NIS)", type: "boolean", helpText: "Exactly one type should be primary" },
    { name: "is_accepted", label: "Accepted for capture",   type: "boolean" },
    { name: "validation_pattern", label: "Validation regex", type: "text", placeholder: "^[0-9]{6,9}$", helpText: "Regex applied to submitted values" },
    { name: "notes", label: "Notes / issuing authority",    type: "textarea" },
  ],
  newDraftDefaults: (profileId) => ({
    profile_id: profileId,
    identity_type_code: "NIS",
    is_primary: true,
    is_accepted: true,
    validation_pattern: "^[0-9]{6,9}$",
  }),
};

export default function IdentityPolicyForm() {
  return <SsbPolicySectionShell config={config} />;
}
