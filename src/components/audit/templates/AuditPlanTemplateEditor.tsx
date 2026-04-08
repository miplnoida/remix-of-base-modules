import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Eye, EyeOff, Users, LayoutTemplate, Palette, BookOpen, Type, Table2, Layers, FileDown, MonitorSmartphone } from 'lucide-react';
import { useAuditPlanTemplate, useAuditDocumentTemplateMutation } from '@/hooks/useAuditDocumentTemplates';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';
import { DEFAULT_AUDIT_PLAN_CONFIG, type AuditPlanTemplateConfig } from '@/lib/audit/documentTemplateDefaults';
import { TemplatePreviewPane } from './TemplatePreviewPane';
import { AuditPlanSectionConfigurator } from './AuditPlanSectionConfigurator';
import { CoverBrandingConfigurator } from './CoverBrandingConfigurator';
import { TocPaginationConfigurator } from './TocPaginationConfigurator';
import { TypographyLayoutConfigurator } from './TypographyLayoutConfigurator';
import { TablesAppendicesConfigurator } from './TablesAppendicesConfigurator';
import { ExportSettingsConfigurator } from './ExportSettingsConfigurator';
import { AuditPlanProfilesTab } from './AuditPlanProfilesTab';
import { AuditPlanTemplatesTab } from './AuditPlanTemplatesTab';
import {
  AUDIT_PLAN_SECTION_LIBRARY,
  type AuditPlanSection,
  type AuditPlanBranding,
  type AuditPlanCoverPageConfig,
  type AuditPlanTocConfig,
  type AuditPlanPaginationConfig,
  type AuditPlanTypography,
  type AuditPlanTableStyle,
  type AuditPlanPageLayout,
  type AuditPlanExportDefaults,
} from '@/lib/audit/auditPlanTemplateTypes';
import { PRESET_AUDIT_BLUE_MINIMAL } from '@/lib/audit/auditPlanTemplatePresets';

const TABS = [
  { value: 'profiles', label: 'Profiles', icon: Users },
  { value: 'templates', label: 'Templates', icon: LayoutTemplate },
  { value: 'cover', label: 'Cover & Branding', icon: Palette },
  { value: 'toc', label: 'TOC & Pagination', icon: BookOpen },
  { value: 'typography', label: 'Layout & Typography', icon: Type },
  { value: 'tables', label: 'Tables & Appendices', icon: Table2 },
  { value: 'sections', label: 'Sections', icon: Layers },
  { value: 'export', label: 'Export Settings', icon: FileDown },
  { value: 'preview', label: 'Preview', icon: MonitorSmartphone },
] as const;

type TabValue = typeof TABS[number]['value'];

