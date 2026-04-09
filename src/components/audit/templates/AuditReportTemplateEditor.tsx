import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, ChevronDown, ChevronUp, GripVertical, Eye, Info, Building2, BookOpen, SeparatorHorizontal } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuditReportTemplate, useAuditDocumentTemplateMutation } from '@/hooks/useAuditDocumentTemplates';
import { useDocumentSectionLibrary, useDocumentFoundation } from '@/hooks/useDocumentFoundation';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';
import { DEFAULT_AUDIT_REPORT_CONFIG, type AuditReportTemplateConfig, type TemplateSectionRef } from '@/lib/audit/documentTemplateDefaults';
import { TemplatePreviewPane } from './TemplatePreviewPane';
import { FoundationInheritedSummary } from './InheritedFromFoundation';
import { TemplateSectionsPanel } from './TemplateSectionsPanel';

export function AuditReportTemplateEditor() {
  const { data: config, isLoading } = useAuditReportTemplate();
  const { data: librarySections = [] } = useDocumentSectionLibrary('audit_report');
  const { data: foundation } = useDocumentFoundation();
  const mutation = useAuditDocumentTemplateMutation();
  const { userCode } = useUserCode();
  const [draft, setDraft] = useState<AuditReportTemplateConfig>(DEFAULT_AUDIT_REPORT_CONFIG);
  const [showPreview, setShowPreview] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    coverPage: true, sections: false, findings: false,
    riskDistribution: false, actionPlan: false,
  });

  useEffect(() => {
    if (config) {
      // Normalize: ensure sectionRefs is populated from legacy sections field
      const normalized = { ...config };
      if (!normalized.sectionRefs && normalized.sections) {
        normalized.sectionRefs = normalized.sections;
      }
      setDraft(normalized);
    }
  }, [config]);

  const toggleCard = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = () => {
    // Sync sectionRefs → sections for backward compat
    const toSave = { ...draft, sections: draft.sectionRefs };
    mutation.mutate(
      { templateType: 'audit_report', configJson: toSave as any, updatedBy: userCode || 'system' },
      {
        onSuccess: () => toast.success('Audit Report template saved'),
        onError: (e) => toast.error('Failed to save template', { description: String(e) }),
      }
    );
  };

  const updateCover = (key: string, value: any) =>
    setDraft((d) => ({ ...d, coverPage: { ...d.coverPage, [key]: value } }));

  const updateSectionRef = (id: string, updates: Partial<TemplateSectionRef>) =>
    setDraft((d) => ({
      ...d,
      sectionRefs: (d.sectionRefs || []).map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));

  const moveSection = (id: string, direction: 'up' | 'down') => {
    setDraft((d) => {
      const refs = d.sectionRefs || [];
      const sorted = [...refs].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((s) => s.id === id);
      if ((direction === 'up' && idx <= 0) || (direction === 'down' && idx >= sorted.length - 1)) return d;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      const newSections = sorted.map((s, i) => {
        if (i === idx) return { ...s, order: swapIdx + 1 };
        if (i === swapIdx) return { ...s, order: idx + 1 };
        return { ...s, order: i + 1 };
      });
      return { ...d, sectionRefs: newSections };
    });
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading template…</div>;

  const sortedSections = [...(draft.sectionRefs || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="flex gap-6">
      <div className={`flex-1 space-y-4 ${showPreview ? 'max-w-[55%]' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Audit Report Template</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="h-4 w-4 mr-1" /> {showPreview ? 'Hide Preview' : 'Preview'}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={mutation.isPending}>
              <Save className="h-4 w-4 mr-1" /> Save Template
            </Button>
          </div>
        </div>

        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Structure only.</strong> All formatting (branding, typography, colors, pagination, table style, sign-off, draft/final rules) is inherited from the <strong>Foundation</strong> tab and cannot be overridden here.
            Sections are referenced from the <strong>Section Library</strong>. Configure only report-specific structure and content settings below.
          </AlertDescription>
        </Alert>

        <Alert className="border-muted bg-muted/30">
          <Building2 className="h-4 w-4" />
          <AlertDescription className="text-[11px] text-muted-foreground">
            To change branding, typography, colors, pagination, table style, or sign-off settings, go to the <strong>Foundation</strong> tab — those changes apply to all documents.
          </AlertDescription>
        </Alert>

        {/* Foundation Inherited Settings (read-only) */}
        {foundation && (
          <div className="grid gap-3 sm:grid-cols-2">
            <FoundationInheritedSummary
              sectionTitle="Branding"
              items={[
                { label: 'Organization', value: foundation.branding.orgName },
                { label: 'Logo', value: foundation.branding.showLogo ? 'Enabled' : 'Disabled' },
                { label: 'Confidential', value: foundation.branding.confidentialLabel },
              ]}
            />
            <FoundationInheritedSummary
              sectionTitle="Typography"
              items={[
                { label: 'Body Font', value: foundation.typography.fontFamily.split(',')[0] },
                { label: 'Base Size', value: `${foundation.typography.baseFontSize}pt` },
                { label: 'Line Height', value: String(foundation.typography.lineHeight) },
              ]}
            />
            <FoundationInheritedSummary
              sectionTitle="Page Layout"
              items={[
                { label: 'Size', value: foundation.pageLayout.pageSize.toUpperCase() },
                { label: 'Orientation', value: foundation.pageLayout.orientation },
                { label: 'Margins', value: `${foundation.pageLayout.margins.top}" / ${foundation.pageLayout.margins.left}"` },
              ]}
            />
            <FoundationInheritedSummary
              sectionTitle="Table Style"
              items={[
                { label: 'Header', value: (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded border" style={{ backgroundColor: foundation.tableStyle.headerBackground }} />
                    {foundation.tableStyle.headerBackground}
                  </span>
                )},
                { label: 'Striped Rows', value: foundation.tableStyle.stripedRows ? 'Yes' : 'No' },
                { label: 'Font Size', value: foundation.tableStyle.fontSize },
              ]}
            />
          </div>
        )}

        {/* Cover Page */}
        <SettingsCard title="Cover Page" cardKey="coverPage" open={openSections.coverPage} onToggle={toggleCard}>
          <div className="grid gap-4">
            <div>
              <Label>Report Title</Label>
              <Input value={draft.coverPage.reportTitle} onChange={(e) => updateCover('reportTitle', e.target.value)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show Subtitle</Label>
              <Switch checked={draft.coverPage.showSubtitle} onCheckedChange={(v) => updateCover('showSubtitle', v)} />
            </div>
            {draft.coverPage.showSubtitle && (
              <div>
                <Label>Subtitle Text</Label>
                <Input value={draft.coverPage.subtitleText} onChange={(e) => updateCover('subtitleText', e.target.value)} />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label>Show Audit Period</Label>
              <Switch checked={draft.coverPage.showAuditPeriod} onCheckedChange={(v) => updateCover('showAuditPeriod', v)} />
            </div>
            <div>
              <Label>Confidentiality Notice</Label>
              <Textarea value={draft.coverPage.confidentialityText} onChange={(e) => updateCover('confidentialityText', e.target.value)} rows={3} />
            </div>
          </div>
        </SettingsCard>

        {/* Sections — DB-driven from Section Library + template mapping */}
        <TemplateSectionsPanel documentType="audit_report" editable={true} />

        {/* Findings Layout */}
        <SettingsCard title="Findings Layout" cardKey="findings" open={openSections.findings} onToggle={toggleCard}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="max-w-xs">Show Management Response after Recommendation</Label>
              <Switch
                checked={draft.findingsLayout.showManagementResponseAfterRecommendation}
                onCheckedChange={(v) =>
                  setDraft((d) => ({ ...d, findingsLayout: { ...d.findingsLayout, showManagementResponseAfterRecommendation: v } }))
                }
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Detailed Finding Fields</Label>
              <div className="flex flex-wrap gap-2">
                {['criteria', 'condition', 'cause', 'effect', 'recommendation'].map((field) => (
                  <label key={field} className="flex items-center gap-1.5 text-sm capitalize">
                    <input
                      type="checkbox"
                      checked={draft.findingsLayout.detailedFindingFields.includes(field)}
                      onChange={(e) => {
                        setDraft((d) => ({
                          ...d,
                          findingsLayout: {
                            ...d.findingsLayout,
                            detailedFindingFields: e.target.checked
                              ? [...d.findingsLayout.detailedFindingFields, field]
                              : d.findingsLayout.detailedFindingFields.filter((f) => f !== field),
                          },
                        }));
                      }}
                      className="rounded border-input"
                    />
                    {field}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </SettingsCard>

        {/* Risk Distribution */}
        <SettingsCard title="Risk Distribution" cardKey="riskDistribution" open={openSections.riskDistribution} onToggle={toggleCard}>
          <div className="flex items-center justify-between">
            <Label>Show Risk Distribution Chart</Label>
            <Switch
              checked={draft.riskDistribution.enabled}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, riskDistribution: { enabled: v } }))}
            />
          </div>
        </SettingsCard>

        {/* Action Plan Summary */}
        <SettingsCard title="Action Plan Summary" cardKey="actionPlan" open={openSections.actionPlan} onToggle={toggleCard}>
          <div className="space-y-4">
            <div>
              <Label>Visibility</Label>
              <Select
                value={draft.actionPlanSummary.visibility}
                onValueChange={(v: any) =>
                  setDraft((d) => ({ ...d, actionPlanSummary: { ...d.actionPlanSummary, visibility: v } }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">Always</SelectItem>
                  <SelectItem value="draft_only">Draft Only</SelectItem>
                  <SelectItem value="final_only">Final Only</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Columns</Label>
              <div className="space-y-2">
                {draft.actionPlanSummary.columns.map((col, i) => (
                  <div key={col.key} className="flex items-center gap-3">
                    <Switch
                      checked={col.enabled}
                      onCheckedChange={(v) => {
                        setDraft((d) => ({
                          ...d,
                          actionPlanSummary: {
                            ...d.actionPlanSummary,
                            columns: d.actionPlanSummary.columns.map((c, ci) =>
                              ci === i ? { ...c, enabled: v } : c
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
          </div>
        </SettingsCard>
      </div>

      {/* Preview Pane */}
      {showPreview && (
        <div className="w-[45%] sticky top-4 self-start">
          <TemplatePreviewPane templateType="audit_report" config={draft} />
        </div>
      )}
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
