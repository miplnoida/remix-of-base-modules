import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Star, Copy, Pencil, Lock, Palette, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AuditPlanTemplateRow, AuditPlanFullTemplateConfig, TemplateKey } from '@/lib/audit/auditPlanTemplateTypes';
import { TEMPLATE_KEYS } from '@/lib/audit/auditPlanTemplateTypes';
import {
  PRESET_AUDIT_BLUE_MINIMAL,
  PRESET_GOVERNMENT_FORMAL,
  PRESET_PROFESSIONAL_MINIMAL,
} from '@/lib/audit/auditPlanTemplatePresets';

// Demo templates matching built-in presets
const BUILT_IN_TEMPLATES: AuditPlanTemplateRow[] = [
  {
    id: 'tpl-1', template_name: 'Audit Blue Minimal', template_key: TEMPLATE_KEYS.AUDIT_BLUE_MINIMAL,
    description: 'Navy/slate palette, 14 sections, balanced for general management use. Recommended house default.',
    is_system: true, is_active: true, config_json: PRESET_AUDIT_BLUE_MINIMAL,
    created_by: 'system', updated_by: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'tpl-2', template_name: 'Government Formal', template_key: TEMPLATE_KEYS.GOVERNMENT_FORMAL,
    description: 'All 22 sections enabled, Times New Roman 12pt, formal cover. For government/regulatory bodies.',
    is_system: true, is_active: true, config_json: PRESET_GOVERNMENT_FORMAL,
    created_by: 'system', updated_by: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'tpl-3', template_name: 'Professional Minimal', template_key: TEMPLATE_KEYS.PROFESSIONAL_MINIMAL,
    description: 'Concise 12-section plan, Calibri 11pt, modern cover. For corporate audit functions.',
    is_system: true, is_active: true, config_json: PRESET_PROFESSIONAL_MINIMAL,
    created_by: 'system', updated_by: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
];

interface AuditPlanTemplatesTabProps {
  activeTemplateId?: string;
  onSelectTemplate?: (templateId: string) => void;
}

export function AuditPlanTemplatesTab({ activeTemplateId, onSelectTemplate }: AuditPlanTemplatesTabProps) {
  const [templates, setTemplates] = useState<AuditPlanTemplateRow[]>(BUILT_IN_TEMPLATES);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneSource, setCloneSource] = useState<AuditPlanTemplateRow | null>(null);
  const [cloneName, setCloneName] = useState('');

  const handleClone = () => {
    if (!cloneSource || !cloneName.trim()) {
      toast.error('Template name is required');
      return;
    }
    const clone: AuditPlanTemplateRow = {
      ...cloneSource,
      id: crypto.randomUUID(),
      template_name: cloneName,
      template_key: `custom_${Date.now()}`,
      is_system: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTemplates((prev) => [...prev, clone]);
    toast.success(`Template "${cloneName}" created from "${cloneSource.template_name}"`);
    setShowCloneDialog(false);
    setCloneName('');
    setCloneSource(null);
  };

  const handleToggleActive = (id: string, active: boolean) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, is_active: active } : t)));
  };

  const openClone = (template: AuditPlanTemplateRow) => {
    setCloneSource(template);
    setCloneName(`${template.template_name} (Custom)`);
    setShowCloneDialog(true);
  };

  const systemTemplates = templates.filter((t) => t.is_system);
  const customTemplates = templates.filter((t) => !t.is_system);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold">Audit Plan Templates</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Built-in templates provide pre-configured formatting. Clone to create custom variants.
        </p>
      </div>

      {/* Built-in */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Built-in Templates</p>
        <div className="grid gap-3">
          {systemTemplates.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              isSelected={tpl.id === activeTemplateId}
              onSelect={() => onSelectTemplate?.(tpl.id)}
              onClone={() => openClone(tpl)}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      </div>

      {/* Custom */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom Templates</p>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => openClone(systemTemplates[0])}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New from Template
          </Button>
        </div>
        {customTemplates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-md border-dashed">
            <p className="text-sm">No custom templates yet.</p>
            <p className="text-xs mt-1">Clone a built-in template to create your own.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {customTemplates.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                isSelected={tpl.id === activeTemplateId}
                onSelect={() => onSelectTemplate?.(tpl.id)}
                onClone={() => openClone(tpl)}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        )}
      </div>

      {/* Clone dialog */}
      <Dialog open={showCloneDialog} onOpenChange={(open) => { if (!open) { setShowCloneDialog(false); setCloneSource(null); setCloneName(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clone Template</DialogTitle>
            <DialogDescription>
              Create a new editable template based on "{cloneSource?.template_name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>New Template Name *</Label>
              <Input
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="e.g. SSB Custom Plan"
                maxLength={100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCloneDialog(false); setCloneSource(null); setCloneName(''); }}>Cancel</Button>
            <Button onClick={handleClone}>
              <Copy className="h-4 w-4 mr-1" /> Clone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateCard({
  template,
  isSelected,
  onSelect,
  onClone,
  onToggleActive,
}: {
  template: AuditPlanTemplateRow;
  isSelected: boolean;
  onSelect: () => void;
  onClone: () => void;
  onToggleActive: (id: string, active: boolean) => void;
}) {
  const palette = template.config_json.branding.colorPalette;
  const enabledSections = template.config_json.sections.filter((s) => s.enabled).length;
  const totalSections = template.config_json.sections.length;

  return (
    <Card className={`transition-all ${isSelected ? 'ring-2 ring-primary' : ''} ${!template.is_active ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold">{template.template_name}</h4>
              {template.is_system && (
                <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                  <Lock className="h-2.5 w-2.5" /> Built-in
                </Badge>
              )}
              {isSelected && (
                <Badge variant="default" className="text-[10px] h-5 gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Active
                </Badge>
              )}
            </div>
            {template.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground">{enabledSections}/{totalSections} sections</span>
              <span className="text-[10px] text-muted-foreground">{template.config_json.typography.fontFamily} {template.config_json.typography.baseFontSize}pt</span>
              <span className="text-[10px] text-muted-foreground">{template.config_json.coverPage.coverStyle} cover</span>
              {/* Palette swatches */}
              <div className="flex gap-0.5">
                {[palette.primary, palette.secondary, palette.accent].map((color, i) => (
                  <div key={i} className="w-3 h-3 rounded-sm border border-border" style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Switch
              checked={template.is_active}
              onCheckedChange={(v) => onToggleActive(template.id, v)}
              className="mr-1"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClone} title="Clone">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={onSelect}>
              <Pencil className="h-3 w-3 mr-1" /> Edit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
