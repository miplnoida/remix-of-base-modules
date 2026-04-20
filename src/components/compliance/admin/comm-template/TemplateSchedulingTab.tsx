import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  auditCommunicationSchedulePolicyService,
  TRIGGER_MODE_LABELS,
  STOP_CONDITION_LABELS,
  RELATIVE_ANCHOR_FIELDS,
  TRIGGER_EVENTS,
  SEND_MODE_LABELS,
} from '@/services/auditCommunicationSchedulePolicyService';
import type {
  AuditCommunicationSchedulePolicy,
  AuditCommunicationTemplate,
  CeCommScheduleTriggerMode,
  CeCommSendMode,
  CeCommStopCondition,
} from '@/types/auditCommunication';

interface Props {
  templateId: string | null;
  draft: Partial<AuditCommunicationTemplate>;
  onChange: (patch: Partial<AuditCommunicationTemplate>) => void;
}

const SEND_MODES: CeCommSendMode[] = ['MANUAL_ONLY', 'MANUAL_OR_SCHEDULED', 'AUTO_EVENT_DRIVEN', 'AUTO_TIME_DRIVEN'];
const STOP_CONDITIONS: CeCommStopCondition[] = ['acknowledged', 'employer_responded', 'case_closed', 'report_finalized'];

export default function TemplateSchedulingTab({ templateId, draft, onChange }: Props) {
  const [policy, setPolicy] = useState<AuditCommunicationSchedulePolicy | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!templateId) return;
    setLoading(true);
    try { setPolicy(await auditCommunicationSchedulePolicyService.getForTemplate(templateId)); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [templateId]);

  const sendMode = draft.send_mode || 'MANUAL_ONLY';
  const automation = sendMode === 'AUTO_EVENT_DRIVEN' || sendMode === 'AUTO_TIME_DRIVEN' || sendMode === 'MANUAL_OR_SCHEDULED';

  const localPolicy: Partial<AuditCommunicationSchedulePolicy> = policy || {
    trigger_mode: 'NONE',
    trigger_event: null,
    relative_to_field: null,
    offset_days: null,
    offset_hours: null,
    exact_datetime: null,
    recurrence_enabled: false,
    recurrence_interval_days: null,
    recurrence_max_occurrences: null,
    recurrence_stop_conditions_json: [],
  };

  const patchPolicy = (p: Partial<AuditCommunicationSchedulePolicy>) =>
    setPolicy({ ...(localPolicy as AuditCommunicationSchedulePolicy), ...p });

  const savePolicy = async () => {
    if (!templateId) return;
    setSaving(true);
    try {
      await auditCommunicationSchedulePolicyService.upsert(templateId, localPolicy);
      toast.success('Schedule policy saved');
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Send mode</Label>
            <Select value={sendMode} onValueChange={(v) => onChange({ send_mode: v as CeCommSendMode })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEND_MODES.map(m => <SelectItem key={m} value={m}>{SEND_MODE_LABELS[m]}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Controls whether officers can send manually, schedule, or whether the system auto-creates instances.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={!!draft.reschedule_allowed} onCheckedChange={(v) => onChange({ reschedule_allowed: v })} />
            <Label>Allow rescheduling after creation</Label>
          </div>

          <div>
            <Label>Cancel scheduled item if…</Label>
            <div className="grid gap-2 sm:grid-cols-2 mt-2">
              {STOP_CONDITIONS.map(c => {
                const arr = draft.cancel_on_status_change_json || [];
                const checked = arr.includes(c);
                return (
                  <label key={c} className="flex items-center gap-2 border rounded p-2 cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => onChange({
                        cancel_on_status_change_json: v ? [...arr, c] : arr.filter(x => x !== c),
                      })}
                    />
                    <span>{STOP_CONDITION_LABELS[c]}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {!templateId ? (
        <p className="text-sm text-muted-foreground">Save the template first to configure scheduling policy.</p>
      ) : !automation ? (
        <p className="text-sm text-muted-foreground">No schedule policy needed for "Manual only" templates.</p>
      ) : loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold">Trigger</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Trigger mode</Label>
                <Select value={localPolicy.trigger_mode} onValueChange={(v) => patchPolicy({ trigger_mode: v as CeCommScheduleTriggerMode })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['NONE', 'EVENT', 'TIME_RELATIVE', 'EXACT_DATETIME'] as CeCommScheduleTriggerMode[]).map(m =>
                      <SelectItem key={m} value={m}>{TRIGGER_MODE_LABELS[m]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {localPolicy.trigger_mode === 'EVENT' && (
                <div>
                  <Label>Event</Label>
                  <Select value={localPolicy.trigger_event || ''} onValueChange={(v) => patchPolicy({ trigger_event: v })}>
                    <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
                    <SelectContent>
                      {TRIGGER_EVENTS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {localPolicy.trigger_mode === 'TIME_RELATIVE' && (
                <>
                  <div>
                    <Label>Relative to</Label>
                    <Select value={localPolicy.relative_to_field || ''} onValueChange={(v) => patchPolicy({ relative_to_field: v })}>
                      <SelectTrigger><SelectValue placeholder="Select anchor" /></SelectTrigger>
                      <SelectContent>
                        {RELATIVE_ANCHOR_FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Offset days (negative = before)</Label>
                    <Input type="number" value={localPolicy.offset_days ?? ''} onChange={(e) => patchPolicy({ offset_days: e.target.value === '' ? null : Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Offset hours</Label>
                    <Input type="number" value={localPolicy.offset_hours ?? ''} onChange={(e) => patchPolicy({ offset_hours: e.target.value === '' ? null : Number(e.target.value) })} />
                  </div>
                </>
              )}

              {localPolicy.trigger_mode === 'EXACT_DATETIME' && (
                <div>
                  <Label>Exact date/time</Label>
                  <Input type="datetime-local" value={localPolicy.exact_datetime ? localPolicy.exact_datetime.slice(0, 16) : ''}
                    onChange={(e) => patchPolicy({ exact_datetime: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Recurrence</h3>
              <div className="flex items-center gap-2">
                <Switch checked={!!localPolicy.recurrence_enabled} onCheckedChange={(v) => patchPolicy({ recurrence_enabled: v })} />
                <Label>Enable recurring reminders</Label>
              </div>
              {localPolicy.recurrence_enabled && (
                <div className="grid gap-4 md:grid-cols-2 mt-3">
                  <div>
                    <Label>Interval (days)</Label>
                    <Input type="number" value={localPolicy.recurrence_interval_days ?? ''} onChange={(e) => patchPolicy({ recurrence_interval_days: e.target.value === '' ? null : Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Max occurrences</Label>
                    <Input type="number" value={localPolicy.recurrence_max_occurrences ?? ''} onChange={(e) => patchPolicy({ recurrence_max_occurrences: e.target.value === '' ? null : Number(e.target.value) })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Stop when…</Label>
                    <div className="grid gap-2 sm:grid-cols-2 mt-2">
                      {STOP_CONDITIONS.map(c => {
                        const arr = localPolicy.recurrence_stop_conditions_json || [];
                        const checked = arr.includes(c);
                        return (
                          <label key={c} className="flex items-center gap-2 border rounded p-2 cursor-pointer">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => patchPolicy({
                                recurrence_stop_conditions_json: v ? [...arr, c] : arr.filter(x => x !== c),
                              })}
                            />
                            <span>{STOP_CONDITION_LABELS[c]}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={savePolicy} disabled={saving}>{saving ? 'Saving…' : 'Save schedule policy'}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
