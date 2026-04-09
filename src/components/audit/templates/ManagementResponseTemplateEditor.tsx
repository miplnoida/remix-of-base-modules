import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, ChevronDown, ChevronUp, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TemplateSectionsPanel } from './TemplateSectionsPanel';

/**
 * Management Response Report — Template Editor
 * 
 * This report aggregates audit findings, management responses, and action plans
 * into a consolidated view for external auditor sharing.
 * 
 * Branding, typography, pagination, table style, sign-off, and draft rules
 * are inherited from Foundation settings.
 */

interface MgmtResponseTemplateConfig {
  summaryMetrics: {
    showOpenClosedCounts: boolean;
    showOverdueActions: boolean;
    showRiskBreakdown: boolean;
    showImplementationRate: boolean;
  };
  findingsTable: {
    groupBy: 'department' | 'risk_level' | 'status' | 'audit' | 'none';
    showRiskRating: boolean;
    showDueDate: boolean;
    showOwner: boolean;
    showResponseStatus: boolean;
    showImplementationProgress: boolean;
  };
  actionPlanView: {
    enabled: boolean;
    showTimeline: boolean;
    showResponsiblePerson: boolean;
    showEvidenceStatus: boolean;
  };
  coverPage: {
    reportTitle: string;
    showPeriodCovered: boolean;
    showIssuedTo: boolean;
  };
}

const DEFAULT_CONFIG: MgmtResponseTemplateConfig = {
  summaryMetrics: {
    showOpenClosedCounts: true,
    showOverdueActions: true,
    showRiskBreakdown: true,
    showImplementationRate: true,
  },
  findingsTable: {
    groupBy: 'department',
    showRiskRating: true,
    showDueDate: true,
    showOwner: true,
    showResponseStatus: true,
    showImplementationProgress: true,
  },
  actionPlanView: {
    enabled: true,
    showTimeline: true,
    showResponsiblePerson: true,
    showEvidenceStatus: true,
  },
  coverPage: {
    reportTitle: 'Management Response Report',
    showPeriodCovered: true,
    showIssuedTo: true,
  },
};

export function ManagementResponseTemplateEditor() {
  const [draft, setDraft] = useState<MgmtResponseTemplateConfig>(DEFAULT_CONFIG);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    coverPage: true,
    summaryMetrics: false,
    findingsTable: false,
    actionPlan: false,
  });

  const toggleCard = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = () => {
    toast.success('Management Response template saved');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Management Response Report Template</h2>
        <Button size="sm" onClick={handleSave}>
          <Save className="h-4 w-4 mr-1" /> Save Template
        </Button>
      </div>

      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Branding, typography, pagination, table style, sign-off, and draft/final rules are managed in the <strong>Foundation</strong> tab and apply to all document types.
          Configure only management response–specific settings below.
        </AlertDescription>
      </Alert>

      {/* DB-driven Section Visibility */}
      <TemplateSectionsPanel documentType="mgmt_response" editable={true} />

      {/* Cover Page */}
      <SettingsCard title="Cover Page" cardKey="coverPage" open={openSections.coverPage} onToggle={toggleCard}>
        <div className="grid gap-4">
          <div>
            <Label>Report Title</Label>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={draft.coverPage.reportTitle}
              onChange={(e) => setDraft((d) => ({ ...d, coverPage: { ...d.coverPage, reportTitle: e.target.value } }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Show Period Covered</Label>
            <Switch
              checked={draft.coverPage.showPeriodCovered}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, coverPage: { ...d.coverPage, showPeriodCovered: v } }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Show "Issued To" Field</Label>
            <Switch
              checked={draft.coverPage.showIssuedTo}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, coverPage: { ...d.coverPage, showIssuedTo: v } }))}
            />
          </div>
        </div>
      </SettingsCard>

      {/* Summary Metrics */}
      <SettingsCard title="Summary Metrics" cardKey="summaryMetrics" open={openSections.summaryMetrics} onToggle={toggleCard}>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Choose which summary statistics appear at the top of the report.</p>
          {([
            { key: 'showOpenClosedCounts', label: 'Open / Closed Finding Counts' },
            { key: 'showOverdueActions', label: 'Overdue Actions Count' },
            { key: 'showRiskBreakdown', label: 'Risk Level Breakdown' },
            { key: 'showImplementationRate', label: 'Implementation Rate (%)' },
          ] as const).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label>{label}</Label>
              <Switch
                checked={draft.summaryMetrics[key]}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, summaryMetrics: { ...d.summaryMetrics, [key]: v } }))}
              />
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* Findings Table */}
      <SettingsCard title="Findings Table Layout" cardKey="findingsTable" open={openSections.findingsTable} onToggle={toggleCard}>
        <div className="space-y-4">
          <div>
            <Label>Group Findings By</Label>
            <Select
              value={draft.findingsTable.groupBy}
              onValueChange={(v: any) => setDraft((d) => ({ ...d, findingsTable: { ...d.findingsTable, groupBy: v } }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="risk_level">Risk Level</SelectItem>
                <SelectItem value="status">Response Status</SelectItem>
                <SelectItem value="audit">Audit Engagement</SelectItem>
                <SelectItem value="none">No Grouping (Flat)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Table columns to display:</p>
            {([
              { key: 'showRiskRating', label: 'Risk Rating' },
              { key: 'showDueDate', label: 'Due Date' },
              { key: 'showOwner', label: 'Responsible Owner' },
              { key: 'showResponseStatus', label: 'Response Status' },
              { key: 'showImplementationProgress', label: 'Implementation Progress' },
            ] as const).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label>{label}</Label>
                <Switch
                  checked={draft.findingsTable[key]}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, findingsTable: { ...d.findingsTable, [key]: v } }))}
                />
              </div>
            ))}
          </div>
        </div>
      </SettingsCard>

      {/* Action Plan View */}
      <SettingsCard title="Action Plan Section" cardKey="actionPlan" open={openSections.actionPlan} onToggle={toggleCard}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Include Action Plan Section</Label>
            <Switch
              checked={draft.actionPlanView.enabled}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, actionPlanView: { ...d.actionPlanView, enabled: v } }))}
            />
          </div>
          {draft.actionPlanView.enabled && (
            <>
              <div className="flex items-center justify-between">
                <Label>Show Timeline</Label>
                <Switch
                  checked={draft.actionPlanView.showTimeline}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, actionPlanView: { ...d.actionPlanView, showTimeline: v } }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show Responsible Person</Label>
                <Switch
                  checked={draft.actionPlanView.showResponsiblePerson}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, actionPlanView: { ...d.actionPlanView, showResponsiblePerson: v } }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show Evidence Status</Label>
                <Switch
                  checked={draft.actionPlanView.showEvidenceStatus}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, actionPlanView: { ...d.actionPlanView, showEvidenceStatus: v } }))}
                />
              </div>
            </>
          )}
        </div>
      </SettingsCard>
    </div>
  );
}

// ─── Collapsible Settings Card ───

function SettingsCard({
  title,
  cardKey,
  open,
  onToggle,
  children,
}: {
  title: string;
  cardKey: string;
  open: boolean;
  onToggle: (key: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={open} onOpenChange={() => onToggle(cardKey)}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
