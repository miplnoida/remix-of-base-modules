/**
 * CommunicationComposer
 * ----------------------------------------------------------------------------
 * The single, reusable communication composer for the Audit Visit Workspace.
 * Replaces the older `CommunicationDraftEditorDialog` for stage-aware flows
 * (the old dialog is kept in-tree for back-compat with the panel's "Edit"
 * action).
 *
 * Capabilities (per spec):
 *   ✓ Loads a template either by `templateId` or by an action descriptor
 *     (stage + comm-type hints). Multi-template picker is built-in.
 *   ✓ Auto-fills merge fields from `case` + `visit` + `employer` data, and
 *     resolves recipients via `auditCommunicationRecipientService`.
 *   ✓ Live preview tab using `renderMergeFields`.
 *   ✓ Channel: Email · SMS · Both. Combined / portal delivery is expressed
 *     via the `use_secure_link` attachment flag (existing convention).
 *   ✓ Attachments tab — list + add external link + secure-link toggle.
 *   ✓ Draft → Submit-for-approval → Send-now flow with full audit trail
 *     (events recorded by underlying services).
 *   ✓ Recipient override with audit trail (`source = 'manual'`).
 *   ✓ Records initiator (`createdBy` / `updatedBy` = userCode) on every step.
 *
 * Non-goals — this composer does NOT define templates. All templates come
 * from Settings (`ce_audit_communication_templates`); the composer only
 * snapshots a chosen template into a draft.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle, CheckCircle2, ExternalLink, FileText, Loader2, Lock, Mail,
  MessageSquare, Paperclip, Plus, Send, Settings2, ShieldCheck, ThumbsDown, Trash2, UserCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { auditCommunicationService } from '@/services/auditCommunicationService';
import {
  auditCommunicationInstanceService,
  type ManualRecipientInput,
} from '@/services/auditCommunicationInstanceService';
import { auditCommunicationTemplateService } from '@/services/auditCommunicationTemplateService';
import { auditCommunicationRecipientService } from '@/services/auditCommunicationRecipientService';
import { auditCommunicationApprovalService } from '@/services/auditCommunicationApprovalService';
import { fieldStageTemplateMapService } from '@/services/fieldStageTemplateMapService';
import {
  renderMergeFields, DEFAULT_PREVIEW_SAMPLE,
} from '@/lib/audit/communicationMergePreview';
import type {
  AuditCommunication, AuditCommunicationApproval, AuditCommunicationTemplate,
  CeCommApprovalRole, CeCommChannel, CeCommType,
} from '@/types/auditCommunication';
import type { FieldExecutionStage } from '@/types/fieldStageMapping';

const ATT = 'ce_audit_communication_attachments' as any;

/* ─────────────────────────── Public types ─────────────────────────── */

export interface ComposerActionDescriptor {
  /** Friendly label shown in the dialog header. */
  label: string;
  /** Stage to consult for template resolution. */
  fieldStage: FieldExecutionStage;
  /** Preferred comm_types in priority order. */
  commTypeHints: CeCommType[];
  /** Optional one-liner shown beneath the title. */
  description?: string;
}

export interface ComposerCaseContext {
  case_no?: string;
  due_date?: string;
  amount_due?: string | number;
  enforcement_stage?: string | null;
  case_type?: string | null;
  [k: string]: unknown;
}

export interface ComposerVisitContext {
  visit_date?: string;
  officer?: string;
  case_no?: string;
  [k: string]: unknown;
}

export interface CommunicationComposerProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful save / submit / send. */
  onChanged?: () => void;

  /** Visit + case wiring. */
  inspectionId: string;
  employerId: string;
  employerName?: string;
  userCode?: string;
  /**
   * Roles held by the current user — used to gate the Approve/Reject controls.
   * If a pending step's `required_role` is in this list the user can act on it.
   */
  approverRoles?: CeCommApprovalRole[];

  /** Mode A — open the composer for an existing draft (e.g. from the panel). */
  communicationId?: string;

  /** Mode B — open for a brand-new send. Provide ONE of: */
  templateId?: string;
  action?: ComposerActionDescriptor;

  /** Auto-fill context — merged into the template snapshot at draft time. */
  caseContext?: ComposerCaseContext;
  visitContext?: ComposerVisitContext;
  /**
   * Severity feeds the approval-policy resolver. Defaults to 'none'.
   * Pass the highest live finding severity for the visit.
   */
  severity?: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

