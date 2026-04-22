/**
 * FieldStageTemplateMappingPage
 *
 * Central admin screen to bind existing communication templates to the 10
 * canonical field-execution stages. The Audit Visit Workspace consumes
 * these mappings at runtime — no template is ever hardcoded in the UI.
 *
 * Behavior:
 *   - Lists all 10 stages with the templates currently linked to each
 *   - Add: pick from the existing template catalog (Settings > Templates)
 *   - Inline: reorder, mark default, toggle active, edit notes, remove
 *   - Empty stage states explain the lifecycle-stage fallback
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Trash2, ArrowUp, ArrowDown, Star, StarOff, Loader2,
  Settings2, ExternalLink, Mail, MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUserCode } from '@/hooks/useUserCode';
import {
  fieldStageTemplateMapService,
  type FieldStageTemplateRow,
} from '@/services/fieldStageTemplateMapService';
import {
  FIELD_STAGE_ORDER, FIELD_STAGE_LABELS, FIELD_STAGE_HINTS,
  FIELD_STAGE_TO_LIFECYCLE,
  type FieldExecutionStage,
} from '@/types/fieldStageMapping';
import { COMM_LIFECYCLE_STAGE_LABELS, COMM_TYPE_LABELS } from '@/types/auditCommunication';
import { AdminAreaBanner } from '@/components/compliance/admin/AdminAreaBanner';

interface PickerTemplate {
  id: string;
  template_code: string;
  template_name: string;
  comm_type: string;
  channel: 'email' | 'sms' | 'both';
  lifecycle_stage: string | null;
}

export default function FieldStageTemplateMappingPage() {
  const { userCode } = useUserCode();
  const [rows, setRows] = useState<FieldStageTemplateRow[]>([]);
  const [templates, setTemplates] = useState<PickerTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerStage, setPickerStage] = useState<FieldExecutionStage | null>(null);
  const [pickedTemplateId, setPickedTemplateId] = useState('');
  const [pickerNotes, setPickerNotes] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [m, t] = await Promise.all([
        fieldStageTemplateMapService.listAll(),
        fieldStageTemplateMapService.listAvailableTemplates(),
      ]);
      setRows(m);
      setTemplates(t as PickerTemplate[]);
    } catch (e: any) {
      toast.error('Failed to load mappings', { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const map = new Map<FieldExecutionStage, FieldStageTemplateRow[]>();
    for (const s of FIELD_STAGE_ORDER) map.set(s, []);
    for (const r of rows) {
      const arr = map.get(r.field_stage as FieldExecutionStage);
      if (arr) arr.push(r);
    }
    return map;
  }, [rows]);

  const handleAdd = async () => {
    if (!pickerStage || !pickedTemplateId) return;
    try {
      const stageRows = grouped.get(pickerStage) || [];
      const nextOrder = (stageRows[stageRows.length - 1]?.sort_order ?? -1) + 1;
      await fieldStageTemplateMapService.addMapping(pickerStage, pickedTemplateId, {
        sortOrder: nextOrder,
        notes: pickerNotes || undefined,
        userCode: userCode || undefined,
      });
      toast.success('Template linked to stage');
      setPickerStage(null);
      setPickedTemplateId('');
      setPickerNotes('');
      load();
    } catch (e: any) {
      toast.error(
        e.message?.includes('unique') ? 'Template already linked to this stage' : 'Could not add mapping',
        { description: e.message },
      );
    }
  };

  const handleToggleActive = async (row: FieldStageTemplateRow, next: boolean) => {
    try {
      await fieldStageTemplateMapService.updateMapping(row.id, { is_active: next }, userCode || undefined);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleToggleDefault = async (row: FieldStageTemplateRow) => {
    try {
      await fieldStageTemplateMapService.updateMapping(row.id, { is_default: !row.is_default }, userCode || undefined);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleMove = async (row: FieldStageTemplateRow, dir: -1 | 1) => {
    const stageRows = grouped.get(row.field_stage as FieldExecutionStage) || [];
    const idx = stageRows.findIndex((r) => r.id === row.id);
    const swap = stageRows[idx + dir];
    if (!swap) return;
    try {
      await Promise.all([
        fieldStageTemplateMapService.updateMapping(row.id, { sort_order: swap.sort_order }, userCode || undefined),
        fieldStageTemplateMapService.updateMapping(swap.id, { sort_order: row.sort_order }, userCode || undefined),
      ]);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRemove = async (row: FieldStageTemplateRow) => {
    if (!confirm(`Unlink "${row.template?.template_name}" from this stage?`)) return;
    try {
      await fieldStageTemplateMapService.removeMapping(row.id);
      toast.success('Mapping removed');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      <AdminAreaBanner area="communication" />

      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Field Stage → Template Mapping</h1>
          <p className="text-sm text-muted-foreground">
            Bind communication templates configured in Settings to the 10 field-execution
            stages. The visit workspace reads these mappings at runtime — no template is hardcoded.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/compliance/admin/communication-templates">
              <Settings2 className="h-3.5 w-3.5 mr-1" /> Manage templates
              <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {FIELD_STAGE_ORDER.map((stage) => {
          const stageRows = grouped.get(stage) || [];
          return (
            <Card key={stage}>
              <CardHeader className="py-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                      {FIELD_STAGE_LABELS[stage]}
                      <Badge variant="outline" className="text-[10px]">
                        Lifecycle: {COMM_LIFECYCLE_STAGE_LABELS[FIELD_STAGE_TO_LIFECYCLE[stage]]}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {stageRows.filter((r) => r.is_active).length} active
                      </Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{FIELD_STAGE_HINTS[stage]}</p>
                  </div>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => { setPickerStage(stage); setPickedTemplateId(''); setPickerNotes(''); }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Link template
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {stageRows.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No templates linked. The visit workspace will fall back to templates whose
                    lifecycle stage is{' '}
                    <span className="font-medium">
                      {COMM_LIFECYCLE_STAGE_LABELS[FIELD_STAGE_TO_LIFECYCLE[stage]]}
                    </span>{' '}
                    until you add one explicitly.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {stageRows.map((row, idx) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between gap-2 rounded border bg-card p-2 flex-wrap"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {row.template?.template_name ?? '(template missing)'}
                            </span>
                            {row.template?.template_code && (
                              <Badge variant="outline" className="text-[10px]">
                                {row.template.template_code}
                              </Badge>
                            )}
                            {row.template?.channel === 'email' && <Mail className="h-3 w-3 text-muted-foreground" />}
                            {row.template?.channel === 'sms' && <MessageSquare className="h-3 w-3 text-muted-foreground" />}
                            {row.template?.channel === 'both' && (
                              <>
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                              </>
                            )}
                            {row.is_default && (
                              <Badge variant="default" className="text-[10px]">Default</Badge>
                            )}
                            {!row.template?.is_active && (
                              <Badge variant="destructive" className="text-[10px]">Template inactive</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {row.template?.comm_type
                              ? COMM_TYPE_LABELS[row.template.comm_type as keyof typeof COMM_TYPE_LABELS]
                              : '—'}
                            {row.notes ? ` — ${row.notes}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm" variant="ghost"
                            disabled={idx === 0}
                            onClick={() => handleMove(row, -1)}
                            title="Move up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            disabled={idx === stageRows.length - 1}
                            onClick={() => handleMove(row, 1)}
                            title="Move down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => handleToggleDefault(row)}
                            title={row.is_default ? 'Unset default' : 'Mark as default'}
                          >
                            {row.is_default
                              ? <Star className="h-3.5 w-3.5 fill-current" />
                              : <StarOff className="h-3.5 w-3.5" />}
                          </Button>
                          <div className="flex items-center gap-1 px-1">
                            <span className="text-[10px] text-muted-foreground">
                              {row.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <Switch
                              checked={row.is_active}
                              onCheckedChange={(v) => handleToggleActive(row, v)}
                            />
                          </div>
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => handleRemove(row)}
                            title="Remove mapping"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add-mapping dialog */}
      <Dialog open={!!pickerStage} onOpenChange={(o) => !o && setPickerStage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Link template to: {pickerStage ? FIELD_STAGE_LABELS[pickerStage] : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Template</label>
              <Select value={pickedTemplateId} onValueChange={setPickedTemplateId}>
                <SelectTrigger><SelectValue placeholder="Pick from configured templates…" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.template_name}{' '}
                      <span className="text-xs text-muted-foreground">
                        ({t.template_code} · {t.channel})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Only active templates are listed. Manage them under Settings → Audit Communication Templates.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium">Notes (optional)</label>
              <Input
                value={pickerNotes}
                onChange={(e) => setPickerNotes(e.target.value)}
                placeholder="Why is this template linked to this stage?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickerStage(null)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!pickedTemplateId}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Link template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
