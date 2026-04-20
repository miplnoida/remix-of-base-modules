import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, FileText, ClipboardList, Layers, MessageSquare } from 'lucide-react';
import { FoundationSettingsEditor } from '@/components/audit/templates/FoundationSettingsEditor';
import { SectionLibraryViewer } from '@/components/audit/templates/SectionLibraryViewer';
import { AuditReportTemplateEditor } from '@/components/audit/templates/AuditReportTemplateEditor';
import { AuditPlanTemplateEditor } from '@/components/audit/templates/AuditPlanTemplateEditor';
import { ManagementResponseTemplateEditor } from '@/components/audit/templates/ManagementResponseTemplateEditor';

export type DocumentTemplateTab = 'foundation' | 'sections' | 'audit_report' | 'audit_plan' | 'mgmt_response';

interface Props {
  /**
   * Initial tab to land on. Allows the same page to be reused from multiple
   * routes (e.g. /compliance/admin/report-templates → 'audit_report',
   * /compliance/admin/document-foundation → 'foundation').
   */
  defaultTab?: DocumentTemplateTab;
  /** Override page title (defaults to "Document & Output Settings"). */
  title?: string;
  /** Override the description shown under the title. */
  description?: string;
}

export default function DocumentTemplateSettings({
  defaultTab = 'foundation',
  title = 'Document & Output Settings',
  description = 'Configure shared foundation settings inherited by all audit documents, manage the master section library, and customize type-specific templates.',
}: Props) {
  const [activeTab, setActiveTab] = useState<DocumentTemplateTab>(defaultTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DocumentTemplateTab)}>
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
            <MessageSquare className="h-4 w-4" />
            Mgmt Response
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
