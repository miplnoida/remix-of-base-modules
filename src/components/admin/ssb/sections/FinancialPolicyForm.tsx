import { SsbPolicySectionShell, type SectionConfig, type ReferenceSource } from "@/components/admin/ssb/SsbPolicySectionShell";

/**
 * Financial / Payment Policy — canonical-source form.
 *
 * P0 fix: the "Reference Code" text field is REMOVED. Users must pick from
 * the canonical Financial Reference domain via a dependent selector that
 * changes source table based on the chosen binding kind.
 */

const BINDING_KINDS = [
  { value: "CURRENCY",         label: "Default Currency" },
  { value: "PAYMENT_CHANNEL",  label: "Payment Channel" },
  { value: "BANK_LIST",        label: "Bank" },
  { value: "BANK_BRANCH",      label: "Bank Branch" },
  { value: "ACCOUNT_TYPE",     label: "Account Type" },
  { value: "SETTLEMENT_METHOD", label: "Settlement Method" },
];

// Canonical sources per binding kind.
const SOURCE_BY_KIND: Record<string, ReferenceSource> = {
  CURRENCY:        { table: "ssp_currency_profile",       valueColumn: "currency_code", labelColumn: "currency_name",  filter: { is_active: true }, sourceBadge: "Financial Reference · Currency" },
  BANK_LIST:       { table: "ssp_bank",                   valueColumn: "bank_code",     labelColumn: "bank_name",      filter: { is_active: true }, sourceBadge: "Financial Reference · Bank" },
  BANK_BRANCH:     { table: "ssp_bank_branch",            valueColumn: "branch_code",   labelColumn: "branch_name",    filter: { is_active: true }, sourceBadge: "Financial Reference · Bank Branch" },
  ACCOUNT_TYPE:    { table: "ssp_account_type",           valueColumn: "account_code",  labelColumn: "account_name",   filter: { is_active: true }, sourceBadge: "Financial Reference · Account Type" },
  // PAYMENT_CHANNEL and SETTLEMENT resolve against dedicated Financial Reference tables.
  // They must NOT be sourced from ssp_communication_channel — that domain is communication-only.
  PAYMENT_CHANNEL: { table: "ssp_payment_channel",        valueColumn: "channel_code",  labelColumn: "channel_name",   filter: { is_active: true }, sourceBadge: "Financial Reference · Payment Channel" },
  SETTLEMENT:      { table: "ssp_settlement_method",      valueColumn: "method_code",   labelColumn: "method_name",    filter: { is_active: true }, sourceBadge: "Financial Reference · Settlement Method" },
};

const config: SectionConfig = {
  sectionKey: "financial",
  assetKey: "ssb.financial",
  table: "ssb_financial_policy",
  title: "Financial / Payment Policy",
  description: "Default currency, allowed payment channels, banks, settlement methods and account types. Every value is selected from the canonical Financial Reference domain — free-text codes are no longer accepted.",
  scopeColumns: ["profile_id", "binding_kind", "reference_code"],
  fields: [
    { name: "binding_kind",   label: "Binding kind",  type: "select", options: BINDING_KINDS, required: true },
    {
      name: "reference_code",
      label: "Canonical reference",
      type: "reference",
      required: true,
      helpText: "Select from Financial Reference — the underlying source changes with the binding kind above.",
      sourceResolver: (v) => SOURCE_BY_KIND[v.binding_kind] ?? null,
    },
    { name: "is_active",      label: "Active",              type: "boolean" },
    { name: "notes",          label: "Notes (non-logic)",   type: "textarea", helpText: "Free text only. Include DEFERRED to mark this binding as deferred for MVP." },
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
