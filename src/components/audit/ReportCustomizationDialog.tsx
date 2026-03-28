import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { FileText, Palette, Layout, Settings2 } from 'lucide-react';

export interface ReportConfig {
  colorTheme: 'ssb-green' | 'ssb-formal' | 'ssb-classic';
  includeCoverPage: boolean;
  includeExecutiveSummary: boolean;
  includeRiskCoverage: boolean;
  includeEngagementSchedule: boolean;
  includeResourceSummary: boolean;
  includeGapAnalysis: boolean;
  includeGovernance: boolean;
  includeAuditorBreakdown: boolean;
  includeQuarterBreakdown: boolean;
  headerTitle: string;
  headerSubtitle: string;
  confidentialityLabel: string;
  showDraftWatermark: boolean;
  pageOrientation: 'portrait' | 'landscape';
}

export const DEFAULT_REPORT_CONFIG: ReportConfig = {
  colorTheme: 'ssb-green',
  includeCoverPage: true,
  includeExecutiveSummary: true,
  includeRiskCoverage: true,
  includeEngagementSchedule: true,
  includeResourceSummary: true,
  includeGapAnalysis: true,
  includeGovernance: true,
  includeAuditorBreakdown: true,
  includeQuarterBreakdown: true,
  headerTitle: 'Social Security Board',
  headerSubtitle: 'Internal Audit Department',
  confidentialityLabel: 'CONFIDENTIAL',
  showDraftWatermark: true,
  pageOrientation: 'portrait',
};

export const THEME_COLORS: Record<string, { primary: [number, number, number]; secondary: [number, number, number]; accent: [number, number, number]; altRow: [number, number, number]; label: string; description: string }> = {
  'ssb-green': {
    primary: [14, 95, 58],    // #0E5F3A - SSB Official Green
    secondary: [30, 142, 62], // #1E8E3E - SSB Green Light
    accent: [244, 196, 48],   // #F4C430 - SSB Yellow
    altRow: [240, 253, 244],  // green-50
    label: 'SSB Official Green',
    description: 'National branding with green headers and gold accents',
  },
  'ssb-formal': {
    primary: [14, 95, 58],    // Still SSB green
    secondary: [7, 61, 36],   // Darker green
    accent: [14, 95, 58],
    altRow: [245, 247, 250],
    label: 'SSB Formal',
    description: 'Formal dark green theme for board-level documents',
  },
  'ssb-classic': {
    primary: [10, 77, 46],    // #0A4D2E - SSB Green 700
    secondary: [14, 95, 58],
    accent: [214, 40, 40],    // SSB Red accent
    altRow: [220, 252, 231],  // green-100
    label: 'SSB Classic',
    description: 'Classic green with red accents for high-visibility items',
  },
};

interface ReportCustomizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ReportConfig;
  onConfigChange: (config: ReportConfig) => void;
  onGenerate: (config: ReportConfig) => void;
  reportType: string;
  generating: boolean;
}

export function ReportCustomizationDialog({
  open, onOpenChange, config, onConfigChange, onGenerate, reportType, generating
}: ReportCustomizationDialogProps) {
  const [localConfig, setLocalConfig] = useState<ReportConfig>(config);

  const update = (key: keyof ReportConfig, value: any) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerate = () => {
    onConfigChange(localConfig);
    onGenerate(localConfig);
    onOpenChange(false);
  };

  const isDetailed = reportType === 'detailed_plan_pdf';
  const reportLabel = reportType === 'board_summary_pdf' ? 'Board Summary PDF' : reportType === 'detailed_plan_pdf' ? 'Detailed Plan PDF' : 'Excel Annex';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Customize Report — {reportLabel}
          </DialogTitle>
          <DialogDescription>Configure the format and content of your report before generating.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Color Theme */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-semibold">
              <Palette className="h-4 w-4 text-primary" /> Color Theme
            </Label>
            <Select value={localConfig.colorTheme} onValueChange={v => update('colorTheme', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(THEME_COLORS).map(([key, theme]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `rgb(${theme.primary.join(',')})` }} />
                      {theme.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{THEME_COLORS[localConfig.colorTheme]?.description}</p>
          </div>

          <Separator />

          {/* Layout */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-semibold">
              <Layout className="h-4 w-4 text-primary" /> Layout & Format
            </Label>
            {isDetailed && (
              <div className="space-y-1.5">
                <Label className="text-xs">Page Orientation</Label>
                <Select value={localConfig.pageOrientation} onValueChange={v => update('pageOrientation', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="space-y-1">
                <Label className="text-xs">Header Title</Label>
                <Input value={localConfig.headerTitle} onChange={e => update('headerTitle', e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Subtitle</Label>
                <Input value={localConfig.headerSubtitle} onChange={e => update('headerSubtitle', e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Confidentiality Label</Label>
                <Input value={localConfig.confidentialityLabel} onChange={e => update('confidentialityLabel', e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Sections */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-semibold">
              <FileText className="h-4 w-4 text-primary" /> Sections to Include
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'includeCoverPage', label: 'Cover Page', always: false },
                { key: 'includeExecutiveSummary', label: 'Executive Summary', always: false },
                { key: 'includeRiskCoverage', label: 'Risk Coverage Summary', always: false },
                { key: 'includeEngagementSchedule', label: 'Engagement Schedule', always: true },
                { key: 'includeResourceSummary', label: 'Resource Summary', always: false },
                { key: 'includeAuditorBreakdown', label: 'Auditor Breakdown', always: false },
                { key: 'includeQuarterBreakdown', label: 'Quarter Breakdown', always: false },
                { key: 'includeGapAnalysis', label: 'Gap Analysis', always: false },
                { key: 'includeGovernance', label: 'Governance & Approval', always: false },
              ].map(section => (
                <div key={section.key} className="flex items-center gap-2">
                  <Checkbox
                    id={section.key}
                    checked={localConfig[section.key as keyof ReportConfig] as boolean}
                    onCheckedChange={v => update(section.key as keyof ReportConfig, v)}
                    disabled={section.always}
                  />
                  <Label htmlFor={section.key} className="text-xs cursor-pointer">{section.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Watermark */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="watermark"
              checked={localConfig.showDraftWatermark}
              onCheckedChange={v => update('showDraftWatermark', v)}
            />
            <Label htmlFor="watermark" className="text-xs cursor-pointer">Show DRAFT watermark on non-approved plans</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating...' : 'Generate Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
