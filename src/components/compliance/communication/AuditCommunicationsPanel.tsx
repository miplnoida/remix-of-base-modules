/**
 * AuditCommunicationsPanel — Communication Control Center for a single
 * audit visit. Renders all communications linked to the active inspection
 * (visit) + employer (case) as a sortable table with full lifecycle metadata
 * and per-row actions.
 *
 * Columns:
 *   Template · Type · Status · Channel · Recipients · Trigger Stage ·
 *   Sent · Due · Acknowledged · Response · Escalation Level
 *
 * Actions per row:
 *   Preview · Edit (draft) · Submit · Send Now · Reschedule · Cancel ·
 *   Resend · Escalate · History
 *
 * Data is read from existing tables — no schema changes. Acknowledgment /
 * response / escalation are derived:
 *   - Acknowledged → latest delivery `opened_at` OR an `acknowledged` event
 *   - Response     → an `employer_responded` event
 *   - Escalation   → comm_type === 'escalation_notice' OR occurrence_no > 1
 */
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2, Send, Plus, Mail, MessageSquare, CheckCircle2, XCircle,
  Clock, Pencil, History, CalendarClock, Ban, RotateCcw, Eye,
  MoreHorizontal, AlertTriangle, ArrowUpRight, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { auditCommunicationService } from '@/services/auditCommunicationService';
import { auditCommunicationTemplateService } from '@/services/auditCommunicationTemplateService';
import { auditCommunicationApprovalService } from '@/services/auditCommunicationApprovalService';
import { auditCommunicationInstanceService } from '@/services/auditCommunicationInstanceService';
import type {
  AuditCommunication, AuditCommunicationTemplate, CeCommStatus,
  AuditCommunicationEvent,
} from '@/types/auditCommunication';
import {
  COMM_TYPE_LABELS, COMM_LIFECYCLE_STAGE_LABELS,
} from '@/types/auditCommunication';
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

const statusLabel: Record<CeCommStatus, string> = {
  draft: 'Draft', pending_approval: 'Pending Approval', approved: 'Approved',
  rejected: 'Rejected', sending: 'Sending', sent: 'Sent', partial: 'Partial',
  failed: 'Failed', cancelled: 'Cancelled',
};

type FilterStatus = 'all' | CeCommStatus;

