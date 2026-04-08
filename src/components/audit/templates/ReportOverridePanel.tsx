import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, RotateCcw, Settings2 } from 'lucide-react';
import type { AuditReportTemplateConfig } from '@/lib/audit/documentTemplateDefaults';
import type { ReportTemplateOverride } from '@/lib/audit/documentTemplateOverrides';
import { hasReportOverrides } from '@/lib/audit/documentTemplateOverrides';

interface ReportOverridePanelProps {
  baseConfig: AuditReportTemplateConfig;
  overrides: ReportTemplateOverride;
  onChange: (overrides: ReportTemplateOverride) => void;
  onReset: () => void;
}

export function ReportOverridePanel({ baseConfig, overrides, onChange, onReset }: ReportOverridePanelProps) {
  const hasChanges = hasReportOverrides(overrides);

  const update = (partial: Partial<ReportTemplateOverride>) => {
    onChange({ ...overrides, ...partial });
  };

  const sections = baseConfig.sectionRefs || baseConfig.sections || [];

  return (
    <Card className="border-dashed border-primary/30">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Document Overrides</CardTitle>
            {hasChanges && (
              <Badge variant="secondary" className="text-[10px]">Modified</Badge>
            )}
          </div>
          {hasChanges && (
            <Button variant="ghost" size="sm" onClick={onReset} className="h-7 text-xs gap-1">
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          These changes apply only to this document and do not affect organization defaults.
          Formatting (branding, typography, sign-off) is controlled in Foundation.
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Cover Page */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
            Cover Page
            <ChevronDown className="h-3 w-3" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Subtitle</Label>
              <Switch
                checked={overrides.showSubtitle ?? baseConfig.coverPage.showSubtitle}
                onCheckedChange={(v) => update({ showSubtitle: v })}
              />
            </div>
            <div>
              <Label className="text-xs">Subtitle Text</Label>
              <Input
                className="h-8 text-xs mt-1"
                value={overrides.subtitleText ?? baseConfig.coverPage.subtitleText}
                onChange={(e) => update({ subtitleText: e.target.value })}
                placeholder={baseConfig.coverPage.subtitleText}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Sections */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
            Sections
            <ChevronDown className="h-3 w-3" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            {sections.map((sec) => {
              const ov = overrides.sectionOverrides?.find((s) => s.id === sec.id);
              const isEnabled = ov?.enabled ?? sec.enabled;
              return (
                <div key={sec.id} className="flex items-center justify-between">
                  <Label className="text-xs">{sec.label}</Label>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(v) => {
                      const existing = overrides.sectionOverrides?.filter((s) => s.id !== sec.id) || [];
                      update({
                        sectionOverrides: [...existing, { id: sec.id, enabled: v }],
                      });
                    }}
                  />
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Output Mode */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
            Output Rules
            <ChevronDown className="h-3 w-3" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-3">
            <div>
              <Label className="text-xs">Output Mode</Label>
              <Select
                value={overrides.outputMode || 'auto'}
                onValueChange={(v) => update({ outputMode: v as 'draft' | 'final' | 'auto' })}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (based on status)</SelectItem>
                  <SelectItem value="draft">Force Draft</SelectItem>
                  <SelectItem value="final">Force Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Risk Distribution</Label>
              <Switch
                checked={overrides.riskDistributionEnabled ?? baseConfig.riskDistribution.enabled}
                onCheckedChange={(v) => update({ riskDistributionEnabled: v })}
              />
            </div>
            <div>
              <Label className="text-xs">Action Plan Visibility</Label>
              <Select
                value={overrides.actionPlanVisibility || baseConfig.actionPlanSummary.visibility}
                onValueChange={(v) => update({ actionPlanVisibility: v as any })}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">Always</SelectItem>
                  <SelectItem value="draft_only">Draft Only</SelectItem>
                  <SelectItem value="final_only">Final Only</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Inline Management Response</Label>
              <Switch
                checked={overrides.showManagementResponseAfterRecommendation ?? baseConfig.findingsLayout.showManagementResponseAfterRecommendation}
                onCheckedChange={(v) => update({ showManagementResponseAfterRecommendation: v })}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Action Plan Columns */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
            Action Plan Columns
            <ChevronDown className="h-3 w-3" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            {baseConfig.actionPlanSummary.columns.map((col) => {
              const ov = overrides.actionPlanColumnOverrides?.find((c) => c.key === col.key);
              const isEnabled = ov?.enabled ?? col.enabled;
              return (
                <div key={col.key} className="flex items-center justify-between">
                  <Label className="text-xs">{col.label}</Label>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(v) => {
                      const existing = overrides.actionPlanColumnOverrides?.filter((c) => c.key !== col.key) || [];
                      update({
                        actionPlanColumnOverrides: [...existing, { key: col.key, enabled: v }],
                      });
                    }}
                  />
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
