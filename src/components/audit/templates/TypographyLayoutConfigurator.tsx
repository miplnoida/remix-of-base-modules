import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Type, Ruler, Table2 } from 'lucide-react';
import type {
  AuditPlanTypography,
  AuditPlanTableStyle,
  AuditPlanPageLayout,
  PageSize,
  PageOrientation,
  TableFontSize,
  TableAutoFitMode,
  HeadingSize,
} from '@/lib/audit/auditPlanTemplateTypes';

// ─── Props ───

interface TypographyLayoutConfiguratorProps {
  typography: AuditPlanTypography;
  tableStyle: AuditPlanTableStyle;
  pageLayout: AuditPlanPageLayout;
  onTypographyChange: (t: AuditPlanTypography) => void;
  onTableStyleChange: (t: AuditPlanTableStyle) => void;
  onPageLayoutChange: (l: AuditPlanPageLayout) => void;
}

// ─── Constants ───

const FONT_OPTIONS = [
  'Arial', 'Calibri', 'Times New Roman', 'Georgia', 'Verdana',
  'Tahoma', 'Helvetica', 'Garamond', 'Cambria',
];

const PAGE_SIZE_OPTIONS: { value: PageSize; label: string; dims: string }[] = [
  { value: 'letter', label: 'US Letter', dims: '8.5″ × 11″' },
  { value: 'a4', label: 'A4', dims: '210 × 297 mm' },
  { value: 'legal', label: 'US Legal', dims: '8.5″ × 14″' },
];

const HEADING_SIZE_PRESETS: Record<HeadingSize, { h1: number; h2: number; h3: number; label: string }> = {
  compact: { h1: 14, h2: 12, h3: 10, label: 'Compact' },
  standard: { h1: 16, h2: 13, h3: 11, label: 'Standard' },
  spacious: { h1: 18, h2: 14, h3: 12, label: 'Spacious' },
};

const TABLE_STYLE_PRESETS = [
  { key: 'navy_stripe', label: 'Navy Striped', header: '#1E3A5F', headerText: '#FFFFFF', stripe: '#F5F8FC', border: '#D1D5DB', striped: true },
  { key: 'charcoal_stripe', label: 'Charcoal Striped', header: '#1B2838', headerText: '#FFFFFF', stripe: '#F3F4F6', border: '#C4C9CF', striped: true },
  { key: 'slate_clean', label: 'Slate Clean', header: '#455A64', headerText: '#FFFFFF', stripe: '#F5F5F5', border: '#CFD8DC', striped: false },
  { key: 'indigo_formal', label: 'Indigo Formal', header: '#1A237E', headerText: '#FFFFFF', stripe: '#F5F5FF', border: '#C5CAE9', striped: true },
  { key: 'minimal_gray', label: 'Minimal Gray', header: '#F3F4F6', headerText: '#1A1A1A', stripe: '#FAFBFC', border: '#E5E7EB', striped: true },
];

// ─── Component ───