interface DerivedRow {
  comm: AuditCommunication;
  acknowledgedAt: string | null;
  respondedAt: string | null;
  escalationLevel: number; // 0 = none, ≥1 = level
  triggerStageLabel: string;
  templateName: string;
  recipientsLabel: string;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function deriveRow(c: AuditCommunication, events: AuditCommunicationEvent[]): DerivedRow {
  const ack =
    events.find((e) => e.event_type === 'acknowledged')?.created_at ||
    c.deliveries?.find((d) => d.opened_at)?.opened_at ||
    null;
  const resp =
    events.find((e) => e.event_type === 'employer_responded')?.created_at || null;

  // Escalation level: explicit escalation_notice = 1, plus +1 per recurrence
  // occurrence beyond the first.
  let escalationLevel = 0;
  if (c.comm_type === 'escalation_notice') escalationLevel = c.occurrence_no || 1;
  else if (c.occurrence_no > 1) escalationLevel = c.occurrence_no - 1;

  const triggerStageLabel = c.template?.category
    ? // Map old category onto lifecycle label if available
      (COMM_LIFECYCLE_STAGE_LABELS as Record<string, string>)[c.template.category] ??
      c.template.category
    : '—';

  const templateName = c.template?.template_name || (c.template_id ? '(template)' : '(ad-hoc)');

  const recipientsLabel = c.recipients && c.recipients.length > 0
    ? c.recipients
        .map((r) => r.recipient_email || r.recipient_mobile || r.recipient_name || '')
        .filter(Boolean)
        .join(', ')
    : '—';

  return { comm: c, acknowledgedAt: ack, respondedAt: resp, escalationLevel, triggerStageLabel, templateName, recipientsLabel };
}

export function AuditCommunicationsPanel({ inspectionId, employerId, employerName, userCode }: Props) {
  const [rows, setRows] = useState<DerivedRow[]>([]);
  const [templates, setTemplates] = useState<AuditCommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pickedTemplateId, setPickedTemplateId] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<DerivedRow | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const load = async () => {
    setLoading(true);
    try {
      const [list, tpls] = await Promise.all([
        auditCommunicationService.listForInspection(inspectionId),
        auditCommunicationTemplateService.list({ activeOnly: true }),
      ]);
      // Hydrate per-row + load events to derive ack/response.
      const hydrated = await Promise.all(
        list.map(async (c) => {
          const [full, events] = await Promise.all([
            auditCommunicationService.getById(c.id),
            auditCommunicationInstanceService.listEvents(c.id).catch(() => []),
          ]);
          return full ? deriveRow(full, events) : null;
        }),
      );
      setRows(hydrated.filter(Boolean) as DerivedRow[]);
      setTemplates(tpls);
    } catch (e: any) {
      toast.error('Failed to load communications', { description: e.message });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [inspectionId]);

  const filteredRows = useMemo(() => {
    if (filterStatus === 'all') return rows;
    return rows.filter((r) => r.comm.status === filterStatus);
  }, [rows, filterStatus]);

  const stats = useMemo(() => {
    const total = rows.length;
    const sent = rows.filter((r) => r.comm.status === 'sent' || r.comm.status === 'partial').length;
    const pending = rows.filter((r) =>
      r.comm.status === 'draft' || r.comm.status === 'pending_approval' || r.comm.status === 'approved',
    ).length;
    const failed = rows.filter((r) => r.comm.status === 'failed').length;
    const acknowledged = rows.filter((r) => !!r.acknowledgedAt).length;
    return { total, sent, pending, failed, acknowledged };
  }, [rows]);

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

  /**
   * Resend = create a fresh draft from the same template, linked to the same
   * visit + employer. Opens in editor for the user to confirm/adjust.
   */
  const handleResend = async (c: AuditCommunication) => {
    if (!c.template_id) {
      toast.error('Cannot resend — original template not available');
      return;
    }
    try {
      const created = await auditCommunicationService.createDraft({
        inspectionId, employerId, templateId: c.template_id,
        contextData: { ...c.context_data_json, resend_of: c.id },
        createdBy: userCode,
      });
      toast.success('Draft created from previous communication');
      setEditingId(created.id);
      load();
    } catch (e: any) { toast.error('Resend failed', { description: e.message }); }
  };

  /**
   * Escalate = create a draft using an escalation-notice template if one
   * exists; otherwise reuse the same template and tag the context.
   */
  const handleEscalate = async (c: AuditCommunication) => {
    const escTpl = templates.find((t) => t.comm_type === 'escalation_notice');
    const tplId = escTpl?.id || c.template_id;
    if (!tplId) {
      toast.error('No escalation template configured');
      return;
    }
    try {
      const created = await auditCommunicationService.createDraft({
        inspectionId, employerId, templateId: tplId,
        contextData: { ...c.context_data_json, escalation_of: c.id },
        createdBy: userCode,
      });
      toast.success(escTpl ? 'Escalation draft created' : 'Follow-up draft created');
      setEditingId(created.id);
      load();
    } catch (e: any) { toast.error('Escalation failed', { description: e.message }); }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header / KPIs */}
      <Card>
        <CardContent className="py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4 text-xs">
            <KpiPill label="Total" value={stats.total} />
            <KpiPill label="Sent" value={stats.sent} tone="success" />
            <KpiPill label="Pending" value={stats.pending} tone="warning" />
            <KpiPill label="Failed" value={stats.failed} tone="destructive" />
            <KpiPill label="Acknowledged" value={stats.acknowledged} tone="success" />
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(Object.keys(statusLabel) as CeCommStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={load}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
            <Button size="sm" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Communication
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {filteredRows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            {rows.length === 0
              ? 'No communications yet. Click "New Communication" to begin.'
              : 'No communications match the current filter.'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Trigger Stage</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Acknowledged</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead>Escalation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <CommRow
                    key={row.comm.id}
                    row={row}
                    onPreview={() => setPreviewing(row)}
                    onEdit={() => setEditingId(row.comm.id)}
                    onSubmit={() => handleSubmit(row.comm.id)}
                    onSend={() => handleSend(row.comm.id)}
                    onReschedule={() => handleReschedule(row.comm)}
                    onCancel={() => handleCancelScheduled(row.comm.id)}
                    onHistory={() => setHistoryId(row.comm.id)}
                    onResend={() => handleResend(row.comm)}
                    onEscalate={() => handleEscalate(row.comm)}
                    onApprove={handleApprove}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* New communication dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Audit Communication</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Template</label>
            <Select value={pickedTemplateId} onValueChange={setPickedTemplateId}>
              <SelectTrigger><SelectValue placeholder="Choose a template..." /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.template_name} <span className="text-xs text-muted-foreground">({t.category})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A draft will be created and linked to this visit & employer. You can then edit subject/body, recipients, and scheduling before submitting for approval.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!pickedTemplateId || creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview — {previewing?.templateName}</DialogTitle>
          </DialogHeader>
          {previewing && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-muted-foreground">Type:</span> {COMM_TYPE_LABELS[previewing.comm.comm_type]}</div>
                <div><span className="text-muted-foreground">Channel:</span> {previewing.comm.channel}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Recipients:</span> {previewing.recipientsLabel}</div>
              </div>
              {previewing.comm.subject_snapshot && (
                <div>
                  <div className="text-xs text-muted-foreground">Subject</div>
                  <div className="font-medium">{previewing.comm.subject_snapshot}</div>
                </div>
              )}
              {previewing.comm.email_body_snapshot && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Email body</div>
                  <div
                    className="border rounded p-3 max-h-80 overflow-y-auto bg-muted/30 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewing.comm.email_body_snapshot }}
                  />
                </div>
              )}
              {previewing.comm.sms_body_snapshot && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">SMS body</div>
                  <div className="border rounded p-3 bg-muted/30 whitespace-pre-wrap text-sm">
                    {previewing.comm.sms_body_snapshot}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewing(null)}>Close</Button>
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

// --- Sub-components ---------------------------------------------------------

function KpiPill({
  label, value, tone = 'default',
}: { label: string; value: number; tone?: 'default' | 'success' | 'warning' | 'destructive' }) {
  const toneClass =
    tone === 'success' ? 'text-success' :
    tone === 'warning' ? 'text-warning' :
    tone === 'destructive' ? 'text-destructive' : 'text-foreground';
  return (
    <div className="flex items-center gap-1">
      <span className={`text-sm font-semibold ${toneClass}`}>{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function ChannelIcons({ channel }: { channel: 'email' | 'sms' | 'both' }) {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      {(channel === 'email' || channel === 'both') && <Mail className="h-3.5 w-3.5" />}
      {(channel === 'sms' || channel === 'both') && <MessageSquare className="h-3.5 w-3.5" />}
    </span>
  );
}

function CommRow({
  row, onPreview, onEdit, onSubmit, onSend, onReschedule, onCancel,
  onHistory, onResend, onEscalate, onApprove,
}: {
  row: DerivedRow;
  onPreview: () => void;
  onEdit: () => void;
  onSubmit: () => void;
  onSend: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  onHistory: () => void;
  onResend: () => void;
  onEscalate: () => void;
  onApprove: (approvalId: string) => void;
}) {
  const c = row.comm;
  const isDraft = c.status === 'draft' || c.status === 'rejected';
  const isApproved = c.status === 'approved';
  const isScheduled = !!c.scheduled_at && ['draft', 'approved', 'pending_approval'].includes(c.status);
  const canCancel = ['draft', 'pending_approval', 'approved'].includes(c.status);
  const isSent = c.status === 'sent' || c.status === 'partial';
  const pendingApproval = c.approvals?.find((a) => a.status === 'pending');

  return (
    <TableRow>
      <TableCell className="font-medium max-w-[180px] truncate" title={row.templateName}>
        {row.templateName}
      </TableCell>
      <TableCell className="text-xs">{COMM_TYPE_LABELS[c.comm_type]}</TableCell>
      <TableCell>
        <Badge variant={statusVariant[c.status]} className="text-[10px]">
          {statusLabel[c.status]}
        </Badge>
        {pendingApproval && (
          <Button
            size="sm" variant="ghost" className="h-5 px-1 ml-1 text-[10px]"
            onClick={() => onApprove(pendingApproval.id)}
          >
            <CheckCircle2 className="h-3 w-3 mr-0.5" /> Approve
          </Button>
        )}
      </TableCell>
      <TableCell><ChannelIcons channel={c.channel} /></TableCell>
      <TableCell className="max-w-[180px] truncate text-xs" title={row.recipientsLabel}>
        {row.recipientsLabel}
      </TableCell>
      <TableCell className="text-xs">{row.triggerStageLabel}</TableCell>
      <TableCell className="text-xs">{formatDateTime(c.sent_at)}</TableCell>
      <TableCell className="text-xs">
        {c.scheduled_at ? (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3" /> {formatDateTime(c.scheduled_at)}
          </span>
        ) : '—'}
      </TableCell>
      <TableCell className="text-xs">
        {row.acknowledgedAt ? (
          <span className="inline-flex items-center gap-1 text-success">
            <CheckCircle2 className="h-3 w-3" /> {formatDateTime(row.acknowledgedAt)}
          </span>
        ) : isSent ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" /> Awaiting
          </span>
        ) : '—'}
      </TableCell>
      <TableCell className="text-xs">
        {row.respondedAt ? (
          <span className="inline-flex items-center gap-1 text-success">
            <CheckCircle2 className="h-3 w-3" /> {formatDateTime(row.respondedAt)}
          </span>
        ) : isSent ? (
          <span className="text-muted-foreground">No response</span>
        ) : '—'}
      </TableCell>
      <TableCell className="text-xs">
        {row.escalationLevel > 0 ? (
          <Badge variant="destructive" className="text-[10px]">
            <AlertTriangle className="h-3 w-3 mr-1" /> L{row.escalationLevel}
          </Badge>
        ) : '—'}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onPreview} title="Preview">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {isApproved && (
            <Button size="sm" onClick={onSend} title="Send now">
              <Send className="h-3.5 w-3.5" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(isDraft || isApproved) && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5 mr-2" /> Edit / Save Draft
                </DropdownMenuItem>
              )}
              {isDraft && (
                <DropdownMenuItem onClick={onSubmit}>
                  <ArrowUpRight className="h-3.5 w-3.5 mr-2" /> Submit for Approval
                </DropdownMenuItem>
              )}
              {isApproved && (
                <DropdownMenuItem onClick={onSend}>
                  <Send className="h-3.5 w-3.5 mr-2" /> Send Now
                </DropdownMenuItem>
              )}
              {isScheduled && (
                <DropdownMenuItem onClick={onReschedule}>
                  <RotateCcw className="h-3.5 w-3.5 mr-2" /> Reschedule
                </DropdownMenuItem>
              )}
              {canCancel && (
                <DropdownMenuItem onClick={onCancel}>
                  <Ban className="h-3.5 w-3.5 mr-2" /> Cancel
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {isSent && (
                <DropdownMenuItem onClick={onResend}>
                  <RefreshCw className="h-3.5 w-3.5 mr-2" /> Resend
                </DropdownMenuItem>
              )}
              {isSent && (
                <DropdownMenuItem onClick={onEscalate}>
                  <AlertTriangle className="h-3.5 w-3.5 mr-2" /> Escalate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onHistory}>
                <History className="h-3.5 w-3.5 mr-2" /> Delivery History
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default AuditCommunicationsPanel;
