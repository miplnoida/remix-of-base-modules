import { SsbPolicySectionShell, type SectionConfig } from "@/components/admin/ssb/SsbPolicySectionShell";

/**
 * Workflow / SLA Policy
 *
 * Process code is sourced from the SSB Process Catalogue. Workflow code is
 * still free text pending a canonical Workflow Engine template registry —
 * governance surfaces this as a deferred WARNING rather than blocking.
 */

const SLA_UNITS = [
  { value: "HOURS", label: "Hours" },
  { value: "DAYS",  label: "Business days" },
];

const config: SectionConfig = {
  sectionKey: "workflow",
  assetKey: "ssb.workflow",
  table: "ssb_workflow_policy",
  title: "Workflow / SLA Policy",
  description: "Default workflow, SLA, approval levels and escalation policy per SSB process. Process is selected from the SSB Process Catalogue; workflow templates will move to canonical selection once the Workflow Engine registry is exposed.",
  scopeColumns: ["profile_id", "workflow_code", "applies_to"],
  fields: [
    {
      name: "applies_to",
      label: "Applies to process",
      type: "reference",
      required: true,
      source: { table: "ssb_process_catalogue", valueColumn: "process_code", labelColumn: "process_name", filter: { is_active: true }, sourceBadge: "SSB Process Catalogue" },
    },
    { name: "workflow_code",   label: "Workflow code (Workflow Engine)", type: "text", required: true, helpText: "Deferred: canonical selector pending Workflow Engine template registry." },
    { name: "sla_hours",       label: "SLA hours",      type: "number", required: true },
    { name: "approval_levels", label: "Approval levels", type: "number" },
    { name: "is_active",       label: "Active",         type: "boolean" },
    { name: "notes",           label: "Escalation / assignment notes", type: "textarea", helpText: "Free text only — not used as logic." },
  ],
  newDraftDefaults: (profileId) => ({
    profile_id: profileId,
    workflow_code: "",
    applies_to: "",
    sla_hours: 48,
    approval_levels: 1,
    is_active: true,
  }),
};

export default function WorkflowPolicyForm() {
  return <SsbPolicySectionShell config={config} />;
}
