import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Plus, Star, Copy, Pencil, Lock, CheckCircle2, Archive, Upload, RotateCcw,
  Trash2, AlertTriangle, Hash, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useAuditPlanTemplates,
  useTemplatePermission,
  useCloneTemplate,
  useChangeTemplateStatus,
  useSetHouseDefault,
  useDeleteTemplate,
} from '@/hooks/useAuditPlanTemplateGovernance';
import {
  type GovernedTemplateRow,
  type TemplateStatus,
  checkTemplateAction,
  formatVersionLabel,
  getStatusLabel,
  getStatusBadgeVariant,
  isEditable,
  isProtected,
} from '@/lib/audit/auditPlanTemplateGovernance';

interface AuditPlanTemplatesTabProps {
  activeTemplateId?: string;
  onSelectTemplate?: (templateId: string) => void;
}

export function AuditPlanTemplatesTab({ activeTemplateId, onSelectTemplate }: AuditPlanTemplatesTabProps) {
  const { data: templates = [], isLoading } = useAuditPlanTemplates();
  const { can, canOnTemplate, getBlockReason } = useTemplatePermission();
  const cloneMutation = useCloneTemplate();
  const statusMutation = useChangeTemplateStatus();
  const defaultMutation = useSetHouseDefault();
  const deleteMutation = useDeleteTemplate();

  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneSource, setCloneSource] = useState<GovernedTemplateRow | null>(null);
  const [cloneName, setCloneName] = useState('');
  const [cloneDescription, setCloneDescription] = useState('');

  const [confirmAction, setConfirmAction] = useState<{
    template: GovernedTemplateRow;
    action: 'publish' | 'archive' | 'restore' | 'delete';
  } | null>(null);

  const systemTemplates = templates.filter((t) => t.is_system);
  const customTemplates = templates.filter((t) => !t.is_system);

  const openClone = (template: GovernedTemplateRow) => {
    setCloneSource(template);
    setCloneName(`${template.template_name} (Custom)`);
    setCloneDescription('');
    setShowCloneDialog(true);
  };

  const handleClone = () => {
    if (!cloneSource || !cloneName.trim()) {
      toast.error('Template name is required');
      return;
    }
    cloneMutation.mutate(
      {
        source: cloneSource,
        options: {
          newName: cloneName.trim(),
          newDescription: cloneDescription.trim() || undefined,
          clonedByUserCode: 'system', // Will be replaced by actual user code in real context
        },
      },
      {
        onSuccess: () => {
          setShowCloneDialog(false);
          setCloneSource(null);
          setCloneName('');
          setCloneDescription('');
        },
      }
    );
  };

  const handleStatusChange = (template: GovernedTemplateRow, newStatus: TemplateStatus) => {
    statusMutation.mutate({
      templateId: template.id,
      currentStatus: template.status,
      newStatus,
      updatedBy: 'system',
    });
    setConfirmAction(null);
  };

  const handleSetDefault = (template: GovernedTemplateRow) => {
    defaultMutation.mutate({ templateId: template.id, updatedBy: 'system' });
  };

  const handleDelete = (template: GovernedTemplateRow) => {
    deleteMutation.mutate({ templateId: template.id });
    setConfirmAction(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Loading templates…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Audit Plan Templates</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Built-in templates are read-only. Clone to create editable custom variants.
          </p>
        </div>
        {can('create') && (
          <Button variant="outline" size="sm" className="text-xs" onClick={() => systemTemplates[0] && openClone(systemTemplates[0])}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New from Template
          </Button>
        )}
      </div>

      {/* Built-in */}
      {systemTemplates.length > 0 && (
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
                onSetDefault={() => handleSetDefault(tpl)}
                onPublish={() => setConfirmAction({ template: tpl, action: 'publish' })}
                onArchive={() => setConfirmAction({ template: tpl, action: 'archive' })}
                onRestore={() => setConfirmAction({ template: tpl, action: 'restore' })}
                onDelete={() => setConfirmAction({ template: tpl, action: 'delete' })}
                canOnTemplate={canOnTemplate}
                getBlockReason={getBlockReason}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom Templates</p>
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
                onSetDefault={() => handleSetDefault(tpl)}
                onPublish={() => setConfirmAction({ template: tpl, action: 'publish' })}
                onArchive={() => setConfirmAction({ template: tpl, action: 'archive' })}
                onRestore={() => setConfirmAction({ template: tpl, action: 'restore' })}
                onDelete={() => setConfirmAction({ template: tpl, action: 'delete' })}
                canOnTemplate={canOnTemplate}
                getBlockReason={getBlockReason}
              />
            ))}
          </div>
        )}
      </div>

      {/* Clone dialog */}
      <Dialog open={showCloneDialog} onOpenChange={(open) => { if (!open) { setShowCloneDialog(false); setCloneSource(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clone Template</DialogTitle>
            <DialogDescription>
              Create an editable copy of "{cloneSource?.template_name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>New Template Name *</Label>
              <Input value={cloneName} onChange={(e) => setCloneName(e.target.value)} placeholder="e.g. SSB Custom Plan" maxLength={100} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={cloneDescription} onChange={(e) => setCloneDescription(e.target.value)} placeholder="Brief description" maxLength={300} rows={2} />
            </div>
            {cloneSource && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                Cloning from: <strong>{cloneSource.template_name}</strong>
                {cloneSource.is_system && <span className="ml-1">(System)</span>}
                {' · '}The new template will start as <Badge variant="secondary" className="text-[9px] h-4 ml-1">Draft</Badge>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCloneDialog(false); setCloneSource(null); }}>Cancel</Button>
            <Button onClick={handleClone} disabled={cloneMutation.isPending}>
              {cloneMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Copy className="h-4 w-4 mr-1" />}
              Clone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm action dialog */}
      {confirmAction && (
        <Dialog open={true} onOpenChange={() => setConfirmAction(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {confirmAction.action === 'publish' && 'Publish Template'}
                {confirmAction.action === 'archive' && 'Archive Template'}
                {confirmAction.action === 'restore' && 'Restore Template'}
                {confirmAction.action === 'delete' && 'Delete Template'}
              </DialogTitle>
              <DialogDescription>
                {confirmAction.action === 'publish' && `Publish "${confirmAction.template.template_name}"? It will become available for use in audit plan generation.`}
                {confirmAction.action === 'archive' && `Archive "${confirmAction.template.template_name}"? It will no longer be available for new plans.`}
                {confirmAction.action === 'restore' && `Restore "${confirmAction.template.template_name}" to draft status?`}
                {confirmAction.action === 'delete' && `Permanently delete "${confirmAction.template.template_name}"? This cannot be undone.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
              {confirmAction.action === 'delete' ? (
                <Button variant="destructive" onClick={() => handleDelete(confirmAction.template)} disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    const statusMap = { publish: 'published', archive: 'archived', restore: 'draft' } as const;
                    handleStatusChange(confirmAction.template, statusMap[confirmAction.action]);
                  }}
                  disabled={statusMutation.isPending}
                >
                  {statusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Template Card ───

function TemplateCard({
  template,
  isSelected,
  onSelect,
  onClone,
  onSetDefault,
  onPublish,
  onArchive,
  onRestore,
  onDelete,
  canOnTemplate,
  getBlockReason,
}: {
  template: GovernedTemplateRow;
  isSelected: boolean;
  onSelect: () => void;
  onClone: () => void;
  onSetDefault: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  canOnTemplate: (t: GovernedTemplateRow, action: any) => boolean;
  getBlockReason: (t: GovernedTemplateRow, action: any) => string | null;
}) {
  const palette = template.config_json?.branding?.colorPalette;
  const sections = template.config_json?.sections ?? [];
  const enabledSections = sections.filter((s: any) => s.enabled).length;
  const totalSections = sections.length;
  const typography = template.config_json?.typography;
  const coverStyle = template.config_json?.coverPage?.coverStyle;

  const statusVariant = getStatusBadgeVariant(template.status);

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
              {template.is_house_default && (
                <Badge variant="default" className="text-[10px] h-5 gap-1">
                  <Star className="h-2.5 w-2.5" /> House Default
                </Badge>
              )}
              <Badge variant={statusVariant} className="text-[10px] h-5">
                {getStatusLabel(template.status)}
              </Badge>
              <Badge variant="outline" className="text-[10px] h-5 gap-1">
                <Hash className="h-2.5 w-2.5" /> {formatVersionLabel(template.version)}
              </Badge>
              {isSelected && !template.is_house_default && (
                <Badge className="text-[10px] h-5 gap-1 bg-emerald-600">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Selected
                </Badge>
              )}
            </div>
            {template.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {totalSections > 0 && (
                <span className="text-[10px] text-muted-foreground">{enabledSections}/{totalSections} sections</span>
              )}
              {typography && (
                <span className="text-[10px] text-muted-foreground">{typography.fontFamily} {typography.baseFontSize}pt</span>
              )}
              {coverStyle && (
                <span className="text-[10px] text-muted-foreground">{coverStyle} cover</span>
              )}
              {template.cloned_from_name && (
                <span className="text-[10px] text-muted-foreground italic">from: {template.cloned_from_name}</span>
              )}
              {palette && (
                <div className="flex gap-0.5">
                  {[palette.primary, palette.secondary, palette.accent].map((color, i) => (
                    <div key={i} className="w-3 h-3 rounded-sm border border-border" style={{ backgroundColor: color }} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            {/* Clone */}
            {canOnTemplate(template, 'clone') && (
              <ActionButton icon={<Copy className="h-3.5 w-3.5" />} title="Clone" onClick={onClone} />
            )}

            {/* Set Default */}
            {canOnTemplate(template, 'set_default') && (
              <ActionButton icon={<Star className="h-3.5 w-3.5" />} title="Set as House Default" onClick={onSetDefault} />
            )}

            {/* Publish */}
            {template.status === 'draft' && canOnTemplate(template, 'publish') && (
              <ActionButton icon={<Upload className="h-3.5 w-3.5" />} title="Publish" onClick={onPublish} />
            )}

            {/* Archive */}
            {template.status === 'published' && canOnTemplate(template, 'archive') && (
              <ActionButton icon={<Archive className="h-3.5 w-3.5" />} title="Archive" onClick={onArchive} />
            )}

            {/* Restore */}
            {template.status === 'archived' && canOnTemplate(template, 'restore') && (
              <ActionButton icon={<RotateCcw className="h-3.5 w-3.5" />} title="Restore" onClick={onRestore} />
            )}

            {/* Edit / Configure */}
            {isEditable(template) && canOnTemplate(template, 'edit') ? (
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={onSelect}>
                <Pencil className="h-3 w-3 mr-1" /> Edit
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={onSelect}>
                View
              </Button>
            )}

            {/* Delete */}
            {canOnTemplate(template, 'delete') && (
              <ActionButton
                icon={<Trash2 className="h-3.5 w-3.5" />}
                title="Delete"
                onClick={onDelete}
                className="text-destructive hover:text-destructive"
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionButton({
  icon,
  title,
  onClick,
  className = '',
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className={`h-7 w-7 ${className}`} onClick={onClick}>
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>{title}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