export function TypographyLayoutConfigurator({
  typography,
  tableStyle,
  pageLayout,
  onTypographyChange,
  onTableStyleChange,
  onPageLayoutChange,
}: TypographyLayoutConfiguratorProps) {
  const updateTypo = (patch: Partial<AuditPlanTypography>) => onTypographyChange({ ...typography, ...patch });
  const updateTable = (patch: Partial<AuditPlanTableStyle>) => onTableStyleChange({ ...tableStyle, ...patch });
  const updateLayout = (patch: Partial<AuditPlanPageLayout>) => onPageLayoutChange({ ...pageLayout, ...patch });

  const applyHeadingPreset = (preset: HeadingSize) => {
    const sizes = HEADING_SIZE_PRESETS[preset];
    updateTypo({ headingSizePreset: preset, h1Size: sizes.h1, h2Size: sizes.h2, h3Size: sizes.h3 });
  };

  const applyTablePreset = (key: string) => {
    const preset = TABLE_STYLE_PRESETS.find((p) => p.key === key);
    if (!preset) return;
    updateTable({
      headerBackground: preset.header,
      headerTextColor: preset.headerText,
      stripeColor: preset.stripe,
      borderColor: preset.border,
      stripedRows: preset.striped,
    });
  };

  return (
    <div className="space-y-6">
      {/* ─── Page Layout ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Ruler className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Page Layout</h4>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Page Size</Label>
            <Select value={pageLayout.pageSize} onValueChange={(v) => updateLayout({ pageSize: v as PageSize })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label} <span className="text-muted-foreground ml-1">({opt.dims})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Orientation</Label>
            <Select value={pageLayout.orientation} onValueChange={(v) => updateLayout({ orientation: v as PageOrientation })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3">
          <Label className="text-xs mb-2 block">Margins (inches)</Label>
          <div className="grid grid-cols-4 gap-2">
            {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
              <div key={side}>
                <Label className="text-[10px] text-muted-foreground capitalize">{side}</Label>
                <Input
                  type="number"
                  step="0.25"
                  min="0.5"
                  max="2"
                  value={pageLayout.margins[side]}
                  onChange={(e) =>
                    updateLayout({
                      margins: { ...pageLayout.margins, [side]: parseFloat(e.target.value) || 1 },
                    })
                  }
                  className="h-7 text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* ─── Typography ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Type className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Typography</h4>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Body Font</Label>
            <Select value={typography.fontFamily} onValueChange={(v) => updateTypo({ fontFamily: v })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Heading Font</Label>
            <Select value={typography.headingFont} onValueChange={(v) => updateTypo({ headingFont: v })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <Label className="text-xs">Base Font Size (pt)</Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[typography.baseFontSize]}
                onValueChange={([v]) => updateTypo({ baseFontSize: v })}
                min={8}
                max={14}
                step={0.5}
                className="flex-1"
              />
              <span className="text-xs font-mono w-8 text-right">{typography.baseFontSize}</span>
            </div>
          </div>

          <div>
            <Label className="text-xs">Line Height</Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[typography.lineHeight]}
                onValueChange={([v]) => updateTypo({ lineHeight: Math.round(v * 10) / 10 })}
                min={1.0}
                max={2.0}
                step={0.1}
                className="flex-1"
              />
              <span className="text-xs font-mono w-8 text-right">{typography.lineHeight}</span>
            </div>
          </div>
        </div>

        {/* Heading sizes */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs">Heading Sizes</Label>
            <div className="flex gap-1">
              {(Object.keys(HEADING_SIZE_PRESETS) as HeadingSize[]).map((preset) => (
                <Badge
                  key={preset}
                  variant={typography.headingSizePreset === preset ? 'default' : 'outline'}
                  className="text-[9px] cursor-pointer px-1.5 py-0"
                  onClick={() => applyHeadingPreset(preset)}
                >
                  {HEADING_SIZE_PRESETS[preset].label}
                </Badge>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['h1Size', 'h2Size', 'h3Size'] as const).map((key, i) => (
              <div key={key}>
                <Label className="text-[10px] text-muted-foreground">H{i + 1} ({typography[key]}pt)</Label>
                <Slider
                  value={[typography[key]]}
                  onValueChange={([v]) => updateTypo({ [key]: v, headingSizePreset: 'standard' } as any)}
                  min={8}
                  max={24}
                  step={1}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Paragraph spacing */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Paragraph Space Before (pt)</Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[typography.paragraphSpacingBefore]}
                onValueChange={([v]) => updateTypo({ paragraphSpacingBefore: v })}
                min={0}
                max={12}
                step={1}
                className="flex-1"
              />
              <span className="text-xs font-mono w-6 text-right">{typography.paragraphSpacingBefore}</span>
            </div>
          </div>
          <div>
            <Label className="text-xs">Paragraph Space After (pt)</Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[typography.paragraphSpacingAfter]}
                onValueChange={([v]) => updateTypo({ paragraphSpacingAfter: v })}
                min={0}
                max={12}
                step={1}
                className="flex-1"
              />
              <span className="text-xs font-mono w-6 text-right">{typography.paragraphSpacingAfter}</span>
            </div>
          </div>
        </div>

        {/* Color pickers */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Heading Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={typography.headingColor}
                onChange={(e) => updateTypo({ headingColor: e.target.value })}
                className="w-7 h-7 rounded border cursor-pointer"
              />
              <Input value={typography.headingColor} onChange={(e) => updateTypo({ headingColor: e.target.value })} className="h-7 text-xs font-mono flex-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Body Text Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={typography.bodyColor}
                onChange={(e) => updateTypo({ bodyColor: e.target.value })}
                className="w-7 h-7 rounded border cursor-pointer"
              />
              <Input value={typography.bodyColor} onChange={(e) => updateTypo({ bodyColor: e.target.value })} className="h-7 text-xs font-mono flex-1" />
            </div>
          </div>
        </div>

        {/* Typography preview */}
        <div className="mt-4 rounded-md border bg-muted/30 p-3">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
          <div style={{ fontFamily: typography.headingFont, color: typography.headingColor }}>
            <p style={{ fontSize: typography.h1Size * 0.7, fontWeight: 700, marginBottom: 2 }}>H1 — Section Heading</p>
            <p style={{ fontSize: typography.h2Size * 0.7, fontWeight: 600, marginBottom: 2 }}>H2 — Sub-Heading</p>
            <p style={{ fontSize: typography.h3Size * 0.7, fontWeight: 600, marginBottom: 4 }}>H3 — Detail Heading</p>
          </div>
          <p style={{
            fontFamily: typography.fontFamily,
            fontSize: typography.baseFontSize * 0.7,
            color: typography.bodyColor,
            lineHeight: typography.lineHeight,
          }}>
            Body text at {typography.baseFontSize}pt in {typography.fontFamily} with {typography.lineHeight}× line height. Spacing before: {typography.paragraphSpacingBefore}pt, after: {typography.paragraphSpacingAfter}pt.
          </p>
        </div>
      </div>

      <Separator />

      {/* ─── Table Styling ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Table2 className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Table Styling</h4>
        </div>

        {/* Presets */}
        <div className="mb-4">
          <Label className="text-xs mb-2 block">Style Preset</Label>
          <div className="flex flex-wrap gap-1.5">
            {TABLE_STYLE_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => applyTablePreset(preset.key)}
                className="flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] hover:bg-muted/50 transition-colors"
              >
                <div className="w-3 h-3 rounded-sm border" style={{ backgroundColor: preset.header }} />
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Header Background</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={tableStyle.headerBackground} onChange={(e) => updateTable({ headerBackground: e.target.value })} className="w-7 h-7 rounded border cursor-pointer" />
              <Input value={tableStyle.headerBackground} onChange={(e) => updateTable({ headerBackground: e.target.value })} className="h-7 text-xs font-mono flex-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Header Text</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={tableStyle.headerTextColor} onChange={(e) => updateTable({ headerTextColor: e.target.value })} className="w-7 h-7 rounded border cursor-pointer" />
              <Input value={tableStyle.headerTextColor} onChange={(e) => updateTable({ headerTextColor: e.target.value })} className="h-7 text-xs font-mono flex-1" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <Label className="text-xs">Stripe Color</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={tableStyle.stripeColor} onChange={(e) => updateTable({ stripeColor: e.target.value })} className="w-7 h-7 rounded border cursor-pointer" />
              <Input value={tableStyle.stripeColor} onChange={(e) => updateTable({ stripeColor: e.target.value })} className="h-7 text-xs font-mono flex-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Border Color</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={tableStyle.borderColor} onChange={(e) => updateTable({ borderColor: e.target.value })} className="w-7 h-7 rounded border cursor-pointer" />
              <Input value={tableStyle.borderColor} onChange={(e) => updateTable({ borderColor: e.target.value })} className="h-7 text-xs font-mono flex-1" />
            </div>
          </div>
        </div>

        <div className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Striped Rows</Label>
            <Switch checked={tableStyle.stripedRows} onCheckedChange={(v) => updateTable({ stripedRows: v })} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Repeat Header on Page Break</Label>
              <p className="text-[10px] text-muted-foreground">Table headers repeat when table spans pages</p>
            </div>
            <Switch checked={tableStyle.repeatHeaderOnPageBreak} onCheckedChange={(v) => updateTable({ repeatHeaderOnPageBreak: v })} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Bold Total Rows</Label>
              <p className="text-[10px] text-muted-foreground">Bold formatting on summary/total rows</p>
            </div>
            <Switch checked={tableStyle.boldTotalRows} onCheckedChange={(v) => updateTable({ boldTotalRows: v })} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3">
          <div>
            <Label className="text-xs">Font Size</Label>
            <Select value={tableStyle.fontSize} onValueChange={(v) => updateTable({ fontSize: v as TableFontSize })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (9pt)</SelectItem>
                <SelectItem value="normal">Normal (10pt)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Auto-Fit</Label>
            <Select value={tableStyle.autoFitMode} onValueChange={(v) => updateTable({ autoFitMode: v as TableAutoFitMode })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed Width</SelectItem>
                <SelectItem value="auto_fit_content">Fit Content</SelectItem>
                <SelectItem value="auto_fit_window">Fit Page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Cell Padding (pt)</Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[tableStyle.cellPadding]}
                onValueChange={([v]) => updateTable({ cellPadding: v })}
                min={2}
                max={8}
                step={1}
                className="flex-1"
              />
              <span className="text-xs font-mono w-4 text-right">{tableStyle.cellPadding}</span>
            </div>
          </div>
        </div>

        {/* Table preview */}
        <div className="mt-4 rounded-md border bg-muted/30 p-3">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">Table Preview</p>
          <TableMiniPreview tableStyle={tableStyle} />
        </div>
      </div>
    </div>
  );
}

// ─── Mini Preview: Table ───

function TableMiniPreview({ tableStyle }: { tableStyle: AuditPlanTableStyle }) {
  const fontSize = tableStyle.fontSize === 'small' ? 8 : 9;
  const pad = tableStyle.cellPadding * 0.6;

  return (
    <table className="w-full border-collapse" style={{ fontSize, borderColor: tableStyle.borderColor }}>
      <thead>
        <tr>
          {['Audit Area', 'Risk', 'Status', 'Days'].map((h) => (
            <th
              key={h}
              className="text-left font-semibold"
              style={{
                backgroundColor: tableStyle.headerBackground,
                color: tableStyle.headerTextColor,
                padding: `${pad}px ${pad + 2}px`,
                border: `1px solid ${tableStyle.borderColor}`,
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[
          ['Revenue Cycle', 'High', 'Planned', '15'],
          ['Procurement', 'Medium', 'Planned', '10'],
          ['IT General Controls', 'High', 'In Progress', '12'],
          ['Total', '', '', '37'],
        ].map((row, ri) => {
          const isStripe = tableStyle.stripedRows && ri % 2 === 1;
          const isTotal = ri === 3;
          return (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: `${pad}px ${pad + 2}px`,
                    border: `1px solid ${tableStyle.borderColor}`,
                    backgroundColor: isStripe ? tableStyle.stripeColor : 'transparent',
                    fontWeight: isTotal && tableStyle.boldTotalRows ? 700 : 400,
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
