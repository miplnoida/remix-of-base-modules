import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Save, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { useAuditPlanTemplate, useAuditDocumentTemplateMutation } from '@/hooks/useAuditDocumentTemplates';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';
import { DEFAULT_AUDIT_PLAN_CONFIG, type AuditPlanTemplateConfig } from '@/lib/audit/documentTemplateDefaults';
import { TemplatePreviewPane } from './TemplatePreviewPane';
import { AuditPlanSectionConfigurator } from './AuditPlanSectionConfigurator';
import { AUDIT_PLAN_SECTION_LIBRARY, type AuditPlanSection } from '@/lib/audit/auditPlanTemplateTypes';

export function AuditPlanTemplateEditor() {
  const { data: config, isLoading } = useAuditPlanTemplate();
  const mutation = useAuditDocumentTemplateMutation();
  const { userCode } = useUserCode();
  const [draft, setDraft] = useState<AuditPlanTemplateConfig>(DEFAULT_AUDIT_PLAN_CONFIG);
  const [sectionConfig, setSectionConfig] = useState<AuditPlanSection[]>([...AUDIT_PLAN_SECTION_LIBRARY] as AuditPlanSection[]);
  const [showPreview, setShowPreview] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    coverPage: true, sectionConfig: false, planSummary: false, columns: false, resourcePlan: false, governance: false,
  });

  useEffect(() => {
    if (config) setDraft(config);
  }, [config]);

  const toggleCard = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = () => {
    mutation.mutate(
      { templateType: 'audit_plan', configJson: draft as any, updatedBy: userCode || 'system' },
      {
        onSuccess: () => toast.success('Audit Plan template saved'),
        onError: (e) => toast.error('Failed to save template', { description: String(e) }),
      }
    );
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading template…</div>;

  return (
    <div className="flex gap-6">
      <div className={`flex-1 space-y-4 ${showPreview ? 'max-w-[55%]' : ''}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Internal Audit Plan Template</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="h-4 w-4 mr-1" /> {showPreview ? 'Hide Preview' : 'Preview'}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={mutation.isPending}>
              <Save className="h-4 w-4 mr-1" /> Save Template
            </Button>
          </div>
        </div>

        {/* Cover Page */}
        <SettingsCard title="Cover Page" cardKey="coverPage" open={openSections.coverPage} onToggle={toggleCard}>
          <div className="grid gap-4">
            <div>
              <Label>Title Text</Label>
              <Input
                value={draft.coverPage.titleText}
                onChange={(e) => setDraft((d) => ({ ...d, coverPage: { ...d.coverPage, titleText: e.target.value } }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show "Internal Audit Department" Line</Label>
              <Switch
                checked={draft.coverPage.showDepartmentLine}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, coverPage: { ...d.coverPage, showDepartmentLine: v } }))}
              />
            </div>
            <div>
              <Label>Fiscal Year Display</Label>
              <Select
                value={draft.coverPage.fiscalYearMode}
                onValueChange={(v: 'single' | 'range') =>
                  setDraft((d) => ({ ...d, coverPage: { ...d.coverPage, fiscalYearMode: v } }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Year (e.g. 2026)</SelectItem>
                  <SelectItem value="range">Year Range (e.g. 2025–2026)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SettingsCard>

        {/* Plan Summary */}
        <SettingsCard title="Plan Summary" cardKey="planSummary" open={openSections.planSummary} onToggle={toggleCard}>
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
        </SettingsCard>

        {/* Column Config */}
        <SettingsCard title="Table Columns" cardKey="columns" open={openSections.columns} onToggle={toggleCard}>
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
        </SettingsCard>

        {/* Resource Plan */}
        <SettingsCard title="Resource Plan" cardKey="resourcePlan" open={openSections.resourcePlan} onToggle={toggleCard}>
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
        </SettingsCard>

        {/* Governance */}
        <SettingsCard title="Risk & Governance" cardKey="governance" open={openSections.governance} onToggle={toggleCard}>
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
        </SettingsCard>
      </div>

      {showPreview && (
        <div className="w-[45%] sticky top-4 self-start">
          <TemplatePreviewPane templateType="audit_plan" config={draft} />
        </div>
      )}
    </div>
  );
}

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
