import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Workflow, ListTree, Zap } from 'lucide-react';
import { StagesTab } from '@/components/legal/workflow/StagesTab';
import { StatusesTab } from '@/components/legal/workflow/StatusesTab';
import { WorkflowRulesTab } from '@/components/legal/workflow/WorkflowRulesTab';

export default function CaseWorkflow() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Case Workflow Configuration</h1>
        <p className="text-muted-foreground">
          Manage case stages and statuses for legal case workflow
        </p>
      </div>

      <Tabs defaultValue="stages" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="stages">
            <ListTree className="h-4 w-4 mr-2" />
            Stages
          </TabsTrigger>
          <TabsTrigger value="statuses">
            <Workflow className="h-4 w-4 mr-2" />
            Statuses
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Zap className="h-4 w-4 mr-2" />
            Workflow Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stages">
          <Card>
            <CardContent className="pt-6">
              <StagesTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statuses">
          <Card>
            <CardContent className="pt-6">
              <StatusesTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardContent className="pt-6">
              <WorkflowRulesTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
