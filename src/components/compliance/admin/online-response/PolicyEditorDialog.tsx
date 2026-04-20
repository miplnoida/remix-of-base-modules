import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUpsertOnlineResponsePolicy } from '@/hooks/useOnlineResponse';
import {
  ONLINE_RESPONSE_MODE_LABELS,
  ONLINE_RESPONSE_MODE_DESCRIPTIONS,
  PERMISSION_FLAGS,
  type OnlineResponseMode,
  type OnlineResponsePolicy,
} from '@/types/onlineResponse';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  policy?: OnlineResponsePolicy | null;
}

const EMPTY: Partial<OnlineResponsePolicy> = {
  policy_name: '',
  description: '',
  priority: 100,
  is_active: true,
  case_type: null,
  communication_type: null,
  report_type: null,
  enforcement_stage: null,
  response_mode: 'ACKNOWLEDGMENT_ONLY',
  portal_enabled: true,
  allow_acknowledgment: true,
  allow_document_upload: false,
  allow_clarification: false,
  allow_narrative_response: false,
  allow_dispute: false,
  allow_corrective_action_response: false,
  allow_payment_response: false,
  default_response_due_days: 14,
  default_portal_ttl_hours: 168,
  requires_inspector_review: true,
  requires_lead_review: false,
  requires_legal_review: false,
  reopens_case: false,
  triggers_notifications: true,
};

export function PolicyEditorDialog({ open, onOpenChange, policy }: Props) {
  const upsert = useUpsertOnlineResponsePolicy();
  const [form, setForm] = useState<Partial<OnlineResponsePolicy>>(policy ?? EMPTY);

  // Re-init when policy changes or dialog opens
  useEffect(() => {
    if (open) setForm(policy ?? EMPTY);
  }, [open, policy]);

  const set = (k: keyof OnlineResponsePolicy, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.policy_name?.trim()) {
      toast.error('Policy name is required');
      return;
    }
    try {
      await upsert.mutateAsync({ id: policy?.id, patch: form });
      toast.success(policy ? 'Policy updated' : 'Policy created');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save policy');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{policy ? 'Edit Policy' : 'New Online Response Policy'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Identity */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">Policy Name *</Label>
              <Input
                value={form.policy_name || ''}
                onChange={(e) => set('policy_name', e.target.value)}
                placeholder="e.g. Findings Memo — Allow Clarification"
              />
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Input
                type="number"
                value={form.priority ?? 100}
                onChange={(e) => set('priority', Number(e.target.value))}
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Higher wins on conflict.
              </p>
            </div>
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              rows={2}
              value={form.description || ''}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          {/* Match keys */}
          <div className="border rounded-md p-3 space-y-3 bg-muted/30">
            <div className="text-sm font-medium">Match Keys</div>
            <p className="text-xs text-muted-foreground -mt-2">
              Leave blank to match all values for that dimension.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Case Type</Label>
                <Input
                  value={form.case_type || ''}
                  onChange={(e) => set('case_type', e.target.value || null)}
                  placeholder="e.g. audit, inspection, investigation"
                />
              </div>
              <div>
                <Label className="text-xs">Communication Type</Label>
                <Input
                  value={form.communication_type || ''}
                  onChange={(e) => set('communication_type', e.target.value || null)}
                  placeholder="e.g. final_report, violation_notice"
                />
              </div>
              <div>
                <Label className="text-xs">Report Type</Label>
                <Input
                  value={form.report_type || ''}
                  onChange={(e) => set('report_type', e.target.value || null)}
                />
              </div>
              <div>
                <Label className="text-xs">Enforcement Stage</Label>
                <Input
                  value={form.enforcement_stage || ''}
                  onChange={(e) => set('enforcement_stage', e.target.value || null)}
                  placeholder="e.g. pre_audit, findings, legal"
                />
              </div>
            </div>
          </div>

          {/* Mode + permissions */}
          <div className="border rounded-md p-3 space-y-3">
            <div className="text-sm font-medium">Response Mode &amp; Permissions</div>
            <div>
              <Label className="text-xs">Response Mode</Label>
              <Select
                value={form.response_mode || 'ACKNOWLEDGMENT_ONLY'}
                onValueChange={(v) => set('response_mode', v as OnlineResponseMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ONLINE_RESPONSE_MODE_LABELS) as OnlineResponseMode[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {ONLINE_RESPONSE_MODE_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                {ONLINE_RESPONSE_MODE_DESCRIPTIONS[form.response_mode as OnlineResponseMode] || ''}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 pt-2">
              {PERMISSION_FLAGS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="text-xs">{label}</Label>
                  <Switch
                    checked={!!(form as any)[key]}
                    onCheckedChange={(v) => set(key, v)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Lifecycle */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Default Response Due (days)</Label>
              <Input
                type="number"
                value={form.default_response_due_days ?? ''}
                onChange={(e) =>
                  set(
                    'default_response_due_days',
                    e.target.value === '' ? null : Number(e.target.value),
                  )
                }
              />
            </div>
            <div>
              <Label className="text-xs">Portal Link TTL (hours)</Label>
              <Input
                type="number"
                value={form.default_portal_ttl_hours ?? ''}
                onChange={(e) =>
                  set(
                    'default_portal_ttl_hours',
                    e.target.value === '' ? null : Number(e.target.value),
                  )
                }
              />
            </div>
          </div>

          {/* Review workflow */}
          <div className="border rounded-md p-3 space-y-2">
            <div className="text-sm font-medium">Review Workflow</div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
              {[
                ['requires_inspector_review', 'Requires Inspector Review'],
                ['requires_lead_review', 'Requires Lead Review'],
                ['requires_legal_review', 'Requires Legal Review'],
                ['reopens_case', 'Re-opens Case on Submission'],
                ['triggers_notifications', 'Trigger Internal Notifications'],
              ].map(([k, label]) => (
                <div key={k} className="flex items-center justify-between">
                  <Label className="text-xs">{label}</Label>
                  <Switch
                    checked={!!(form as any)[k]}
                    onCheckedChange={(v) => set(k as keyof OnlineResponsePolicy, v)}
                  />
                </div>
              ))}
            </div>
            <div>
              <Label className="text-xs">Workflow ID (optional)</Label>
              <Input
                value={form.workflow_id || ''}
                onChange={(e) => set('workflow_id', e.target.value || null)}
                placeholder="UUID of workflow definition for routing"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <Label className="text-sm">Policy Active</Label>
            <Switch
              checked={!!form.is_active}
              onCheckedChange={(v) => set('is_active', v)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={upsert.isPending}>
            {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {policy ? 'Update Policy' : 'Create Policy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