export function AuditPlanTemplateEditor() {
  const { data: config, isLoading } = useAuditPlanTemplate();
  const mutation = useAuditDocumentTemplateMutation();
  const { userCode } = useUserCode();
  const [activeTab, setActiveTab] = useState<TabValue>('profiles');
  const [draft, setDraft] = useState<AuditPlanTemplateConfig>(DEFAULT_AUDIT_PLAN_CONFIG);
  const [sectionConfig, setSectionConfig] = useState<AuditPlanSection[]>([...AUDIT_PLAN_SECTION_LIBRARY] as AuditPlanSection[]);
  const [brandingConfig, setBrandingConfig] = useState<AuditPlanBranding>(PRESET_AUDIT_BLUE_MINIMAL.branding);
  const [coverPageConfig, setCoverPageConfig] = useState<AuditPlanCoverPageConfig>(PRESET_AUDIT_BLUE_MINIMAL.coverPage);
  const [tocConfig, setTocConfig] = useState<AuditPlanTocConfig>(PRESET_AUDIT_BLUE_MINIMAL.toc);
  const [paginationConfig, setPaginationConfig] = useState<AuditPlanPaginationConfig>(PRESET_AUDIT_BLUE_MINIMAL.pagination);
  const [typographyConfig, setTypographyConfig] = useState<AuditPlanTypography>(PRESET_AUDIT_BLUE_MINIMAL.typography);
  const [tableStyleConfig, setTableStyleConfig] = useState<AuditPlanTableStyle>(PRESET_AUDIT_BLUE_MINIMAL.tableStyle);
  const [pageLayoutConfig, setPageLayoutConfig] = useState<AuditPlanPageLayout>(PRESET_AUDIT_BLUE_MINIMAL.pageLayout);
  const [exportDefaults, setExportDefaults] = useState<AuditPlanExportDefaults>(PRESET_AUDIT_BLUE_MINIMAL.exportDefaults);
  const [showSidePreview, setShowSidePreview] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState('tpl-1');

  useEffect(() => {
    if (config) setDraft(config);
  }, [config]);

  const handleSave = () => {
    mutation.mutate(
      { templateType: 'audit_plan', configJson: draft as any, updatedBy: userCode || 'system' },
      {
        onSuccess: () => toast.success('Audit Plan template saved'),
        onError: (e) => toast.error('Failed to save template', { description: String(e) }),
      }
    );
  };

  // Show side preview on config tabs
  const isConfigTab = !['profiles', 'templates', 'preview'].includes(activeTab);

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading template…</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Internal Audit Plan — Formatting Engine</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure profiles, templates, and formatting settings for audit plan outputs.
          </p>
        </div>
        <div className="flex gap-2">
          {isConfigTab && (
            <Button variant="outline" size="sm" onClick={() => setShowSidePreview(!showSidePreview)}>
              {showSidePreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showSidePreview ? 'Hide Preview' : 'Preview'}
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={mutation.isPending}>
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
        </div>
      </div>

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
              <AuditPlanProfilesTab
                onSelectProfile={(id) => {
                  setActiveTab('templates');
                }}
              />
            </TabsContent>

            {/* 2. Templates */}
            <TabsContent value="templates" className="mt-4">
              <AuditPlanTemplatesTab
                activeTemplateId={activeTemplateId}
                onSelectTemplate={(id) => {
                  setActiveTemplateId(id);
                  setActiveTab('cover');
                }}
              />
            </TabsContent>

            {/* 3. Cover & Branding */}
            <TabsContent value="cover" className="mt-4">
              <CoverBrandingConfigurator
                branding={brandingConfig}
                coverPage={coverPageConfig}
                onBrandingChange={setBrandingConfig}
                onCoverPageChange={setCoverPageConfig}
              />
            </TabsContent>

            {/* 4. TOC & Pagination */}
            <TabsContent value="toc" className="mt-4">
              <TocPaginationConfigurator
                toc={tocConfig}
                pagination={paginationConfig}
                onTocChange={setTocConfig}
                onPaginationChange={setPaginationConfig}
              />
            </TabsContent>

            {/* 5. Layout & Typography */}
            <TabsContent value="typography" className="mt-4">
              <TypographyLayoutConfigurator
                typography={typographyConfig}
                tableStyle={tableStyleConfig}
                pageLayout={pageLayoutConfig}
                onTypographyChange={setTypographyConfig}
                onTableStyleChange={setTableStyleConfig}
                onPageLayoutChange={setPageLayoutConfig}
              />
            </TabsContent>

            {/* 6. Tables & Appendices */}
            <TabsContent value="tables" className="mt-4">
              <TablesAppendicesConfigurator
                tableStyle={tableStyleConfig}
                onTableStyleChange={setTableStyleConfig}
              />
            </TabsContent>

            {/* 7. Section Configuration */}
            <TabsContent value="sections" className="mt-4">
              <AuditPlanSectionConfigurator
                sections={sectionConfig}
                onChange={setSectionConfig}
                onReset={() => setSectionConfig([...AUDIT_PLAN_SECTION_LIBRARY] as AuditPlanSection[])}
              />
            </TabsContent>

            {/* 8. Export Settings */}
            <TabsContent value="export" className="mt-4">
              <ExportSettingsConfigurator
                exportDefaults={exportDefaults}
                onChange={setExportDefaults}
              />
            </TabsContent>

            {/* 9. Preview */}
            <TabsContent value="preview" className="mt-4">
              <div className="max-w-lg mx-auto">
                <TemplatePreviewPane
                  templateType="audit_plan"
                  config={draft}
                  brandingConfig={brandingConfig}
                  coverPageConfig={coverPageConfig}
                  tocConfig={tocConfig}
                  paginationConfig={paginationConfig}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Content-specific config cards for Plan Summary, Columns, Resources, Governance */}
          {activeTab === 'sections' && (
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
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, planSummary: { ...d.planSummary, titleOverride: e.target.value } }))
                        }
                        placeholder="e.g. Audit Schedule"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Split by Engagement Type</Label>
                      <Switch
                        checked={draft.planSummary.splitByType}
                        onCheckedChange={(v) =>
                          setDraft((d) => ({ ...d, planSummary: { ...d.planSummary, splitByType: v } }))
                        }
                      />
                    </div>
                    {draft.planSummary.splitByType && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Sections</Label>
                        {draft.planSummary.sections.map((sec, i) => (
                          <div key={sec.key} className="flex items-center gap-3">
                            <Switch
                              checked={sec.enabled}
                              onCheckedChange={(v) => {
                                setDraft((d) => ({
                                  ...d,
                                  planSummary: {
                                    ...d.planSummary,
                                    sections: d.planSummary.sections.map((s, si) =>
                                      si === i ? { ...s, enabled: v } : s
                                    ),
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
                        onCheckedChange={(v) =>
                          setDraft((d) => ({ ...d, planSummary: { ...d.planSummary, hideExactDates: v } }))
                        }
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
                                onCheckedChange={(v) => {
                                  setDraft((d) => ({
                                    ...d,
                                    columnsBySection: {
                                      ...d.columnsBySection,
                                      [sectionKey]: d.columnsBySection[sectionKey].map((c, i) =>
                                        i === ci ? { ...c, enabled: v } : c
                                      ),
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
                        onCheckedChange={(v) =>
                          setDraft((d) => ({ ...d, resourcePlan: { ...d.resourcePlan, showTotalStaffFirst: v } }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Show Percentages</Label>
                      <Switch
                        checked={draft.resourcePlan.showPercentages}
                        onCheckedChange={(v) =>
                          setDraft((d) => ({ ...d, resourcePlan: { ...d.resourcePlan, showPercentages: v } }))
                        }
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

              {/* Governance */}
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
                        onCheckedChange={(v) => setDraft((d) => ({ ...d, riskCoverage: { enabled: v } }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Show Board/Audit Committee Line</Label>
                      <Switch
                        checked={draft.governance.showBoardLine}
                        onCheckedChange={(v) =>
                          setDraft((d) => ({ ...d, governance: { ...d.governance, showBoardLine: v } }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Show Approved By Block</Label>
                      <Switch
                        checked={draft.governance.showApprovedByBlock}
                        onCheckedChange={(v) =>
                          setDraft((d) => ({ ...d, governance: { ...d.governance, showApprovedByBlock: v } }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Prepared By Label</Label>
                        <Input
                          value={draft.governance.preparedByLabel}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, governance: { ...d.governance, preparedByLabel: e.target.value } }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Approved By Label</Label>
                        <Input
                          value={draft.governance.approvedByLabel}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, governance: { ...d.governance, approvedByLabel: e.target.value } }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Side preview panel */}
        {showSidePreview && isConfigTab && (
          <div className="w-[42%] sticky top-4 self-start">
            <TemplatePreviewPane
              templateType="audit_plan"
              config={draft}
              brandingConfig={brandingConfig}
              coverPageConfig={coverPageConfig}
              tocConfig={tocConfig}
              paginationConfig={paginationConfig}
            />
          </div>
        )}
      </div>
    </div>
  );
}
