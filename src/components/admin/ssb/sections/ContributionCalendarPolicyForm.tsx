import { SsbPolicySectionShell, type SectionConfig } from "@/components/admin/ssb/SsbPolicySectionShell";

const config: SectionConfig = {
  sectionKey: "contribution",
  assetKey: "ssb.contribution_calendar",
  table: "ssb_contribution_calendar_policy",
  title: "Contribution Calendar Policy",
  description: "Contribution period, filing due day, payment due day and grace behaviour for KN. Consumes the shared Calendar / Holidays engine for working days.",
  scopeColumns: ["profile_id"],
  fields: [
    { name: "contribution_period", label: "Contribution period", type: "select", required: true,
      options: [
        { value: "MONTHLY",   label: "Monthly" },
        { value: "WEEKLY",    label: "Weekly" },
        { value: "QUARTERLY", label: "Quarterly" },
      ] },
    { name: "filing_due_day",  label: "Filing due day (of month)",  type: "number", required: true, helpText: "1–31" },
    { name: "payment_due_day", label: "Payment due day (of month)", type: "number", required: true },
    { name: "fiscal_year_start_month", label: "Fiscal year start month", type: "number", helpText: "1 = January" },
    { name: "notes", label: "Grace / interest rule notes", type: "textarea", helpText: "e.g. 5 grace days, interest accrues on day 15 (SSA Cap.329 s.26)" },
  ],
  newDraftDefaults: (profileId) => ({
    profile_id: profileId,
    contribution_period: "MONTHLY",
    filing_due_day: 14,
    payment_due_day: 14,
    fiscal_year_start_month: 1,
  }),
};

export default function ContributionCalendarPolicyForm() {
  return <SsbPolicySectionShell config={config} />;
}
