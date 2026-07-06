import { SsbPolicySectionShell, type SectionConfig } from "@/components/admin/ssb/SsbPolicySectionShell";

const APPLIES_TO = [
  { value: "MEMBER",       label: "Member Registration" },
  { value: "EMPLOYER",     label: "Employer Registration" },
  { value: "CONTRIBUTION", label: "Contribution" },
  { value: "CLAIM",        label: "Claim" },
  { value: "BENEFIT",      label: "Benefit Award" },
];

const config: SectionConfig = {
  sectionKey: "workflow",
  assetKey: "ssb.workflow",
  table: "ssb_workflow_policy",
  title: "Workflow / SLA Policy",
  description: "Default workflow, SLA hours, approval levels and escalation policy per SSB process. Consumes the shared Workflow engine.",
  scopeColumns: ["profile_id", "workflow_code", "applies_to"],
  fields: [
    { name: "workflow_code",   label: "Workflow code",  type: "text", required: true, helpText: "Workflow engine template code" },
    { name: "applies_to",      label: "Applies to process", type: "select", options: APPLIES_TO, required: true },
    { name: "sla_hours",       label: "SLA hours",      type: "number", required: true },
    { name: "approval_levels", label: "Approval levels", type: "number" },
    { name: "is_active",       label: "Active",         type: "boolean" },
    { name: "notes",           label: "Escalation / assignment notes", type: "textarea" },
  ],
  newDraftDefaults: (profileId) => ({
    profile_id: profileId,
    workflow_code: "",
    applies_to: "MEMBER",
    sla_hours: 48,
    approval_levels: 1,
    is_active: true,
  }),
};

export default function WorkflowPolicyForm() {
  return <SsbPolicySectionShell config={config} />;
}
