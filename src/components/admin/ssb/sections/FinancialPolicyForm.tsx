import { SsbPolicySectionShell, type SectionConfig } from "@/components/admin/ssb/SsbPolicySectionShell";

const BINDING_KINDS = [
  { value: "CURRENCY",         label: "Default Currency" },
  { value: "PAYMENT_CHANNEL",  label: "Payment Channel" },
  { value: "BANK_LIST",        label: "Bank List" },
  { value: "SETTLEMENT",       label: "Settlement Method" },
  { value: "ACCOUNT_TYPE",     label: "Account Type" },
  { value: "ROUNDING",         label: "Rounding Rule" },
];

const config: SectionConfig = {
  sectionKey: "financial",
  assetKey: "ssb.financial",
  table: "ssb_financial_policy",
  title: "Financial / Payment Policy",
  description: "Default currency, allowed payment channels, banks, settlement methods and rounding. Consumes the shared Financial Reference domain; add one row per binding.",
  scopeColumns: ["profile_id", "binding_kind", "reference_code"],
  fields: [
    { name: "binding_kind",   label: "Binding kind",  type: "select", options: BINDING_KINDS, required: true },
    { name: "reference_code", label: "Reference code", type: "text", required: true, helpText: "e.g. XCD, CASH, BANK_TRANSFER, ROUND_HALF_UP" },
    { name: "is_active",      label: "Active",         type: "boolean" },
    { name: "notes",          label: "Notes",          type: "textarea", helpText: "Include DEFERRED to mark as deferred for MVP" },
  ],
  newDraftDefaults: (profileId) => ({
    profile_id: profileId,
    binding_kind: "PAYMENT_CHANNEL",
    reference_code: "",
    is_active: true,
  }),
};

export default function FinancialPolicyForm() {
  return <SsbPolicySectionShell config={config} />;
}
