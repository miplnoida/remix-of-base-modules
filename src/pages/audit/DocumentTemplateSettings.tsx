import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, FileText, ClipboardList, FileCheck, Layers } from 'lucide-react';
import { FoundationSettingsEditor } from '@/components/audit/templates/FoundationSettingsEditor';
import { SectionLibraryViewer } from '@/components/audit/templates/SectionLibraryViewer';
import { AuditReportTemplateEditor } from '@/components/audit/templates/AuditReportTemplateEditor';
import { AuditPlanTemplateEditor } from '@/components/audit/templates/AuditPlanTemplateEditor';
import { ManagementResponseTemplateEditor } from '@/components/audit/templates/ManagementResponseTemplateEditor';

export default function DocumentTemplateSettings() {
  const [activeTab, setActiveTab] = useState('foundation');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Document & Output Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure shared foundation settings inherited by all audit documents, manage the master section library, and customize type-specific templates.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="foundation" className="gap-2">
            <Building2 className="h-4 w-4" />
            Foundation
          </TabsTrigger>
          <TabsTrigger value="sections" className="gap-2">
            <Layers className="h-4 w-4" />
            Section Library
          </TabsTrigger>
          <TabsTrigger value="audit_report" className="gap-2">
            <FileText className="h-4 w-4" />
            Audit Report
          </TabsTrigger>
          <TabsTrigger value="audit_plan" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Internal Audit Plan
          </TabsTrigger>
          <TabsTrigger value="mgmt_response" className="gap-2">
            <FileCheck className="h-4 w-4" />
            Management Response
          </TabsTrigger>
        </TabsList>

        <TabsContent value="foundation">
          <FoundationSettingsEditor />
        </TabsContent>

        <TabsContent value="sections">
          <SectionLibraryViewer />
        </TabsContent>

        <TabsContent value="audit_report">
          <AuditReportTemplateEditor />
        </TabsContent>

        <TabsContent value="audit_plan">
          <AuditPlanTemplateEditor />
        </TabsContent>

        <TabsContent value="mgmt_response">
          <ManagementResponseTemplateEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
