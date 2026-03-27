import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Plus, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { StatusBadge, DataTable } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { useIAPlanArtifacts } from '@/hooks/useAuditPlanArtifacts';
import { useIAPlanDistributionLogs, useIAPlanDistributionLogMutations } from '@/hooks/useAuditPlanArtifacts';
import { formatDateForDisplay } from '@/lib/format-config';
import { useToast } from '@/hooks/use-toast';
import { useUserCode } from '@/hooks/useUserCode';
import { supabase } from '@/integrations/supabase/client';

interface PlanDistributionTabProps {
  planId: string;
  plan: any;
}

interface Recipient {
  name: string;
  email: string;
  type: string;
}

const MERGE_FIELDS = ['{{plan_title}}', '{{fiscal_year}}', '{{version_number}}', '{{approved_by}}', '{{approved_date}}', '{{board_committee_name}}', '{{recipient_name}}'];

export function PlanDistributionTab({ planId, plan }: PlanDistributionTabProps) {
  const { toast } = useToast();
  const { userCode } = useUserCode();
  const { data: artifacts = [] } = useIAPlanArtifacts(planId);
  const { data: logs = [], isLoading } = useIAPlanDistributionLogs(planId);
  const { create: createLog } = useIAPlanDistributionLogMutations();

  const finalArtifacts = artifacts.filter((a: any) => a.is_final);
  const isApproved = plan?.status === 'Approved';
  const canSend = isApproved && finalArtifacts.length > 0;

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newRecipient, setNewRecipient] = useState<Recipient>({ name: '', email: '', type: 'external' });
  const [subject, setSubject] = useState(`Annual Audit Plan ${plan?.fiscal_year || ''} — Final Version`);
  const [messageBody, setMessageBody] = useState('');
  const [selectedArtifactId, setSelectedArtifactId] = useState('');
  const [sending, setSending] = useState(false);

  const addRecipient = () => {
    if (!newRecipient.email.trim()) return;
    setRecipients(prev => [...prev, { ...newRecipient }]);
    setNewRecipient({ name: '', email: '', type: 'external' });
  };

  const removeRecipient = (idx: number) => {
    setRecipients(prev => prev.filter((_, i) => i !== idx));
  };

  const insertMergeField = (field: string) => {
    setMessageBody(prev => prev + ' ' + field);
  };

  const resolveMergeFields = (text: string, recipientName?: string) => {
    return text
      .replace(/\{\{plan_title\}\}/g, plan?.title || '')
      .replace(/\{\{fiscal_year\}\}/g, plan?.fiscal_year || '')
      .replace(/\{\{version_number\}\}/g, String(plan?.current_version_number || 1))
      .replace(/\{\{approved_by\}\}/g, plan?.approved_by || '')
      .replace(/\{\{approved_date\}\}/g, plan?.approved_date ? formatDateForDisplay(plan.approved_date) : '')
      .replace(/\{\{board_committee_name\}\}/g, plan?.board_committee_name || '')
      .replace(/\{\{recipient_name\}\}/g, recipientName || '');
  };

  const handleSend = async () => {
    if (!canSend || recipients.length === 0) {
      toast({ title: 'Cannot Send', description: 'Ensure plan is approved, final artifact exists, and recipients are added.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      for (const recipient of recipients) {
        const resolvedSubject = resolveMergeFields(subject, recipient.name);
        const resolvedBody = resolveMergeFields(messageBody, recipient.name);

        // Log distribution
        await createLog.mutateAsync({
          plan_id: planId,
          artifact_id: selectedArtifactId || null,
          recipient_name: recipient.name,
          recipient_email: recipient.email,
          recipient_type: recipient.type,
          subject: resolvedSubject,
          message_body: resolvedBody,
          send_status: 'Pending',
          sent_by: userCode || 'system',
        });

        // Invoke send-notification
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              recipient_email: recipient.email,
              subject: resolvedSubject,
              body: `<p>${resolvedBody.replace(/\n/g, '</p><p>')}</p>`,
              from_name: 'SSBM Internal Audit',
            },
          });
        } catch {
          // Non-critical, logged as pending
        }
      }

      toast({ title: 'Distribution Complete', description: `Sent to ${recipients.length} recipient(s).` });
      setRecipients([]);
    } catch (err: any) {
      toast({ title: 'Send Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const logColumns: DataTableColumn<any>[] = [
    { key: 'recipient_name', header: 'Recipient', render: (r) => r.recipient_name || r.recipient_email },
    { key: 'recipient_type', header: 'Type', render: (r) => <StatusBadge status={r.recipient_type || 'external'} /> },
    { key: 'subject', header: 'Subject', render: (r) => <span className="text-sm truncate max-w-[200px] block">{r.subject}</span> },
    { key: 'send_status', header: 'Status', render: (r) => <StatusBadge status={r.send_status || 'Pending'} /> },
    { key: 'sent_by', header: 'Sent By', render: (r) => r.sent_by || '—' },
    { key: 'created_at', header: 'Date', render: (r) => r.created_at ? formatDateForDisplay(r.created_at) : '—' },
  ];

  return (
    <div className="space-y-4">
      {!canSend && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-800">
              {!isApproved ? 'Plan must be approved before distribution.' : 'Generate and finalize a board pack artifact before distributing.'}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Compose Distribution</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Recipients */}
          <div className="space-y-2">
            <Label>Recipients</Label>
            {recipients.map((r, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 border rounded text-sm">
                <span className="flex-1">{r.name} ({r.email})</span>
                <StatusBadge status={r.type} />
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeRecipient(idx)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input placeholder="Name" value={newRecipient.name} onChange={e => setNewRecipient(p => ({ ...p, name: e.target.value }))} className="flex-1" />
              <Input placeholder="Email" value={newRecipient.email} onChange={e => setNewRecipient(p => ({ ...p, email: e.target.value }))} className="flex-1" />
              <Select value={newRecipient.type} onValueChange={v => setNewRecipient(p => ({ ...p, type: v }))}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                  <SelectItem value="board">Board</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={addRecipient}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} />
          </div>

          {/* Merge Fields */}
          <div className="flex flex-wrap gap-1">
            {MERGE_FIELDS.map(f => (
              <Button key={f} variant="outline" size="sm" className="h-6 text-xs" onClick={() => insertMergeField(f)}>{f}</Button>
            ))}
          </div>

          {/* Message Body */}
          <div className="space-y-2">
            <Label>Message Body</Label>
            <Textarea value={messageBody} onChange={e => setMessageBody(e.target.value)} rows={5} placeholder="Dear {{recipient_name}},\n\nPlease find attached the Annual Audit Plan..." />
          </div>

          {/* Artifact Selection */}
          {finalArtifacts.length > 0 && (
            <div className="space-y-2">
              <Label>Attach Final Artifact</Label>
              <Select value={selectedArtifactId} onValueChange={setSelectedArtifactId}>
                <SelectTrigger><SelectValue placeholder="Select artifact" /></SelectTrigger>
                <SelectContent>
                  {finalArtifacts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.file_name} (v{a.version_number})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSend} disabled={!canSend || recipients.length === 0 || sending}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send to {recipients.length} Recipient(s)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Distribution History</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={logColumns} data={logs} emptyMessage="No distributions sent yet." />
        </CardContent>
      </Card>
    </div>
  );
}
