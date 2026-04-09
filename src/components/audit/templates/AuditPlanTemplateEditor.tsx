import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, Eye, EyeOff, Users, LayoutTemplate, Layers, FileDown, MonitorSmartphone, Lock, Loader2, Info } from 'lucide-react';
import { useUserCode } from '@/hooks/useUserCode';
import { useDocumentFoundation } from '@/hooks/useDocumentFoundation';
import { toast } from 'sonner';
import { FoundationInheritedSummary } from './InheritedFromFoundation';
import { DEFAULT_AUDIT_PLAN_CONFIG, type AuditPlanTemplateConfig } from '@/lib/audit/documentTemplateDefaults';
import { TemplatePreviewPane } from './TemplatePreviewPane';
import { AuditPlanSectionConfigurator } from './AuditPlanSectionConfigurator';
import { ExportSettingsConfigurator } from './ExportSettingsConfigurator';
import { AuditPlanProfilesTab } from './AuditPlanProfilesTab';
import { AuditPlanTemplatesTab } from './AuditPlanTemplatesTab';
import {
  AUDIT_PLAN_SECTION_LIBRARY,
  type AuditPlanSection,
  type AuditPlanExportDefaults,
} from '@/lib/audit/auditPlanTemplateTypes';
import { PRESET_AUDIT_BLUE_MINIMAL } from '@/lib/audit/auditPlanTemplatePresets';
import {
  useAuditPlanTemplates,
  useUpdateTemplateConfig,
  useTemplatePermission,
} from '@/hooks/useAuditPlanTemplateGovernance';
import { isEditable, formatVersionLabel, type GovernedTemplateRow } from '@/lib/audit/auditPlanTemplateGovernance';

const TABS = [
  { value: 'profiles', label: 'Profiles', icon: Users },
  { value: 'templates', label: 'Templates', icon: LayoutTemplate },
  { value: 'sections', label: 'Sections', icon: Layers },
  { value: 'export', label: 'Export Settings', icon: FileDown },
  { value: 'preview', label: 'Preview', icon: MonitorSmartphone },
] as const;

type TabValue = typeof TABS[number]['value'];

