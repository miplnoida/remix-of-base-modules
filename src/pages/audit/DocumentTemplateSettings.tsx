import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, ClipboardList } from 'lucide-react';
import { AuditReportTemplateEditor } from '@/components/audit/templates/AuditReportTemplateEditor';
import { AuditPlanTemplateEditor } from '@/components/audit/templates/AuditPlanTemplateEditor';

export default function DocumentTemplateSettings() {
  const [activeTab, setActiveTab] = useState('audit_report');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Document Templates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure layout, branding, sections, columns, and sign-off rules for audit document outputs.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="audit_report" className="gap-2">
            <FileText className="h-4 w-4" />
            Audit Report
          </TabsTrigger>
          <TabsTrigger value="audit_plan" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Internal Audit Plan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit_report">
          <AuditReportTemplateEditor />
        </TabsContent>

        <TabsContent value="audit_plan">
          <AuditPlanTemplateEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
