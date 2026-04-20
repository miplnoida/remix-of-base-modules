import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Send, Plus, Mail, MessageSquare, CheckCircle2, XCircle, Clock, Pencil, History, CalendarClock, Ban, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { auditCommunicationService } from '@/services/auditCommunicationService';
import { auditCommunicationTemplateService } from '@/services/auditCommunicationTemplateService';
import { auditCommunicationApprovalService } from '@/services/auditCommunicationApprovalService';
import { auditCommunicationInstanceService } from '@/services/auditCommunicationInstanceService';
import type { AuditCommunication, AuditCommunicationTemplate, CeCommStatus } from '@/types/auditCommunication';
import { COMM_TYPE_LABELS } from '@/types/auditCommunication';
import CommunicationDraftEditorDialog from './CommunicationDraftEditorDialog';
import CommunicationHistoryDialog from './CommunicationHistoryDialog';

interface Props {
  inspectionId: string;
  employerId: string;
  employerName?: string;
  userCode?: string;
}

const statusVariant: Record<CeCommStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline', pending_approval: 'secondary', approved: 'default', rejected: 'destructive',
  sending: 'secondary', sent: 'default', partial: 'secondary', failed: 'destructive', cancelled: 'outline',
};

export function AuditCommunicationsPanel({ inspectionId, employerId, employerName, userCode }: Props) {
  const [comms, setComms] = useState<AuditCommunication[]>([]);
  const [templates, setTemplates] = useState<AuditCommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pickedTemplateId, setPickedTemplateId] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, tpls] = await Promise.all([
        auditCommunicationService.listForInspection(inspectionId),
        auditCommunicationTemplateService.list({ activeOnly: true }),
      ]);
      // Hydrate recipients/approvals/deliveries per row for display.
      const hydrated = await Promise.all(list.map(c => auditCommunicationService.getById(c.id)));
      setComms(hydrated.filter(Boolean) as AuditCommunication[]);
      setTemplates(tpls);
    } catch (e: any) {
      toast.error('Failed to load communications', { description: e.message });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [inspectionId]);

  const handleCreate = async () => {
    if (!pickedTemplateId) return;
    setCreating(true);
    try {
      const created = await auditCommunicationService.createDraft({
        inspectionId, employerId, templateId: pickedTemplateId,
        contextData: { employer_name: employerName || employerId, visit_date: new Date().toISOString().slice(0, 10) },
        createdBy: userCode,
      });
      toast.success('Draft created');
      setShowNew(false); setPickedTemplateId('');
      setEditingId(created.id);
      load();
    } catch (e: any) { toast.error('Create failed', { description: e.message }); }
    finally { setCreating(false); }
  };

  const handleSubmit = async (id: string) => {
    try { await auditCommunicationService.submitForApproval(id, userCode); toast.success('Submitted'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleSend = async (id: string) => {
    try {
      const r = await auditCommunicationService.send(id, userCode);
      toast[r.ok ? 'success' : 'warning'](`Sent ${r.sent}, failed ${r.failed}`);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleApprove = async (approvalId: string) => {
    try { await auditCommunicationApprovalService.approve(approvalId, { userCode: userCode || 'SYSTEM' }); toast.success('Approved'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleReschedule = async (c: AuditCommunication) => {
    const cur = c.scheduled_at ? new Date(c.scheduled_at).toISOString().slice(0, 16) : '';
    const next = prompt('New send time (YYYY-MM-DDTHH:MM)', cur);
    if (!next) return;
    try { await auditCommunicationInstanceService.schedule(c.id, new Date(next).toISOString(), userCode); toast.success('Rescheduled'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleCancelScheduled = async (id: string) => {
    const reason = prompt('Cancellation reason');
    if (!reason) return;
    try { await auditCommunicationInstanceService.cancelScheduled(id, reason, userCode); toast.success('Cancelled'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">{comms.length} communication(s) for this visit</div>
        <Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-1" />New Communication</Button>
      </div>

      {comms.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No communications yet. Click "New Communication" to begin.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {comms.map((c) => {
            const isDraft = c.status === 'draft' || c.status === 'rejected';
            const isApproved = c.status === 'approved';
            const isScheduled = !!c.scheduled_at && ['draft', 'approved', 'pending_approval'].includes(c.status);
            const canCancel = ['draft', 'pending_approval', 'approved'].includes(c.status);
            return (
              <Card key={c.id}>
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={statusVariant[c.status]}>{c.status}</Badge>
                        <span className="font-medium">{COMM_TYPE_LABELS[c.comm_type]}</span>
                        {c.channel === 'email' && <Mail className="h-3.5 w-3.5 text-muted-foreground" />}
                        {c.channel === 'sms' && <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />}
                        {c.channel === 'both' && <><Mail className="h-3.5 w-3.5 text-muted-foreground" /><MessageSquare className="h-3.5 w-3.5 text-muted-foreground" /></>}
                        {isScheduled && (
                          <Badge variant="outline" className="gap-1"><CalendarClock className="h-3 w-3" />{new Date(c.scheduled_at!).toLocaleString()}</Badge>
                        )}
                        {c.recurrence_enabled && <Badge variant="outline">Recurring × {c.recurrence_max_occurrences ?? '∞'}</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">{c.subject_snapshot || '(no subject)'}</div>
                      {c.recipients && c.recipients.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          To: {c.recipients.map((r) => r.recipient_email || r.recipient_mobile).filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {(isDraft || isApproved) && (
                        <Button size="sm" variant="outline" onClick={() => setEditingId(c.id)}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
                      )}
                      {isDraft && <Button size="sm" variant="outline" onClick={() => handleSubmit(c.id)}>Submit</Button>}
                      {isApproved && <Button size="sm" onClick={() => handleSend(c.id)}><Send className="h-3.5 w-3.5 mr-1" />Send Now</Button>}
                      {isScheduled && <Button size="sm" variant="ghost" onClick={() => handleReschedule(c)}><RotateCcw className="h-3.5 w-3.5 mr-1" />Reschedule</Button>}
                      {canCancel && <Button size="sm" variant="ghost" onClick={() => handleCancelScheduled(c.id)}><Ban className="h-3.5 w-3.5 mr-1" />Cancel</Button>}
                      <Button size="sm" variant="ghost" onClick={() => setHistoryId(c.id)}><History className="h-3.5 w-3.5 mr-1" />History</Button>
                    </div>
                  </div>
                  {c.approvals && c.approvals.length > 0 && (
                    <div className="flex gap-2 flex-wrap text-xs">
                      {c.approvals.map((a) => (
                        <span key={a.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded border">
                          {a.status === 'approved' ? <CheckCircle2 className="h-3 w-3 text-primary" /> :
                            a.status === 'rejected' ? <XCircle className="h-3 w-3 text-destructive" /> :
                            <Clock className="h-3 w-3 text-muted-foreground" />}
                          {a.required_role}
                          {a.status === 'pending' && (
                            <Button size="sm" variant="ghost" className="h-5 px-1 ml-1" onClick={() => handleApprove(a.id)}>Approve</Button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  {c.deliveries && c.deliveries.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Deliveries: {c.deliveries.filter((d) => d.status === 'sent').length} sent, {c.deliveries.filter((d) => d.status === 'failed').length} failed
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Audit Communication</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Template</label>
            <Select value={pickedTemplateId} onValueChange={setPickedTemplateId}>
              <SelectTrigger><SelectValue placeholder="Choose a template..." /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.template_name} <span className="text-xs text-muted-foreground">({t.category})</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">A draft will be created. You can then edit subject/body, recipients, and scheduling before submitting for approval.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!pickedTemplateId || creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingId && (
        <CommunicationDraftEditorDialog
          communicationId={editingId}
          open={!!editingId}
          onClose={() => setEditingId(null)}
          onSaved={load}
          userCode={userCode}
        />
      )}
      {historyId && (
        <CommunicationHistoryDialog
          communicationId={historyId}
          open={!!historyId}
          onClose={() => setHistoryId(null)}
        />
      )}
    </div>
  );
}
