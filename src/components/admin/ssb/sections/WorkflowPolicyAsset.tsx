/**
 * Workflow Policy — Enterprise Configuration Asset Framework (Epic B1).
 * Wraps existing WorkflowPolicyForm; delegates governance/readiness to
 * shared services.
 */
import { EnterpriseConfigurationAssetShell } from "@/components/enterprise/EnterpriseConfigurationAssetShell";
import WorkflowPolicyForm from "@/components/admin/ssb/sections/WorkflowPolicyForm";

export default function WorkflowPolicyAsset() {
  return (
    <EnterpriseConfigurationAssetShell
      descriptor={{
        assetKey: "ssb.workflow",
        assetName: "Workflow Policy",
        assetType: "WORKFLOW",
        ownerDomain: "Social Security Board — Workflow",
        canonicalRoute: "/admin/ssb-setup",
        canonicalTable: "ssb_workflow_policy",
        registryEntityKey: "policy.ssb_workflow",
        description:
          "Binds SSB business processes to canonical workflow definitions published in the Workflow Engine.",
      }}
    >
      <WorkflowPolicyForm />
    </EnterpriseConfigurationAssetShell>
  );
}