/* ─────────────────────────── Helpers ─────────────────────────── */

interface AttachmentRow {
  id: string;
  attachment_kind: string;
  filename: string | null;
  file_url: string | null;
  is_external: boolean;
}

async function listAttachments(commId: string): Promise<AttachmentRow[]> {
  const { data, error } = await (supabase.from(ATT) as any)
    .select('id, attachment_kind, filename, file_url, is_external')
    .eq('communication_id', commId)
    .order('created_at');
  if (error) throw error;
  return (data || []) as AttachmentRow[];
}

async function addExternalAttachment(
  commId: string,
  payload: { kind: string; filename: string; url: string },
  userCode?: string,
) {
  const { error } = await (supabase.from(ATT) as any).insert({
    communication_id: commId,
    attachment_kind: payload.kind,
    filename: payload.filename,
    file_url: payload.url,
    is_external: true,
    created_by: userCode,
  });
  if (error) throw error;
}

async function deleteAttachment(id: string) {
  const { error } = await (supabase.from(ATT) as any).delete().eq('id', id);
  if (error) throw error;
}

/* ─────────────────────────── Component ─────────────────────────── */

export function CommunicationComposer(props: CommunicationComposerProps) {
  const {
    open, onClose, onChanged,
    inspectionId, employerId, employerName, userCode, approverRoles = [],
    communicationId, templateId, action,
    caseContext, visitContext, severity = 'none',
  } = props;

  // ----- Lifecycle state
  const [phase, setPhase] = useState<'resolving' | 'picking_template' | 'ready' | 'error'>('resolving');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'save' | 'submit' | 'send'>(null);

  // ----- Template resolution (only used in Mode B before a draft exists)
  const [candidates, setCandidates] = useState<AuditCommunicationTemplate[]>([]);
  const [chosenTemplateId, setChosenTemplateId] = useState<string | null>(templateId ?? null);

  // ----- Live composer state (mirrors a draft row)
  const [comm, setComm] = useState<AuditCommunication | null>(null);
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [channel, setChannel] = useState<CeCommChannel>('email');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [recipients, setRecipients] = useState<ManualRecipientInput[]>([]);
  const [useSecureLink, setUseSecureLink] = useState<boolean>(false);

  // Attachments (only available once a draft exists)
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [newAttUrl, setNewAttUrl] = useState('');
  const [newAttName, setNewAttName] = useState('');

  // ----- Auto-fill context bag for merge rendering
  const mergeContext = useMemo(() => {
    const base = { ...DEFAULT_PREVIEW_SAMPLE };
    return {
      ...base,
      employer: {
        ...(base.employer as object),
        name: employerName ?? (base.employer as any).name,
        regno: employerId,
      },
      case: { ...(base.case as object), ...(caseContext || {}) },
      visit: { ...(base.visit as object), ...(visitContext || {}) },
      inspection: {
        ...(base.inspection as object),
        case_no: visitContext?.case_no ?? caseContext?.case_no ?? (base.inspection as any).case_no,
        visit_date: visitContext?.visit_date ?? (base.inspection as any).visit_date,
        officer: visitContext?.officer ?? (base.inspection as any).officer,
      },
    };
  }, [employerId, employerName, caseContext, visitContext]);

  /* ─── Effect: initial resolution ─── */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPhase('resolving');
    setErrorMsg(null);

    (async () => {
      try {
        // Mode A — existing draft
        if (communicationId) {
          await loadCommunication(communicationId);
          if (!cancelled) setPhase('ready');
          return;
        }

        // Mode B — direct templateId
        if (templateId) {
          if (!cancelled) {
            setChosenTemplateId(templateId);
            await ensureDraftFromTemplate(templateId);
            if (!cancelled) setPhase('ready');
          }
          return;
        }

        // Mode B — action descriptor → resolve candidates
        if (action) {
          const mapped = await fieldStageTemplateMapService.listForStage(action.fieldStage);
          let pool: AuditCommunicationTemplate[] = mapped.filter(
            (t) => action.commTypeHints.includes(t.comm_type),
          );
          if (pool.length === 0) pool = mapped;
          if (pool.length === 0) {
            const all = await auditCommunicationTemplateService.list({ activeOnly: true });
            pool = all.filter((t) => action.commTypeHints.includes(t.comm_type));
          }
          // De-dupe + order by hint priority
          const byId = new Map<string, AuditCommunicationTemplate>();
          for (const t of pool) byId.set(t.id, t);
          const ordered = Array.from(byId.values()).sort((a, b) => {
            const ai = action.commTypeHints.indexOf(a.comm_type);
            const bi = action.commTypeHints.indexOf(b.comm_type);
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
          });
          if (cancelled) return;
          if (ordered.length === 0) {
            setErrorMsg(`No template configured for "${action.label}".`);
            setPhase('error');
            return;
          }
          if (ordered.length === 1) {
            setChosenTemplateId(ordered[0].id);
            await ensureDraftFromTemplate(ordered[0].id);
            if (!cancelled) setPhase('ready');
          } else {
            setCandidates(ordered);
            setChosenTemplateId(ordered[0].id);
            setPhase('picking_template');
          }
          return;
        }

        throw new Error('Composer requires communicationId, templateId, or action.');
      } catch (e: any) {
        if (cancelled) return;
        setErrorMsg(e?.message ?? 'Failed to open composer');
        setPhase('error');
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, communicationId, templateId, action?.fieldStage, action?.commTypeHints?.join(',')]);

  /* ─── Loaders ─── */
  async function loadCommunication(id: string) {
    const c = await auditCommunicationService.getById(id);
    if (!c) throw new Error('Communication not found');
    setComm(c as AuditCommunication);
    setSubject(c.subject_snapshot || '');
    setEmailBody(c.email_body_snapshot || '');
    setSmsBody(c.sms_body_snapshot || '');
    setChannel(c.channel);
    setScheduledAt(c.scheduled_at ? c.scheduled_at.slice(0, 16) : '');
    setRecipients((c.recipients || []).map((r) => ({
      name: r.recipient_name ?? '', email: r.recipient_email ?? '',
      mobile: r.recipient_mobile ?? '', role: r.recipient_role ?? '',
      is_primary: r.is_primary,
    })));
    const atts = await listAttachments(c.id);
    setAttachments(atts);
    setUseSecureLink(atts.some((a) => a.attachment_kind === 'secure_link'));
  }

  async function ensureDraftFromTemplate(tplId: string) {
    // Build the rendered snapshot context
    const ctx: Record<string, unknown> = {
      employer_name: employerName ?? employerId,
      employer_id: employerId,
      visit_date: visitContext?.visit_date ?? new Date().toISOString().slice(0, 10),
      officer: visitContext?.officer ?? null,
      case_no: visitContext?.case_no ?? caseContext?.case_no ?? null,
      due_date: caseContext?.due_date ?? null,
      amount_due: caseContext?.amount_due ?? null,
      case_type: caseContext?.case_type ?? null,
      enforcement_stage: caseContext?.enforcement_stage ?? null,
      field_stage: action?.fieldStage ?? null,
    };

    const created = await auditCommunicationService.createDraft({
      inspectionId,
      employerId,
      templateId: tplId,
      contextData: ctx,
      createdBy: userCode,
      severity,
      caseType: caseContext?.case_type ?? null,
      enforcementStage: caseContext?.enforcement_stage ?? null,
    });
    await loadCommunication(created.id);
  }

  /* ─── Recipient helpers ─── */
  const addRecipient = () =>
    setRecipients([...recipients, { name: '', email: '', mobile: '', is_primary: recipients.length === 0 }]);
  const updateRecipient = (i: number, patch: Partial<ManualRecipientInput>) =>
    setRecipients(recipients.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRecipient = (i: number) =>
    setRecipients(recipients.filter((_, idx) => idx !== i));
  const setPrimary = (i: number, v: boolean) =>
    setRecipients(recipients.map((x, idx) => ({ ...x, is_primary: idx === i ? v : false })));

  const reResolveRecipients = async () => {
    try {
      const resolved = await auditCommunicationRecipientService.resolve({
        inspectionId, employerId,
      });
      if (resolved.length === 0) {
        toast.message('No recipients found in case/visit/master.');
        return;
      }
      setRecipients(resolved.map((r, idx) => ({
        name: r.name ?? '', email: r.email ?? '', mobile: r.mobile ?? '',
        role: r.role ?? '', is_primary: idx === 0,
      })));
      toast.success(`Auto-filled ${resolved.length} recipient(s).`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not resolve recipients');
    }
  };

  /* ─── Persistence operations ─── */
  const editable = !!comm && ['draft', 'rejected'].includes(comm.status);
  const submittable = !!comm && comm.status === 'draft';
  const sendable = !!comm && comm.status === 'approved';

  async function saveDraft(): Promise<boolean> {
    if (!comm) return false;
    setBusy('save');
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
      if (scheduledAt) {
        await auditCommunicationInstanceService.schedule(
          comm.id, new Date(scheduledAt).toISOString(), userCode,
        );
      }
      // Sync the secure-link attachment flag
      const existingSecure = attachments.find((a) => a.attachment_kind === 'secure_link');
      if (useSecureLink && !existingSecure) {
        await addExternalAttachment(
          comm.id,
          { kind: 'secure_link', filename: 'Secure portal link', url: '' },
          userCode,
        );
      } else if (!useSecureLink && existingSecure) {
        await deleteAttachment(existingSecure.id);
      }
      const refreshed = await listAttachments(comm.id);
      setAttachments(refreshed);
      toast.success('Draft saved');
      onChanged?.();
      return true;
    } catch (e: any) {
      toast.error('Save failed', { description: e?.message });
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function submitForApproval() {
    if (!comm) return;
    const ok = await saveDraft();
    if (!ok) return;
    setBusy('submit');
    try {
      const updated = await auditCommunicationService.submitForApproval(comm.id, userCode);
      if (updated) setComm(updated as AuditCommunication);
      toast.success('Submitted for approval');
      onChanged?.();
    } catch (e: any) {
      toast.error('Submit failed', { description: e?.message });
    } finally {
      setBusy(null);
    }
  }

  async function sendNow() {
    if (!comm) return;
    setBusy('send');
    try {
      // Pre-stamp sent_late + late_reason on audit_intimation rows when the
      // visit context indicates the policy lead time has been violated. The
      // database trigger on send will then propagate this into the audit log.
      try {
        if (comm.comm_type === 'audit_intimation') {
          const v: any = visitContext ?? {};
          const planned = v.planned_date ? new Date(v.planned_date) : null;
          const minLeadHours = typeof v.min_lead_hours === 'number' ? v.min_lead_hours : 48;
          const requiredBy = planned
            ? new Date(planned.getTime() - minLeadHours * 3600_000)
            : null;
          const late = !!v.send_late_expected
            || (requiredBy ? new Date() > requiredBy : false);
          if (late) {
            await (supabase.from(COMM) as any)
              .update({
                sent_late: true,
                late_reason: v.send_late_expected
                  ? 'Sent after visit start (governance exception)'
                  : `Sent inside the ${minLeadHours}h pre-visit lead window.`,
              })
              .eq('id', comm.id);
          }
        }
      } catch {
        /* non-fatal — proceed with send so the user is not blocked. */
      }

      const r = await auditCommunicationService.send(comm.id, userCode);
      if (r.ok) {
        toast.success(
          comm.comm_type === 'audit_intimation' && (visitContext as any)?.send_late_expected
            ? `Late intimation sent to ${r.sent} recipient(s)`
            : `Sent to ${r.sent} recipient(s)`,
        );
      } else {
        toast.warning(`Sent ${r.sent}, failed ${r.failed}`);
      }
      onChanged?.();
      onClose();
    } catch (e: any) {
      toast.error('Send failed', { description: e?.message });
    } finally {
      setBusy(null);
    }
  }

  async function addExternalUrlAttachment() {
    if (!comm) return;
    if (!newAttUrl || !newAttName) {
      toast.error('Provide both a name and URL.');
      return;
    }
    try {
      await addExternalAttachment(
        comm.id,
        { kind: 'external_link', filename: newAttName, url: newAttUrl },
        userCode,
      );
      const refreshed = await listAttachments(comm.id);
      setAttachments(refreshed);
      setNewAttName(''); setNewAttUrl('');
    } catch (e: any) {
      toast.error('Could not add attachment', { description: e?.message });
    }
  }

  async function removeAttachment(id: string) {
    try {
      await deleteAttachment(id);
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    } catch (e: any) {
      toast.error('Could not remove attachment', { description: e?.message });
    }
  }

  /* ─── Derived rendering values ─── */
  const previewSubject = renderMergeFields(subject, mergeContext);
  const previewBody = renderMergeFields(emailBody, mergeContext);
  const previewSms = renderMergeFields(smsBody, mergeContext);

  /* ─── Render ─── */
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            {action?.label ?? (comm ? 'Communication' : 'New Communication')}
            {comm && (
              <Badge variant="outline" className="ml-2 capitalize">{comm.status.replace('_', ' ')}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {action?.description ?? 'Compose, preview, and dispatch a communication for this audit visit.'}
          </DialogDescription>
        </DialogHeader>

        {phase === 'resolving' && (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        )}

        {phase === 'error' && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" /> {errorMsg}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Link a template for this stage in
              {' '}
              <Link to="/compliance/admin/field-stage-template-mapping" className="underline">
                Field Stage → Template Mapping
              </Link>
              {' '}or add one in Settings.
            </p>
          </div>
        )}

        {phase === 'picking_template' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Multiple templates are mapped to this stage. Pick one to start the draft.
            </p>
            <Select
              value={chosenTemplateId ?? ''}
              onValueChange={(v) => setChosenTemplateId(v)}
            >
              <SelectTrigger><SelectValue placeholder="Choose template" /></SelectTrigger>
              <SelectContent>
                {candidates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-2">
                      {t.channel === 'email' && <Mail className="h-3 w-3" />}
                      {t.channel === 'sms' && <MessageSquare className="h-3 w-3" />}
                      {t.channel === 'both' && (<><Mail className="h-3 w-3" /><MessageSquare className="h-3 w-3" /></>)}
                      {t.template_name}
                      <span className="text-xs text-muted-foreground">({t.template_code})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={async () => {
                  if (!chosenTemplateId) return;
                  setPhase('resolving');
                  try {
                    await ensureDraftFromTemplate(chosenTemplateId);
                    setPhase('ready');
                  } catch (e: any) {
                    setErrorMsg(e?.message ?? 'Failed to create draft');
                    setPhase('error');
                  }
                }}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {phase === 'ready' && comm && (
          <Tabs defaultValue={comm.status === 'pending_approval' || comm.status === 'rejected' ? 'approval' : 'compose'}>
            <TabsList className="grid grid-cols-6">
              <TabsTrigger value="compose">Compose</TabsTrigger>
              <TabsTrigger value="recipients">Recipients</TabsTrigger>
              <TabsTrigger value="attachments">Attachments</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="approval" className="relative">
                Approval
                {comm.approvals && comm.approvals.some((a) => a.status === 'pending') && (
                  <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px]">
                    {comm.approvals.filter((a) => a.status === 'pending').length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            {/* ─────── Compose ─────── */}
            <TabsContent value="compose" className="space-y-3 pt-3">
              {!editable && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded p-2">
                  <Lock className="h-3.5 w-3.5" />
                  This communication is {comm.status.replace('_', ' ')} — content is locked.
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Channel</Label>
                  <Select value={channel} onValueChange={(v) => setChannel(v as CeCommChannel)} disabled={!editable}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="both">Both (Email + SMS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Combined / portal delivery
                  </Label>
                  <div className="flex items-center gap-2 h-10">
                    <Switch checked={useSecureLink} onCheckedChange={setUseSecureLink} disabled={!editable} />
                    <span className="text-xs text-muted-foreground">
                      Send a secure portal link instead of (or alongside) raw attachments.
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <Label>Email subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={!editable}
                  placeholder="Subject — supports {{merge.fields}}"
                />
              </div>
              <div>
                <Label>Email body</Label>
                <Textarea
                  rows={10}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  disabled={!editable}
                  placeholder="Body — supports {{merge.fields}} (e.g. {{employer.name}}, {{case.due_date}})"
                />
              </div>
              <div>
                <Label>SMS body</Label>
                <Textarea
                  rows={3}
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  disabled={!editable}
                  placeholder="Short SMS message"
                />
              </div>
            </TabsContent>

            {/* ─────── Recipients ─────── */}
            <TabsContent value="recipients" className="space-y-3 pt-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  Recipients can be auto-resolved from the case/visit, or overridden manually.
                  All overrides are saved with source = <code>manual</code> for audit trail.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={reResolveRecipients} disabled={!editable}>
                    Auto-fill from case
                  </Button>
                  <Button size="sm" variant="outline" onClick={addRecipient} disabled={!editable}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {recipients.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center border rounded p-2">
                    <Input className="col-span-3" placeholder="Name" value={r.name || ''} onChange={(e) => updateRecipient(i, { name: e.target.value })} disabled={!editable} />
                    <Input className="col-span-4" placeholder="Email" value={r.email || ''} onChange={(e) => updateRecipient(i, { email: e.target.value })} disabled={!editable} />
                    <Input className="col-span-3" placeholder="Mobile" value={r.mobile || ''} onChange={(e) => updateRecipient(i, { mobile: e.target.value })} disabled={!editable} />
                    <div className="col-span-1 flex items-center justify-center" title="Primary recipient">
                      <Switch checked={!!r.is_primary} onCheckedChange={(v) => setPrimary(i, v)} disabled={!editable} />
                    </div>
                    <Button size="icon" variant="ghost" className="col-span-1" onClick={() => removeRecipient(i)} disabled={!editable}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {recipients.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recipients yet — add one or use "Auto-fill from case".
                  </p>
                )}
              </div>
            </TabsContent>

            {/* ─────── Attachments ─────── */}
            <TabsContent value="attachments" className="space-y-3 pt-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" />
                Attach external links (e.g. signed PDFs, secure portal documents). Template-driven
                attachments (report PDF, evidence pack, …) are produced automatically at send time.
              </div>
              <div className="border rounded p-3 space-y-2">
                <div className="grid grid-cols-12 gap-2">
                  <Input className="col-span-4" placeholder="Display name" value={newAttName} onChange={(e) => setNewAttName(e.target.value)} disabled={!editable} />
                  <Input className="col-span-7" placeholder="https://…" value={newAttUrl} onChange={(e) => setNewAttUrl(e.target.value)} disabled={!editable} />
                  <Button className="col-span-1" size="icon" variant="outline" onClick={addExternalUrlAttachment} disabled={!editable}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Separator />
                {attachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">No attachments.</p>
                ) : (
                  <ul className="space-y-1">
                    {attachments.map((a) => (
                      <li key={a.id} className="flex items-center justify-between border rounded p-2 text-sm">
                        <span className="flex items-center gap-2 min-w-0">
                          {a.attachment_kind === 'secure_link' ? <Lock className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                          <span className="truncate">{a.filename || a.attachment_kind}</span>
                          <Badge variant="outline" className="text-[10px]">{a.attachment_kind}</Badge>
                          {a.file_url && (
                            <a href={a.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-0.5">
                              open <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </span>
                        <Button size="icon" variant="ghost" onClick={() => removeAttachment(a.id)} disabled={!editable}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>

            {/* ─────── Schedule ─────── */}
            <TabsContent value="schedule" className="space-y-3 pt-3">
              <div>
                <Label>Send at (leave blank for immediate after approval)</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                {comm.scheduled_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Currently scheduled: {new Date(comm.scheduled_at).toLocaleString()}
                  </p>
                )}
              </div>
            </TabsContent>

            {/* ─────── Approval workflow ─────── */}
            <TabsContent value="approval" className="space-y-3 pt-3">
              {(comm.approvals?.length ?? 0) === 0 ? (
                <div className="rounded border bg-muted/30 p-3 text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <span>
                    No approval required for this communication
                    {comm.severity_snapshot && comm.severity_snapshot !== 'none' && (
                      <> (severity: <Badge variant="outline" className="text-[10px]">{comm.severity_snapshot}</Badge>)</>
                    )}
                    . It can be sent directly once a draft is ready.
                  </span>
                </div>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground">
                    Approval chain resolved by policy at draft creation. Author:{' '}
                    <span className="font-medium text-foreground">{comm.created_by || 'system'}</span>
                    {comm.severity_snapshot && (
                      <> · severity <Badge variant="outline" className="text-[10px]">{comm.severity_snapshot}</Badge></>
                    )}
                  </div>
                  <ol className="space-y-2">
                    {(comm.approvals || []).slice().sort((a, b) => a.step_no - b.step_no).map((a: AuditCommunicationApproval) => {
                      const canAct = a.status === 'pending' && approverRoles.includes(a.required_role);
                      return (
                        <li key={a.id} className="border rounded p-3 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Step {a.step_no}</Badge>
                              <span className="font-medium capitalize">{a.required_role.replace('_', ' ')}</span>
                              <Badge
                                variant={a.status === 'approved' ? 'default' : a.status === 'rejected' ? 'destructive' : 'secondary'}
                                className="capitalize"
                              >
                                {a.status}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {a.approver_user_id && <>by <span className="font-medium text-foreground">{a.approver_name || a.approver_user_id}</span> · </>}
                              {a.decided_at && <>{new Date(a.decided_at).toLocaleString()}</>}
                            </div>
                          </div>
                          {a.comments && (
                            <div className="text-xs bg-muted/40 rounded p-2 whitespace-pre-wrap">
                              <span className="font-medium">{a.status === 'rejected' ? 'Rejection reason' : 'Comment'}:</span> {a.comments}
                            </div>
                          )}
                          {canAct && (
                            <ApprovalActionRow
                              approvalId={a.id}
                              userCode={userCode}
                              onDone={async () => { if (comm) await loadCommunication(comm.id); onChanged?.(); }}
                            />
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  {comm.rejection_reason && comm.status === 'rejected' && (
                    <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm">
                      <div className="flex items-center gap-2 text-destructive font-medium">
                        <AlertTriangle className="h-4 w-4" /> Communication rejected
                      </div>
                      <p className="mt-1 text-xs">{comm.rejection_reason}</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Edit the draft to address the feedback, then re-submit for approval.
                      </p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* ─────── Preview ─────── */}
            <TabsContent value="preview" className="space-y-3 pt-3">
              <div className="rounded border bg-card p-3 space-y-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Email Preview</div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Subject</div>
                  <div className="font-medium">{previewSubject || <span className="text-muted-foreground">—</span>}</div>
                </div>
                <Separator />
                <div
                  className="text-sm whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: previewBody || '<span class="text-muted-foreground">—</span>' }}
                />
              </div>
              {(channel === 'sms' || channel === 'both') && (
                <div className="rounded border bg-card p-3 space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">SMS Preview</div>
                  <div className="text-sm">{previewSms || <span className="text-muted-foreground">—</span>}</div>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Settings2 className="h-3 w-3" /> Merge values use real case/visit/employer data
                where available, with sample fallbacks for unresolved fields.
              </p>
            </TabsContent>
          </Tabs>
        )}

        {phase === 'ready' && comm && (
          <DialogFooter className="flex flex-wrap gap-2 items-center justify-between">
            <div className="text-[11px] text-muted-foreground">
              Initiated by{' '}
              <span className="font-medium text-foreground">{userCode || 'system'}</span>
              {comm.created_at && (
                <> · created {new Date(comm.created_at).toLocaleString()}</>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button variant="outline" onClick={saveDraft} disabled={!editable || busy !== null}>
                {busy === 'save' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Save draft
              </Button>
              <Button variant="secondary" onClick={submitForApproval} disabled={!submittable || busy !== null}>
                {busy === 'submit' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                Submit for approval
              </Button>
              <Button onClick={sendNow} disabled={!sendable || busy !== null}>
                {busy === 'send' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                Send now
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CommunicationComposer;

/* ─────────────────────────── ApprovalActionRow ─────────────────────────── */
/**
 * Inline approve/reject controls for the current step. Records approver +
 * timestamp + comment; rejection reason is mirrored onto the parent
 * communication via the approval service.
 */
function ApprovalActionRow({
  approvalId, userCode, onDone,
}: { approvalId: string; userCode?: string; onDone: () => void | Promise<void> }) {
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<null | 'approve' | 'reject'>(null);

  const approve = async () => {
    setBusy('approve');
    try {
      await auditCommunicationApprovalService.approve(
        approvalId, { userCode: userCode || 'system', name: userCode }, comment || undefined,
      );
      toast.success('Approved');
      await onDone();
    } catch (e: any) {
      toast.error('Approve failed', { description: e?.message });
    } finally { setBusy(null); }
  };

  const reject = async () => {
    if (!comment.trim()) {
      toast.error('Please provide a rejection reason.');
      return;
    }
    setBusy('reject');
    try {
      await auditCommunicationApprovalService.reject(
        approvalId, { userCode: userCode || 'system', name: userCode }, comment.trim(),
      );
      toast.success('Rejected');
      await onDone();
    } catch (e: any) {
      toast.error('Reject failed', { description: e?.message });
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-2 pt-1">
      <Textarea
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comment (required for rejection)"
      />
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="destructive" onClick={reject} disabled={busy !== null}>
          {busy === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <ThumbsDown className="h-3.5 w-3.5 mr-1" />}
          Reject
        </Button>
        <Button size="sm" onClick={approve} disabled={busy !== null}>
          {busy === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <UserCheck className="h-3.5 w-3.5 mr-1" />}
          Approve
        </Button>
      </div>
    </div>
  );
}
