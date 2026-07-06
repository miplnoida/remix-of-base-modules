import { SsbPolicySectionShell, type SectionConfig } from "@/components/admin/ssb/SsbPolicySectionShell";

/**
 * Workflow / SLA Policy
 *
 * Canonical workflow source = `workflow_definitions` (the same table the
 * working `/admin/workflows` screen reads/writes). Process code is sourced
 * from the SSB Process Catalogue. No free-text workflow codes are accepted —
 * the selector stores the stable workflow_definitions.id.
 */

const config: SectionConfig = {
  sectionKey: "workflow",
  assetKey: "ssb.workflow",
  table: "ssb_workflow_policy",
  title: "Workflow / SLA Policy",
  description: "Default workflow, SLA, approval levels and escalation policy per SSB process. Process is selected from the SSB Process Catalogue; the workflow itself is bound to a published entry in the canonical Workflow Engine (/admin/workflows → workflow_definitions).",
  scopeColumns: ["profile_id", "workflow_code", "applies_to"],
  fields: [
    {
      name: "applies_to",
      label: "Applies to process",
      type: "reference",
      required: true,
      source: { table: "ssb_process_catalogue", valueColumn: "process_code", labelColumn: "process_name", filter: { is_active: true }, sourceBadge: "SSB Process Catalogue" },
    },
    {
      name: "workflow_code",
      label: "Workflow (Workflow Engine)",
      type: "reference",
      required: true,
      helpText: "Select a published workflow from /admin/workflows. Stores the workflow_definitions.id.",
      source: { table: "workflow_definitions", valueColumn: "id", labelColumn: "name", filter: { is_active: true }, sourceBadge: "Workflow Engine" },
    },
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

