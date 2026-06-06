import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  useBnParticipantTaskConfig,
  useUpsertParticipantTaskConfig,
  useDeleteParticipantTaskConfig,
  type BnParticipantTaskConfigRow,
  type BnParticipantTaskConfigInput,
} from '@/hooks/bn/useBnParticipantTaskConfig';
import { useUserCode } from '@/hooks/useUserCode';

interface Props {
  versionId: string | undefined;
  isReadOnly?: boolean;
  versionStatus?: string;
}

const KIND_OPTIONS: Array<{ value: BnParticipantTaskConfigRow['participant_kind']; label: string }> = [
  { value: 'CLAIMANT', label: 'Claimant' },
  { value: 'EMPLOYER', label: 'Employer' },
  { value: 'DOCTOR', label: 'Doctor / Medical Provider' },
  { value: 'OTHER', label: 'Other' },
];

const KIND_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  CLAIMANT: 'default',
  EMPLOYER: 'secondary',
  DOCTOR: 'outline',
  OTHER: 'outline',
};

const EMPTY: BnParticipantTaskConfigInput = {
  product_version_id: '',
  participant_kind: 'EMPLOYER',
  task_code: '',
  task_title: '',
  task_description: '',
  screen_template_code: '',
  due_offset_days: 7,
  blocks_workflow: true,
  is_required: true,
  sort_order: 0,
  is_active: true,
};

/**
 * ParticipantWorkflowTab — Product Catalog tab that defines which external
 * participant tasks (claimant / employer / doctor) Internal BN auto-creates
 * for each new claim of this product version. Reads/writes
 * `bn_product_participant_task_config`. Runtime task creation lives in the
 * claim lifecycle service; this is configuration only.
 */
export default function ParticipantWorkflowTab({ versionId, isReadOnly, versionStatus }: Props) {
  const { userCode } = useUserCode();
  const { data: rows = [], isLoading } = useBnParticipantTaskConfig(versionId);
  const upsert = useUpsertParticipantTaskConfig(versionId);
  const remove = useDeleteParticipantTaskConfig(versionId);

  const [editing, setEditing] = useState<BnParticipantTaskConfigInput | null>(null);
  const readOnly = !!isReadOnly;

  const openNew = () => setEditing({ ...EMPTY, product_version_id: versionId ?? '', sort_order: rows.length });
  const openEdit = (r: BnParticipantTaskConfigRow) => setEditing({ ...r });

  const save = async () => {
    if (!editing) return;
    if (!editing.task_code.trim() || !editing.task_title.trim()) {
      toast.error('Task code and title are required');
      return;
    }
    try {
      await upsert.mutateAsync({ ...editing, configured_by: userCode } as any);
      toast.success('Participant task configuration saved');
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message ?? 'Save failed');
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Remove this participant task from the product version?')) return;
    try {
      await remove.mutateAsync(id);
      toast.success('Removed');
    } catch (e: any) {
      toast.error(e?.message ?? 'Delete failed');
    }
  };

  if (!versionId) {
    return <Alert><AlertTitle>Select a version</AlertTitle><AlertDescription>Pick a product version to configure participant tasks.</AlertDescription></Alert>;
  }
  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Participant Workflow
              </CardTitle>
              <CardDescription>
                Tasks Internal BN will create automatically on every new claim of this product version.
                Each task is delivered to the named external portal (Claimant / Employer / Doctor) or via a one-time
                secure link, and uses the assigned Screen &amp; Field template for its form.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{rows.length} task(s)</Badge>
              {versionStatus && <Badge variant="secondary">{versionStatus}</Badge>}
              <Button size="sm" disabled={readOnly} onClick={openNew} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add task
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No participant tasks configured. Add one to require employer/doctor/claimant input before the workflow can advance.
            </p>
          )}
          {rows.map(r => (
            <div key={r.id} className="rounded-md border bg-card/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={KIND_VARIANT[r.participant_kind] ?? 'outline'}>{r.participant_kind}</Badge>
                    <span className="font-medium text-sm">{r.task_title}</span>
                    <span className="text-[11px] text-muted-foreground">({r.task_code})</span>
                    {r.blocks_workflow && <Badge variant="destructive" className="text-[10px]">Blocks workflow</Badge>}
                    {!r.is_required && <Badge variant="outline" className="text-[10px]">Optional</Badge>}
                    {!r.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                  </div>
                  {r.task_description && (
                    <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{r.task_description}</div>
                  )}
                  <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                    <span>Due: T+{r.due_offset_days}d</span>
                    {r.screen_template_code && <span>Template: {r.screen_template_code}</span>}
                    <span>Order: {r.sort_order}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" variant="ghost" disabled={readOnly} onClick={() => openEdit(r)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" disabled={readOnly} onClick={() => onDelete(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit participant task' : 'Add participant task'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Participant kind *</Label>
                <Select value={editing.participant_kind} onValueChange={(v: any) => setEditing({ ...editing, participant_kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KIND_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Task code *</Label>
                <Input
                  value={editing.task_code}
                  onChange={e => setEditing({ ...editing, task_code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  placeholder="EMP_CONFIRM_EMPLOYMENT"
                  maxLength={50}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Task title *</Label>
                <Input value={editing.task_title} onChange={e => setEditing({ ...editing, task_title: e.target.value })} placeholder="Confirm employment & last paid day" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Description</Label>
                <Textarea value={editing.task_description ?? ''} onChange={e => setEditing({ ...editing, task_description: e.target.value })} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Screen &amp; Field template code</Label>
                <Input value={editing.screen_template_code ?? ''} onChange={e => setEditing({ ...editing, screen_template_code: e.target.value.toUpperCase() })} placeholder="EMP_CONFIRMATION_FORM" />
              </div>
              <div className="space-y-1.5">
                <Label>Due offset (days)</Label>
                <Input type="number" min={1} value={editing.due_offset_days} onChange={e => setEditing({ ...editing, due_offset_days: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>Sort order</Label>
                <Input type="number" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-2">
                <Label className="text-xs">Blocks workflow</Label>
                <Switch checked={editing.blocks_workflow} onCheckedChange={(v) => setEditing({ ...editing, blocks_workflow: v })} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-2">
                <Label className="text-xs">Required</Label>
                <Switch checked={editing.is_required} onCheckedChange={(v) => setEditing({ ...editing, is_required: v })} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-2">
                <Label className="text-xs">Active</Label>
                <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={upsert.isPending}>{upsert.isPending ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
