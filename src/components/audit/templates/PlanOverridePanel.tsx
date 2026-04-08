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
import type { AuditPlanTemplateConfig } from '@/lib/audit/documentTemplateDefaults';
import type { PlanTemplateOverride } from '@/lib/audit/documentTemplateOverrides';
import { hasPlanOverrides } from '@/lib/audit/documentTemplateOverrides';

interface PlanOverridePanelProps {
  baseConfig: AuditPlanTemplateConfig;
  overrides: PlanTemplateOverride;
  onChange: (overrides: PlanTemplateOverride) => void;
  onReset: () => void;
}

export function PlanOverridePanel({ baseConfig, overrides, onChange, onReset }: PlanOverridePanelProps) {
  const hasChanges = hasPlanOverrides(overrides);

  const update = (partial: Partial<PlanTemplateOverride>) => {
    onChange({ ...overrides, ...partial });
  };

  return (
    <Card className="border-dashed border-primary/30">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Plan Overrides</CardTitle>
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
            <div>
              <Label className="text-xs">Title</Label>
              <Input
                className="h-8 text-xs mt-1"
                value={overrides.titleText ?? baseConfig.coverPage.titleText}
                onChange={(e) => update({ titleText: e.target.value })}
                placeholder={baseConfig.coverPage.titleText}
              />
            </div>
            <div>
              <Label className="text-xs">Fiscal Year Mode</Label>
              <Select
                value={overrides.fiscalYearMode || baseConfig.coverPage.fiscalYearMode}
                onValueChange={(v) => update({ fiscalYearMode: v as 'single' | 'range' })}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Year</SelectItem>
                  <SelectItem value="range">Year Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Summary */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
            Plan Summary
            <ChevronDown className="h-3 w-3" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Split by Engagement Type</Label>
              <Switch
                checked={overrides.splitByType ?? baseConfig.planSummary.splitByType}
                onCheckedChange={(v) => update({ splitByType: v })}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Governance */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
            Governance
            <ChevronDown className="h-3 w-3" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-3">
            <div>
              <Label className="text-xs">Prepared By Label</Label>
              <Input
                className="h-8 text-xs mt-1"
                value={overrides.preparedByLabel ?? baseConfig.governance.preparedByLabel}
                onChange={(e) => update({ preparedByLabel: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Approved By Label</Label>
              <Input
                className="h-8 text-xs mt-1"
                value={overrides.approvedByLabel ?? baseConfig.governance.approvedByLabel}
                onChange={(e) => update({ approvedByLabel: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Board Line</Label>
              <Switch
                checked={overrides.showBoardLine ?? baseConfig.governance.showBoardLine}
                onCheckedChange={(v) => update({ showBoardLine: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Risk Coverage</Label>
              <Switch
                checked={overrides.riskCoverageEnabled ?? baseConfig.riskCoverage.enabled}
                onCheckedChange={(v) => update({ riskCoverageEnabled: v })}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