export function AuditPlanTemplateEditor() {
  const { data: templates = [], isLoading: loadingTemplates } = useAuditPlanTemplates();
  const { data: foundation } = useDocumentFoundation();
  const updateMutation = useUpdateTemplateConfig();
  const { canOnTemplate } = useTemplatePermission();
  const { userCode } = useUserCode();

  const [activeTab, setActiveTab] = useState<TabValue>('profiles');
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [showSidePreview, setShowSidePreview] = useState(false);

  // Config state — loaded from selected template
  const [draft, setDraft] = useState<AuditPlanTemplateConfig>(DEFAULT_AUDIT_PLAN_CONFIG);
  const [sectionConfig, setSectionConfig] = useState<AuditPlanSection[]>([...AUDIT_PLAN_SECTION_LIBRARY] as AuditPlanSection[]);
  const [exportDefaults, setExportDefaults] = useState<AuditPlanExportDefaults>(PRESET_AUDIT_BLUE_MINIMAL.exportDefaults);

  // Resolve selected template
  const selectedTemplate: GovernedTemplateRow | undefined = templates.find((t) => t.id === activeTemplateId);
  const canEdit = selectedTemplate ? isEditable(selectedTemplate) && canOnTemplate(selectedTemplate, 'edit') : false;

  // Auto-select house default or first template
  useEffect(() => {
    if (!activeTemplateId && templates.length > 0) {
      const houseDefault = templates.find((t) => t.is_house_default);
      setActiveTemplateId(houseDefault?.id ?? templates[0].id);
    }
  }, [templates, activeTemplateId]);

  // Load config from selected template
  const loadTemplateConfig = useCallback((config: AuditPlanTemplateConfig) => {
    // Deep merge with defaults to ensure all nested keys exist
    const merged: AuditPlanTemplateConfig = {
      ...PRESET_AUDIT_BLUE_MINIMAL,
      ...config,
      planSummary: { ...PRESET_AUDIT_BLUE_MINIMAL.planSummary, ...(config.planSummary ?? {}) },
      resourcePlan: { ...PRESET_AUDIT_BLUE_MINIMAL.resourcePlan, ...(config.resourcePlan ?? {}) },
      governance: { ...PRESET_AUDIT_BLUE_MINIMAL.governance, ...(config.governance ?? {}) },
      riskCoverage: { ...PRESET_AUDIT_BLUE_MINIMAL.riskCoverage, ...(config.riskCoverage ?? {}) },
      columnsBySection: config.columnsBySection ?? PRESET_AUDIT_BLUE_MINIMAL.columnsBySection,
      exportDefaults: { ...PRESET_AUDIT_BLUE_MINIMAL.exportDefaults, ...(config.exportDefaults ?? {}) },
    };
    setDraft(merged);
    setExportDefaults(merged.exportDefaults);
    setSectionConfig(config.sections ?? [...AUDIT_PLAN_SECTION_LIBRARY] as AuditPlanSection[]);
  }, []);

  useEffect(() => {
    if (selectedTemplate?.config_json) {
      loadTemplateConfig(selectedTemplate.config_json);
    }
  }, [selectedTemplate?.id, selectedTemplate?.version, loadTemplateConfig]);

  const handleSave = () => {
    if (!selectedTemplate || !canEdit) {
      toast.error('This template cannot be edited');
      return;
    }

    const fullConfig: AuditPlanTemplateConfig = {
      ...draft,
      exportDefaults,
      sections: sectionConfig,
    };

    updateMutation.mutate({
      templateId: selectedTemplate.id,
      configJson: fullConfig as any,
      updatedBy: userCode || 'system',
      currentVersion: selectedTemplate.version,
    });
  };

  const isConfigTab = !['profiles', 'templates', 'preview'].includes(activeTab);

  if (loadingTemplates) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Loading engine…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Internal Audit Plan — Formatting Engine</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure profiles, templates, sections, and export settings for audit plan outputs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedTemplate && isConfigTab && (
            <div className="flex items-center gap-1.5 mr-2">
              <Badge variant="outline" className="text-[10px] h-5">{selectedTemplate.template_name}</Badge>
              <Badge variant="secondary" className="text-[10px] h-5">{formatVersionLabel(selectedTemplate.version)}</Badge>
              {selectedTemplate.is_system && (
                <Badge variant="secondary" className="text-[10px] h-5 gap-1"><Lock className="h-2.5 w-2.5" /> Read-only</Badge>
              )}
            </div>
          )}
          {isConfigTab && (
            <Button variant="outline" size="sm" onClick={() => setShowSidePreview(!showSidePreview)}>
              {showSidePreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showSidePreview ? 'Hide Preview' : 'Preview'}
            </Button>
          )}
          {canEdit && isConfigTab && (
            <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          )}
        </div>
      </div>

      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Structure only.</strong> All formatting (branding, typography, colors, pagination, table style, sign-off, draft/final rules) is inherited from the <strong>Foundation</strong> tab and cannot be overridden here.
          Sections are referenced from the <strong>Section Library</strong>. Configure only plan-specific structure and content settings below.
        </AlertDescription>
      </Alert>

      {/* Foundation Inherited Settings (read-only) */}
      {foundation && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FoundationInheritedSummary
            sectionTitle="Branding"
            items={[
              { label: 'Organization', value: foundation.branding.orgName },
              { label: 'Logo', value: foundation.branding.showLogo ? 'Enabled' : 'Disabled' },
            ]}
          />
          <FoundationInheritedSummary
            sectionTitle="Typography"
            items={[
              { label: 'Body Font', value: foundation.typography.fontFamily.split(',')[0] },
              { label: 'Base Size', value: `${foundation.typography.baseFontSize}pt` },
            ]}
          />
          <FoundationInheritedSummary
            sectionTitle="Pagination"
            items={[
              { label: 'Position', value: foundation.pagination.position },
              { label: 'Body Style', value: foundation.pagination.bodyStyle },
            ]}
          />
          <FoundationInheritedSummary
            sectionTitle="Table Style"
            items={[
              { label: 'Striped', value: foundation.tableStyle.stripedRows ? 'Yes' : 'No' },
              { label: 'Font', value: foundation.tableStyle.fontSize },
            ]}
          />
        </div>
      )}


      {/* Main content area */}
      <div className="flex gap-6">
        <div className={`flex-1 min-w-0 ${showSidePreview && isConfigTab ? 'max-w-[58%]' : ''}`}>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
            <TabsList className="flex-wrap">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* 1. Profiles */}
            <TabsContent value="profiles" className="mt-4">
              <AuditPlanProfilesTab onSelectProfile={() => setActiveTab('templates')} />
            </TabsContent>

            {/* 2. Templates */}
            <TabsContent value="templates" className="mt-4">
              <AuditPlanTemplatesTab
                activeTemplateId={activeTemplateId ?? undefined}
                onSelectTemplate={(id) => {
                  setActiveTemplateId(id);
                  setActiveTab('sections');
                }}
              />
            </TabsContent>

            {/* 3. Section Configuration */}
            <TabsContent value="sections" className="mt-4">
              <AuditPlanSectionConfigurator
                sections={sectionConfig}
                onChange={canEdit ? setSectionConfig : () => {}}
                onReset={canEdit ? () => setSectionConfig([...AUDIT_PLAN_SECTION_LIBRARY] as AuditPlanSection[]) : () => {}}
              />

              {/* Plan-specific content configuration */}
              <div className="space-y-4 mt-4">
                {/* Plan Summary */}
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold">Plan Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0">
                    <div className="grid gap-4">
                      <div>
                        <Label>Title Override</Label>
                        <Input
                          value={draft.planSummary.titleOverride}
                          onChange={(e) => canEdit && setDraft((d) => ({ ...d, planSummary: { ...d.planSummary, titleOverride: e.target.value } }))}
                          placeholder="e.g. Audit Schedule"
                          readOnly={!canEdit}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Split by Engagement Type</Label>
                        <Switch
                          checked={draft.planSummary.splitByType}
                          onCheckedChange={(v) => canEdit && setDraft((d) => ({ ...d, planSummary: { ...d.planSummary, splitByType: v } }))}
                          disabled={!canEdit}
                        />
                      </div>
                      {draft.planSummary.splitByType && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Sections</Label>
                          {draft.planSummary.sections.map((sec, i) => (
                            <div key={sec.key} className="flex items-center gap-3">
                              <Switch
                                checked={sec.enabled}
                                disabled={!canEdit}
                                onCheckedChange={(v) => {
                                  if (!canEdit) return;
                                  setDraft((d) => ({
                                    ...d,
                                    planSummary: {
                                      ...d.planSummary,
                                      sections: d.planSummary.sections.map((s, si) => si === i ? { ...s, enabled: v } : s),
                                    },
                                  }));
                                }}
                              />
                              <span className="text-sm">{sec.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <Label>Hide Exact Start/End Dates</Label>
                        <Switch
                          checked={draft.planSummary.hideExactDates}
                          onCheckedChange={(v) => canEdit && setDraft((d) => ({ ...d, planSummary: { ...d.planSummary, hideExactDates: v } }))}
                          disabled={!canEdit}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Table Columns */}
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold">Table Columns</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0">
                    <div className="space-y-3">
                      {Object.entries(draft.columnsBySection).map(([sectionKey, cols]) => (
                        <div key={sectionKey}>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 capitalize">{sectionKey}</p>
                          <div className="space-y-1.5">
                            {cols.map((col, ci) => (
                              <div key={col.key} className="flex items-center gap-3">
                                <Switch
                                  checked={col.enabled}
                                  disabled={!canEdit}
                                  onCheckedChange={(v) => {
                                    if (!canEdit) return;
                                    setDraft((d) => ({
                                      ...d,
                                      columnsBySection: {
                                        ...d.columnsBySection,
                                        [sectionKey]: d.columnsBySection[sectionKey].map((c, i) => i === ci ? { ...c, enabled: v } : c),
                                      },
                                    }));
                                  }}
                                />
                                <span className="text-sm">{col.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Resource Plan */}
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold">Resource Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Show Total Audit Staff First</Label>
                        <Switch
                          checked={draft.resourcePlan.showTotalStaffFirst}
                          onCheckedChange={(v) => canEdit && setDraft((d) => ({ ...d, resourcePlan: { ...d.resourcePlan, showTotalStaffFirst: v } }))}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Show Percentages</Label>
                        <Switch
                          checked={draft.resourcePlan.showPercentages}
                          onCheckedChange={(v) => canEdit && setDraft((d) => ({ ...d, resourcePlan: { ...d.resourcePlan, showPercentages: v } }))}
                          disabled={!canEdit}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Day Types</Label>
                        <div className="flex flex-wrap gap-2">
                          {draft.resourcePlan.dayTypes.map((dt) => (
                            <span key={dt} className="text-xs px-2 py-1 rounded-md bg-muted border">{dt}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Risk & Governance */}
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold">Risk & Governance</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Show Risk Coverage Analysis</Label>
                        <Switch
                          checked={draft.riskCoverage.enabled}
                          onCheckedChange={(v) => canEdit && setDraft((d) => ({ ...d, riskCoverage: { enabled: v } }))}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Show Board/Audit Committee Line</Label>
                        <Switch
                          checked={draft.governance.showBoardLine}
                          onCheckedChange={(v) => canEdit && setDraft((d) => ({ ...d, governance: { ...d.governance, showBoardLine: v } }))}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Show Approved By Block</Label>
                        <Switch
                          checked={draft.governance.showApprovedByBlock}
                          onCheckedChange={(v) => canEdit && setDraft((d) => ({ ...d, governance: { ...d.governance, showApprovedByBlock: v } }))}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Prepared By Label</Label>
                          <Input
                            value={draft.governance.preparedByLabel}
                            onChange={(e) => canEdit && setDraft((d) => ({ ...d, governance: { ...d.governance, preparedByLabel: e.target.value } }))}
                            readOnly={!canEdit}
                          />
                        </div>
                        <div>
                          <Label>Approved By Label</Label>
                          <Input
                            value={draft.governance.approvedByLabel}
                            onChange={(e) => canEdit && setDraft((d) => ({ ...d, governance: { ...d.governance, approvedByLabel: e.target.value } }))}
                            readOnly={!canEdit}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* 4. Export Settings */}
            <TabsContent value="export" className="mt-4">
              <ExportSettingsConfigurator
                exportDefaults={exportDefaults}
                onChange={canEdit ? setExportDefaults : () => {}}
              />
            </TabsContent>

            {/* 5. Preview */}
            <TabsContent value="preview" className="mt-4">
              <div className="max-w-lg mx-auto">
                <TemplatePreviewPane
                  templateType="audit_plan"
                  config={draft}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Side Preview */}
        {showSidePreview && isConfigTab && (
          <div className="w-[42%] sticky top-4 self-start">
            <TemplatePreviewPane
              templateType="audit_plan"
              config={draft}
            />
          </div>
        )}
      </div>
    </div>
  );
}
