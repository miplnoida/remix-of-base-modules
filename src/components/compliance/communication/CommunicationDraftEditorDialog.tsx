import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { auditCommunicationInstanceService, type ManualRecipientInput } from '@/services/auditCommunicationInstanceService';
import { auditCommunicationService } from '@/services/auditCommunicationService';
import type { AuditCommunication, CeCommChannel, CeCommStopCondition } from '@/types/auditCommunication';
import { renderMergeFields } from '@/lib/audit/communicationMergePreview';
import { STOP_CONDITION_LABELS } from '@/services/auditCommunicationSchedulePolicyService';

interface Props {
  communicationId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  userCode?: string;
}

const STOP_CONDITIONS: CeCommStopCondition[] = ['acknowledged', 'employer_responded', 'case_closed', 'report_finalized'];

export default function CommunicationDraftEditorDialog({ communicationId, open, onClose, onSaved, userCode }: Props) {
  const [comm, setComm] = useState<AuditCommunication | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [channel, setChannel] = useState<CeCommChannel>('email');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [recipients, setRecipients] = useState<ManualRecipientInput[]>([]);
  const [recurEnabled, setRecurEnabled] = useState(false);
  const [recurInterval, setRecurInterval] = useState<number>(7);
  const [recurMax, setRecurMax] = useState<number>(3);
  const [recurStop, setRecurStop] = useState<CeCommStopCondition[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        const c = await auditCommunicationService.getById(communicationId);
        if (!c) throw new Error('Not found');
        setComm(c as AuditCommunication);
        setSubject(c.subject_snapshot || '');
        setEmailBody(c.email_body_snapshot || '');
        setSmsBody(c.sms_body_snapshot || '');
        setChannel(c.channel);
        setScheduledAt(c.scheduled_at ? c.scheduled_at.slice(0, 16) : '');
        setRecipients((c.recipients || []).map(r => ({
          name: r.recipient_name, email: r.recipient_email, mobile: r.recipient_mobile,
          role: r.recipient_role, is_primary: r.is_primary,
        })));
        setRecurEnabled(!!c.recurrence_enabled);
        setRecurInterval(c.recurrence_interval_days ?? 7);
        setRecurMax(c.recurrence_max_occurrences ?? 3);
        setRecurStop(c.recurrence_stop_conditions_json || []);
      } catch (e: any) { toast.error(e.message); }
      finally { setLoading(false); }
    })();
  }, [open, communicationId]);

  const editable = comm && ['draft', 'rejected'].includes(comm.status);

  const save = async () => {
    if (!comm) return;
    setSaving(true);
    try {
      if (editable) {
        await auditCommunicationInstanceService.updateDraft(comm.id, {
          subject_snapshot: subject,
          email_body_snapshot: emailBody,
          sms_body_snapshot: smsBody,
          channel,
        }, userCode);
        await auditCommunicationInstanceService.replaceRecipients(comm.id, recipients, userCode);
      }
      // schedule + recurrence are allowed on draft/approved
      if (scheduledAt) {
        await auditCommunicationInstanceService.schedule(comm.id, new Date(scheduledAt).toISOString(), userCode);
      }
      await auditCommunicationInstanceService.configureRecurrence(comm.id, {
        enabled: recurEnabled,
        interval_days: recurInterval,
        max_occurrences: recurMax,
        stop_conditions: recurStop,
      }, userCode);
      toast.success('Draft saved');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const addRecipient = () => setRecipients([...recipients, { name: '', email: '', mobile: '', is_primary: recipients.length === 0 }]);
  const removeRecipient = (i: number) => setRecipients(recipients.filter((_, idx) => idx !== i));
  const updateRecipient = (i: number, p: Partial<ManualRecipientInput>) =>
    setRecipients(recipients.map((r, idx) => idx === i ? { ...r, ...p } : r));

  const ctx = (comm?.context_data_json as Record<string, unknown>) || {};
  const previewSubject = renderMergeFields(subject, ctx);
  const previewBody = renderMergeFields(emailBody, ctx);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Communication Draft</DialogTitle>
          <DialogDescription>
            {comm && (
              <span className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{comm.status}</Badge>
                <span className="text-xs text-muted-foreground">{comm.comm_type}</span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading || !comm ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="content">
            <TabsList>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="recipients">Recipients</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-3">
              {!editable && (
                <p className="text-xs text-muted-foreground">This draft is {comm.status} and cannot be edited.</p>
              )}
              <div>
                <Label>Channel</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as CeCommChannel)} disabled={!editable}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Email subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!editable} />
              </div>
              <div>
                <Label>Email body</Label>
                <Textarea rows={8} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} disabled={!editable} />
              </div>
              <div>
                <Label>SMS body</Label>
                <Textarea rows={3} value={smsBody} onChange={(e) => setSmsBody(e.target.value)} disabled={!editable} />
              </div>
            </TabsContent>

            <TabsContent value="recipients" className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">All recipients are saved as manual entries when you save this draft.</p>
                <Button size="sm" variant="outline" onClick={addRecipient} disabled={!editable}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {recipients.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center border rounded p-2">
                    <Input className="col-span-3" placeholder="Name" value={r.name || ''} onChange={(e) => updateRecipient(i, { name: e.target.value })} disabled={!editable} />
                    <Input className="col-span-4" placeholder="Email" value={r.email || ''} onChange={(e) => updateRecipient(i, { email: e.target.value })} disabled={!editable} />
                    <Input className="col-span-3" placeholder="Mobile" value={r.mobile || ''} onChange={(e) => updateRecipient(i, { mobile: e.target.value })} disabled={!editable} />
                    <div className="col-span-1 flex items-center justify-center">
                      <Switch checked={!!r.is_primary} onCheckedChange={(v) => setRecipients(recipients.map((x, idx) => ({ ...x, is_primary: idx === i ? v : false })))} disabled={!editable} />
                    </div>
                    <Button size="icon" variant="ghost" className="col-span-1" onClick={() => removeRecipient(i)} disabled={!editable}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {recipients.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No recipients.</p>}
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <div>
                <Label>Send at (leave blank for immediate after approval)</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                {comm.scheduled_at && (
                  <p className="text-xs text-muted-foreground mt-1">Currently scheduled: {new Date(comm.scheduled_at).toLocaleString()}</p>
                )}
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center gap-2">
                  <Switch checked={recurEnabled} onCheckedChange={setRecurEnabled} />
                  <Label>Enable recurring reminders</Label>
                </div>
                {recurEnabled && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <Label>Interval (days)</Label>
                      <Input type="number" value={recurInterval} onChange={(e) => setRecurInterval(Number(e.target.value))} />
                    </div>
                    <div>
                      <Label>Max occurrences</Label>
                      <Input type="number" value={recurMax} onChange={(e) => setRecurMax(Number(e.target.value))} />
                    </div>
                    <div className="col-span-2">
                      <Label>Stop when…</Label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {STOP_CONDITIONS.map(c => (
                          <label key={c} className="flex items-center gap-2 border rounded p-2 cursor-pointer text-sm">
                            <Switch
                              checked={recurStop.includes(c)}
                              onCheckedChange={(v) => setRecurStop(v ? [...recurStop, c] : recurStop.filter(x => x !== c))}
                            />
                            {STOP_CONDITION_LABELS[c]}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-3">
              <div>
                <Badge variant="outline">Subject</Badge>
                <p className="mt-1 font-medium">{previewSubject || <span className="text-muted-foreground">—</span>}</p>
              </div>
              <div>
                <Badge variant="outline">Email body</Badge>
                <div className="mt-1 border rounded p-3 bg-muted/30 whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: previewBody || '<span class="text-muted-foreground">—</span>' }} />
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save draft'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
