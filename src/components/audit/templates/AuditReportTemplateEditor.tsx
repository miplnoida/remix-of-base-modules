import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Save, ChevronDown, ChevronUp, GripVertical, Plus, Trash2, Eye } from 'lucide-react';
import { useAuditReportTemplate, useAuditDocumentTemplateMutation } from '@/hooks/useAuditDocumentTemplates';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';
import { DEFAULT_AUDIT_REPORT_CONFIG, type AuditReportTemplateConfig, type TemplateSection, type TemplateSignatory } from '@/lib/audit/documentTemplateDefaults';
import { TemplatePreviewPane } from './TemplatePreviewPane';

export function AuditReportTemplateEditor() {
  const { data: config, isLoading } = useAuditReportTemplate();
  const mutation = useAuditDocumentTemplateMutation();
  const { userCode } = useUserCode();
  const [draft, setDraft] = useState<AuditReportTemplateConfig>(DEFAULT_AUDIT_REPORT_CONFIG);
  const [showPreview, setShowPreview] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    branding: true, coverPage: false, sections: false, findings: false,
    riskDistribution: false, actionPlan: false, signOff: false, draftFinal: false,
  });

  useEffect(() => {
    if (config) setDraft(config);
  }, [config]);

  const toggleCard = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = () => {
    mutation.mutate(
      { templateType: 'audit_report', configJson: draft as any, updatedBy: userCode || 'system' },
      {
        onSuccess: () => toast.success('Audit Report template saved'),
        onError: (e) => toast.error('Failed to save template', { description: String(e) }),
      }
    );
  };

  const updateBranding = (key: string, value: any) =>
    setDraft((d) => ({ ...d, branding: { ...d.branding, [key]: value } }));

  const updateCover = (key: string, value: any) =>
    setDraft((d) => ({ ...d, coverPage: { ...d.coverPage, [key]: value } }));

  const updateSection = (id: string, updates: Partial<TemplateSection>) =>
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));

  const moveSection = (id: string, direction: 'up' | 'down') => {
    setDraft((d) => {
      const sorted = [...d.sections].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((s) => s.id === id);
      if ((direction === 'up' && idx <= 0) || (direction === 'down' && idx >= sorted.length - 1)) return d;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      const newSections = sorted.map((s, i) => {
        if (i === idx) return { ...s, order: swapIdx + 1 };
        if (i === swapIdx) return { ...s, order: idx + 1 };
        return { ...s, order: i + 1 };
      });
      return { ...d, sections: newSections };
    });
  };

  const updateSignatory = (idx: number, updates: Partial<TemplateSignatory>) =>
    setDraft((d) => ({
      ...d,
      signOff: {
        ...d.signOff,
        signatories: d.signOff.signatories.map((s, i) => (i === idx ? { ...s, ...updates } : s)),
      },
    }));

  const addSignatory = () =>
    setDraft((d) => ({
      ...d,
      signOff: {
        ...d.signOff,
        signatories: [...d.signOff.signatories, { label: '', defaultName: '', roleTitle: '' }],
      },
    }));

  const removeSignatory = (idx: number) =>
    setDraft((d) => ({
      ...d,
      signOff: {
        ...d.signOff,
        signatories: d.signOff.signatories.filter((_, i) => i !== idx),
      },
    }));

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading template…</div>;

  const sortedSections = [...draft.sections].sort((a, b) => a.order - b.order);

  return (
    <div className="flex gap-6">
      <div className={`flex-1 space-y-4 ${showPreview ? 'max-w-[55%]' : ''}`}>
        {/* Save Bar */}
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

        {/* Branding */}
        <SettingsCard title="Branding" cardKey="branding" open={openSections.branding} onToggle={toggleCard}>
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <Label>Show Logo on Cover</Label>
              <Switch checked={draft.branding.showLogo} onCheckedChange={(v) => updateBranding('showLogo', v)} />
            </div>
            <div>
              <Label>Organization Name</Label>
              <Input value={draft.branding.orgName} onChange={(e) => updateBranding('orgName', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Country</Label>
                <Input value={draft.branding.country} onChange={(e) => updateBranding('country', e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={draft.branding.phone} onChange={(e) => updateBranding('phone', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={draft.branding.address} onChange={(e) => updateBranding('address', e.target.value)} />
            </div>
          </div>
        </SettingsCard>

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

        {/* Sections */}
        <SettingsCard title="Sections & Order" cardKey="sections" open={openSections.sections} onToggle={toggleCard}>
          <div className="space-y-2">
            {sortedSections.map((section) => (
              <div key={section.id} className="flex items-center gap-3 p-2 rounded-md border bg-muted/30">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1 font-medium">{section.label}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(section.id, 'up')}>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(section.id, 'down')}>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Switch
                  checked={section.enabled}
                  onCheckedChange={(v) => updateSection(section.id, { enabled: v })}
                />
              </div>
            ))}
          </div>
        </SettingsCard>

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

        {/* Sign-off */}
        <SettingsCard title="Sign-off & Governance" cardKey="signOff" open={openSections.signOff} onToggle={toggleCard}>
          <div className="space-y-4">
            {draft.signOff.signatories.map((sig, i) => (
              <div key={i} className="grid grid-cols-3 gap-3 items-end p-3 border rounded-md bg-muted/20">
                <div>
                  <Label className="text-xs">Label</Label>
                  <Input value={sig.label} onChange={(e) => updateSignatory(i, { label: e.target.value })} placeholder="e.g. Prepared By" />
                </div>
                <div>
                  <Label className="text-xs">Default Name</Label>
                  <Input value={sig.defaultName} onChange={(e) => updateSignatory(i, { defaultName: e.target.value })} placeholder="Optional" />
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Role Title</Label>
                    <Input value={sig.roleTitle} onChange={(e) => updateSignatory(i, { roleTitle: e.target.value })} placeholder="e.g. Internal Auditor" />
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeSignatory(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addSignatory}>
              <Plus className="h-4 w-4 mr-1" /> Add Signatory
            </Button>
          </div>
        </SettingsCard>

        {/* Draft / Final Rules */}
        <SettingsCard title="Draft & Final Rules" cardKey="draftFinal" open={openSections.draftFinal} onToggle={toggleCard}>
          <div className="space-y-4">
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase">Draft Rules</p>
            <div className="flex items-center justify-between">
              <Label>Show Watermark</Label>
              <Switch
                checked={draft.draftRules.showWatermark}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, draftRules: { ...d.draftRules, showWatermark: v } }))}
              />
            </div>
            {draft.draftRules.showWatermark && (
              <div>
                <Label>Watermark Text</Label>
                <Input
                  value={draft.draftRules.watermarkText}
                  onChange={(e) => setDraft((d) => ({ ...d, draftRules: { ...d.draftRules, watermarkText: e.target.value } }))}
                />
              </div>
            )}
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase">Final Rules</p>
            <div className="flex items-center justify-between">
              <Label>Show Issued Stamp</Label>
              <Switch
                checked={draft.finalRules.showIssuedStamp}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, finalRules: { ...d.finalRules, showIssuedStamp: v } }))}
              />
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
