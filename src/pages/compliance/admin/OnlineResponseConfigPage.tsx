import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, Grid3x3, FileText, Workflow } from 'lucide-react';
import { OnlineResponseGlobalSettingsTab } from '@/components/compliance/admin/online-response/OnlineResponseGlobalSettingsTab';
import { OnlineResponsePolicyMatrixTab } from '@/components/compliance/admin/online-response/OnlineResponsePolicyMatrixTab';
import { OnlineResponseTemplateDefaultsTab } from '@/components/compliance/admin/online-response/OnlineResponseTemplateDefaultsTab';
import { OnlineResponseReviewWorkflowTab } from '@/components/compliance/admin/online-response/OnlineResponseReviewWorkflowTab';

export default function OnlineResponseConfigPage() {
  return (
    <div className="container mx-auto p-6 space-y-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Employer Online Response Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Control whether and how employers can respond online to compliance communications and
          reports. Resolution hierarchy: <strong>instance overrides → policy matrix → template
          defaults → global setting</strong>.
        </p>
      </div>

      <Tabs defaultValue="global">
        <TabsList>
          <TabsTrigger value="global">
            <Globe className="h-4 w-4 mr-1.5" /> Global Settings
          </TabsTrigger>
          <TabsTrigger value="matrix">
            <Grid3x3 className="h-4 w-4 mr-1.5" /> Policy Matrix
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-1.5" /> Template Defaults
          </TabsTrigger>
          <TabsTrigger value="workflow">
            <Workflow className="h-4 w-4 mr-1.5" /> Review Workflow
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="mt-4">
          <OnlineResponseGlobalSettingsTab />
        </TabsContent>
        <TabsContent value="matrix" className="mt-4">
          <OnlineResponsePolicyMatrixTab />
        </TabsContent>
        <TabsContent value="templates" className="mt-4">
          <OnlineResponseTemplateDefaultsTab />
        </TabsContent>
        <TabsContent value="workflow" className="mt-4">
          <OnlineResponseReviewWorkflowTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
