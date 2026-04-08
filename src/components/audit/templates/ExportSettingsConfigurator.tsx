import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { FileDown, FileText, Printer } from 'lucide-react';
import type { AuditPlanExportDefaults, ExportFormat } from '@/lib/audit/auditPlanTemplateTypes';

interface ExportSettingsConfiguratorProps {
  exportDefaults: AuditPlanExportDefaults;
  onChange: (exportDefaults: AuditPlanExportDefaults) => void;
}

export function ExportSettingsConfigurator({ exportDefaults, onChange }: ExportSettingsConfiguratorProps) {
  const update = (patch: Partial<AuditPlanExportDefaults>) => onChange({ ...exportDefaults, ...patch });

  return (
    <div className="space-y-6">
      {/* Default Format */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileDown className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Default Export Format</h4>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {([
            { value: 'pdf' as ExportFormat, label: 'PDF', icon: <FileDown className="h-4 w-4" />, desc: 'Fixed layout, print-ready' },
            { value: 'docx' as ExportFormat, label: 'DOCX', icon: <FileText className="h-4 w-4" />, desc: 'Editable Word document' },
            { value: 'print' as ExportFormat, label: 'Print', icon: <Printer className="h-4 w-4" />, desc: 'Browser print dialog' },
          ]).map((fmt) => (
            <button
              key={fmt.value}
              type="button"
              onClick={() => update({ defaultFormat: fmt.value })}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors text-center ${
                exportDefaults.defaultFormat === fmt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              {fmt.icon}
              <span className="text-xs font-semibold">{fmt.label}</span>
              <span className="text-[10px] text-muted-foreground">{fmt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* DOCX Settings */}
      <div>
        <h4 className="text-sm font-semibold mb-3">DOCX Options</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>Editable Narrative Sections</Label>
              <p className="text-xs text-muted-foreground">Allow editing of narrative text in exported DOCX</p>
            </div>
            <Switch
              checked={exportDefaults.docxEditableNarratives}
              onCheckedChange={(v) => update({ docxEditableNarratives: v })}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Draft Watermark */}
      <div>
        <h4 className="text-sm font-semibold mb-3">Draft Watermark</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Draft Watermark on Export</Label>
              <p className="text-xs text-muted-foreground">Overlays diagonal watermark text on exported documents</p>
            </div>
            <Switch
              checked={exportDefaults.draftWatermark}
              onCheckedChange={(v) => update({ draftWatermark: v })}
            />
          </div>

          {exportDefaults.draftWatermark && (
            <div>
              <Label className="text-xs">Watermark Text</Label>
              <Input
                value={exportDefaults.draftWatermarkText}
                onChange={(e) => update({ draftWatermarkText: e.target.value })}
                placeholder="DRAFT"
                maxLength={40}
                className="h-8 text-sm"
              />
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Summary */}
      <div className="rounded-md border bg-muted/30 p-3">
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">Current Settings</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-[10px]">
            Format: {exportDefaults.defaultFormat.toUpperCase()}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            DOCX Editable: {exportDefaults.docxEditableNarratives ? 'Yes' : 'No'}
          </Badge>
          <Badge variant={exportDefaults.draftWatermark ? 'secondary' : 'outline'} className="text-[10px]">
            Watermark: {exportDefaults.draftWatermark ? exportDefaults.draftWatermarkText : 'Off'}
          </Badge>
        </div>
      </div>
    </div>
  );
}
