import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorkflowDesigner from "@/components/workflow/WorkflowDesigner";
import WorkflowList from "@/components/workflow/WorkflowList";
import WorkflowRuns from "@/components/workflow/WorkflowRuns";
import WorkflowData from "@/components/workflow/WorkflowData";
import WorkflowTemplates from "@/components/workflow/WorkflowTemplates";
import WorkflowSettings from "@/components/workflow/WorkflowSettings";
import WorkflowStepsManager from "@/components/workflow/WorkflowStepsManager";
import WorkflowExecutionMonitor from "@/components/workflow/WorkflowExecutionMonitor";
import WorkflowAnalytics from "@/components/workflow/WorkflowAnalytics";
import WorkflowApprovals from "@/components/workflow/WorkflowApprovals";
import SecuredWorkflowApprovals from "@/components/workflow/SecuredWorkflowApprovals";
import WorkflowActivityFeed from "@/components/workflow/WorkflowActivityFeed";
import WorkflowDelegation from "@/components/workflow/WorkflowDelegation";
import WorkflowPerformanceReports from "@/components/workflow/WorkflowPerformanceReports";
import WorkflowSLAConfig from "@/components/workflow/WorkflowSLAConfig";
import WorkflowSLAMonitor from "@/components/workflow/WorkflowSLAMonitor";
import WorkflowWebhooks from "@/components/workflow/WorkflowWebhooks";
import WorkflowEmailReports from "@/components/workflow/WorkflowEmailReports";
import WorkflowSecuritySettings from "@/components/workflow/WorkflowSecuritySettings";

export default function WorkflowManagement() {
  const [activeTab, setActiveTab] = useState("designer");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workflow Management</h1>
        <p className="text-muted-foreground">
          Visual workflow designer and execution engine for SKN Social Security
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="responsive-tabs">
          <TabsTrigger value="designer">Designer</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="execution">Execution</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="secured-queue">Secured Queue</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="delegation">Delegation</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="sla">SLA</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="designer" className="mt-6">
          <WorkflowDesigner />
        </TabsContent>

        <TabsContent value="workflows" className="mt-6">
          <WorkflowList />
        </TabsContent>

        <TabsContent value="steps" className="mt-6">
          <WorkflowStepsManager />
        </TabsContent>

        <TabsContent value="execution" className="mt-6">
          <WorkflowExecutionMonitor />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <WorkflowAnalytics />
        </TabsContent>

        <TabsContent value="approvals" className="mt-6">
          <WorkflowApprovals />
        </TabsContent>

        <TabsContent value="secured-queue" className="mt-6">
          <SecuredWorkflowApprovals />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <WorkflowActivityFeed />
        </TabsContent>

        <TabsContent value="delegation" className="mt-6">
          <WorkflowDelegation />
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <WorkflowPerformanceReports />
        </TabsContent>

        <TabsContent value="sla" className="mt-6">
          <div className="space-y-6">
            <WorkflowSLAConfig />
            <WorkflowSLAMonitor />
          </div>
        </TabsContent>

        <TabsContent value="data" className="mt-6">
          <WorkflowData />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <WorkflowSecuritySettings />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="space-y-6">
            <WorkflowSettings />
            <WorkflowWebhooks />
            <WorkflowEmailReports />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
