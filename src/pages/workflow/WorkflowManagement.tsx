import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorkflowDesigner from "@/components/workflow/WorkflowDesigner";
import WorkflowList from "@/components/workflow/WorkflowList";
import WorkflowRuns from "@/components/workflow/WorkflowRuns";
import WorkflowData from "@/components/workflow/WorkflowData";
import WorkflowTemplates from "@/components/workflow/WorkflowTemplates";
import WorkflowSettings from "@/components/workflow/WorkflowSettings";

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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="designer">Designer</TabsTrigger>
          <TabsTrigger value="workflows">All Workflows</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="designer" className="mt-6">
          <WorkflowDesigner />
        </TabsContent>

        <TabsContent value="workflows" className="mt-6">
          <WorkflowList />
        </TabsContent>

        <TabsContent value="runs" className="mt-6">
          <WorkflowRuns />
        </TabsContent>

        <TabsContent value="data" className="mt-6">
          <WorkflowData />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <WorkflowTemplates />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <WorkflowSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
