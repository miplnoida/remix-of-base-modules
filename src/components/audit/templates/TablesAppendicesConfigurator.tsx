import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Table2 } from 'lucide-react';
import type {
  AuditPlanTableStyle,
  TableFontSize,
  TableAutoFitMode,
} from '@/lib/audit/auditPlanTemplateTypes';

interface TablesAppendicesConfiguratorProps {
  tableStyle: AuditPlanTableStyle;
  onTableStyleChange: (t: AuditPlanTableStyle) => void;
}

const TABLE_STYLE_PRESETS = [
  { key: 'navy_stripe', label: 'Navy Striped', header: '#1E3A5F', headerText: '#FFFFFF', stripe: '#F5F8FC', border: '#D1D5DB', striped: true },
  { key: 'charcoal_stripe', label: 'Charcoal Striped', header: '#1B2838', headerText: '#FFFFFF', stripe: '#F3F4F6', border: '#C4C9CF', striped: true },
  { key: 'slate_clean', label: 'Slate Clean', header: '#455A64', headerText: '#FFFFFF', stripe: '#F5F5F5', border: '#CFD8DC', striped: false },
  { key: 'indigo_formal', label: 'Indigo Formal', header: '#1A237E', headerText: '#FFFFFF', stripe: '#F5F5FF', border: '#C5CAE9', striped: true },
  { key: 'minimal_gray', label: 'Minimal Gray', header: '#F3F4F6', headerText: '#1A1A1A', stripe: '#FAFBFC', border: '#E5E7EB', striped: true },
];

export function TablesAppendicesConfigurator({ tableStyle, onTableStyleChange }: TablesAppendicesConfiguratorProps) {
  const updateTable = (patch: Partial<AuditPlanTableStyle>) => onTableStyleChange({ ...tableStyle, ...patch });

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

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <ColorRow label="Header Background" value={tableStyle.headerBackground} onChange={(v) => updateTable({ headerBackground: v })} />
          <ColorRow label="Header Text" value={tableStyle.headerTextColor} onChange={(v) => updateTable({ headerTextColor: v })} />
          <ColorRow label="Stripe Color" value={tableStyle.stripeColor} onChange={(v) => updateTable({ stripeColor: v })} />
          <ColorRow label="Border Color" value={tableStyle.borderColor} onChange={(v) => updateTable({ borderColor: v })} />
        </div>

        <div className="space-y-3 mt-4">
          <ToggleRow label="Striped Rows" desc="Alternating row background colors" checked={tableStyle.stripedRows} onChange={(v) => updateTable({ stripedRows: v })} />
          <ToggleRow label="Repeat Header on Page Break" desc="Table headers repeat when table spans pages" checked={tableStyle.repeatHeaderOnPageBreak} onChange={(v) => updateTable({ repeatHeaderOnPageBreak: v })} />
          <ToggleRow label="Bold Total Rows" desc="Emphasize summary/total rows" checked={tableStyle.boldTotalRows} onChange={(v) => updateTable({ boldTotalRows: v })} />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <Label className="text-xs">Font Size</Label>
            <Select value={tableStyle.fontSize} onValueChange={(v) => updateTable({ fontSize: v as TableFontSize })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (9pt)</SelectItem>
                <SelectItem value="normal">Normal (10pt)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Auto-Fit Mode</Label>
            <Select value={tableStyle.autoFitMode} onValueChange={(v) => updateTable({ autoFitMode: v as TableAutoFitMode })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed column widths</SelectItem>
                <SelectItem value="auto_fit_content">Auto-fit to content</SelectItem>
                <SelectItem value="auto_fit_window">Auto-fit to page width</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4">
          <Label className="text-xs">Cell Padding ({tableStyle.cellPadding}pt)</Label>
          <Slider
            value={[tableStyle.cellPadding]}
            onValueChange={([v]) => updateTable({ cellPadding: v })}
            min={2}
            max={8}
            step={1}
            className="mt-1"
          />
        </div>
      </div>

      <Separator />

      {/* Table Preview */}
      <div className="rounded-md border bg-muted/30 p-3">
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
        <table className="w-full text-[10px] border-collapse" style={{ borderColor: tableStyle.borderColor }}>
          <thead>
            <tr>
              {['Ref', 'Auditable Area', 'Risk Rating', 'Quarter'].map((col) => (
                <th
                  key={col}
                  className="text-left font-semibold border"
                  style={{
                    backgroundColor: tableStyle.headerBackground,
                    color: tableStyle.headerTextColor,
                    padding: `${tableStyle.cellPadding * 0.6}px ${tableStyle.cellPadding}px`,
                    borderColor: tableStyle.borderColor,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['1.1', 'Payroll Processing', 'High', 'Q1'],
              ['1.2', 'Vendor Management', 'Medium', 'Q2'],
              ['1.3', 'IT Security', 'High', 'Q3'],
              ['', '', 'Total: 3', ''],
            ].map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="border"
                    style={{
                      backgroundColor: ri === 3 ? 'transparent' : (tableStyle.stripedRows && ri % 2 === 1 ? tableStyle.stripeColor : 'transparent'),
                      padding: `${tableStyle.cellPadding * 0.6}px ${tableStyle.cellPadding}px`,
                      borderColor: tableStyle.borderColor,
                      fontWeight: ri === 3 && tableStyle.boldTotalRows ? 700 : 400,
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label className="text-xs">{label}</Label>
        {desc && <p className="text-[10px] text-muted-foreground">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-7 h-7 rounded border cursor-pointer" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-7 text-xs font-mono flex-1" />
      </div>
    </div>
  );
}
