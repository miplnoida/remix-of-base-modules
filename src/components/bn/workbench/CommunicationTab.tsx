import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, MessageSquare, FileText, Bell, AlertTriangle, RefreshCw, Printer, Send, CheckCircle2, XCircle, Clock } from 'lucide-react';
import {
  useBnClaimCommunicationHistory,
  useBnTriggerCommunication,
  useBnUpdateLetterStatus,
  useBnRetryCommunication,
} from '@/hooks/bn/useBnClaimCommunication';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';

import { formatAuditTimestamp } from '@/lib/culture/culture';
interface Props { claimId: string; productVersionId?: string; }

const STATUS_TONE: Record<string, string> = {
  SENT: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
  QUEUED: 'bg-blue-500/15 text-blue-700 border-blue-300',
  RETRYING: 'bg-amber-500/15 text-amber-700 border-amber-300',
  DELIVERED: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
  FAILED: 'bg-destructive/15 text-destructive border-destructive/40',
  SKIPPED: 'bg-muted text-muted-foreground border-border',
  DRAFT: 'bg-muted text-muted-foreground border-border',
  GENERATED: 'bg-blue-500/15 text-blue-700 border-blue-300',
  PENDING_APPROVAL: 'bg-amber-500/15 text-amber-700 border-amber-300',
  APPROVED_TO_PRINT: 'bg-indigo-500/15 text-indigo-700 border-indigo-300',
  PRINTED: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
  DISPATCHED: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
  RETURNED: 'bg-destructive/15 text-destructive border-destructive/40',
  CANCELLED: 'bg-muted text-muted-foreground border-border',
};

const channelIcon = (ch: string) => {
  if (ch === 'EMAIL' || ch === 'INTERNAL_EMAIL') return <Mail className="h-3.5 w-3.5" />;
  if (ch === 'SMS') return <MessageSquare className="h-3.5 w-3.5" />;
  if (ch === 'LETTER') return <FileText className="h-3.5 w-3.5" />;
  return <Bell className="h-3.5 w-3.5" />;
};

const formatTime = (iso?: string) => (iso ? formatAuditTimestamp(iso) : '—');

export const CommunicationTab: React.FC<Props> = ({ claimId, productVersionId }) => {
  const { userCode: userCodeRaw } = useUserCode();
  const userCode = userCodeRaw || 'SYSTEM';
  const { data, isLoading } = useBnClaimCommunicationHistory(claimId);
  const trigger = useBnTriggerCommunication();
  const updateLetter = useBnUpdateLetterStatus();
  const retry = useBnRetryCommunication();
  const [subTab, setSubTab] = useState('timeline');

  const logs = data?.logs || [];
  const letters = data?.letters || [];

  const split = useMemo(() => {
    const dm = (l: any) => l.delivery_method || l.channel;
    const emails = logs.filter((l: any) => dm(l) === 'EMAIL' || dm(l) === 'INTERNAL_EMAIL');
    const sms = logs.filter((l: any) => dm(l) === 'SMS');
    const inapp = logs.filter((l: any) => dm(l) === 'IN_APP');
    const failed = logs.filter((l: any) => l.status === 'FAILED' || l.status === 'SKIPPED');
    return { emails, sms, inapp, failed };
  }, [logs]);

  const handleTrigger = async (eventCode: string) => {
    try {
      const r = await trigger.mutateAsync({ eventCode, claimId, ctx: { userCode, productVersionId } });
      toast.success(`Dispatched ${r.dispatched}, skipped ${r.skipped}, failed ${r.failed}`);
    } catch (e: any) {
      toast.error(e?.message || 'Trigger failed');
    }
  };

  const handleLetterStatus = async (letterId: string, status: string) => {
    try {
      await updateLetter.mutateAsync({ letterId, newStatus: status, userCode });
      toast.success(`Letter → ${status}`);
    } catch (e: any) { toast.error(e?.message || 'Update failed'); }
  };

  const handleRetry = async (logId: string) => {
    try {
      await retry.mutateAsync({ logId, userCode });
      toast.success('Retry queued');
    } catch (e: any) { toast.error(e?.message || 'Retry failed'); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Claim Communications</CardTitle>
            <CardDescription>
              Event-driven communications. Delivery methods and templates are configured in Product Catalog → Communications.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => handleTrigger('bn.evidence.requested')}>
              <Mail className="h-3.5 w-3.5 mr-1.5" /> Request Evidence
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleTrigger('bn.claim.submitted')}>
              <Send className="h-3.5 w-3.5 mr-1.5" /> Send Acknowledgement
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleTrigger('bn.life_certificate.due')}>
              <Bell className="h-3.5 w-3.5 mr-1.5" /> Life Certificate Reminder
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="timeline">Timeline ({logs.length})</TabsTrigger>
          <TabsTrigger value="letters">Letters ({letters.length})</TabsTrigger>
          <TabsTrigger value="emails">Emails ({split.emails.length})</TabsTrigger>
          <TabsTrigger value="sms">SMS ({split.sms.length})</TabsTrigger>
          <TabsTrigger value="inapp">In-App ({split.inapp.length})</TabsTrigger>
          <TabsTrigger value="failed" className="text-destructive">Failed ({split.failed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <LogList rows={logs} loading={isLoading} onRetry={handleRetry} />
        </TabsContent>
        <TabsContent value="letters" className="mt-4">
          <LetterList rows={letters} onUpdate={handleLetterStatus} />
        </TabsContent>
        <TabsContent value="emails" className="mt-4">
          <LogList rows={split.emails} loading={isLoading} onRetry={handleRetry} />
        </TabsContent>
        <TabsContent value="sms" className="mt-4">
          <LogList rows={split.sms} loading={isLoading} onRetry={handleRetry} />
        </TabsContent>
        <TabsContent value="inapp" className="mt-4">
          <LogList rows={split.inapp} loading={isLoading} onRetry={handleRetry} />
        </TabsContent>
        <TabsContent value="failed" className="mt-4">
          <LogList rows={split.failed} loading={isLoading} onRetry={handleRetry} highlightFailed />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const LogList: React.FC<{ rows: any[]; loading?: boolean; onRetry: (id: string) => void; highlightFailed?: boolean }> = ({ rows, loading, onRetry, highlightFailed }) => {
  if (loading) return <p className="text-sm text-muted-foreground p-4">Loading…</p>;
  if (!rows.length) return <p className="text-sm text-muted-foreground p-4">No communications recorded.</p>;
  return (
    <div className="rounded-md border divide-y">
      {rows.map((r) => {
        const dm = r.delivery_method || r.channel;
        return (
        <div key={r.id} className="p-3 flex flex-col md:flex-row md:items-center gap-3 text-sm">
          <div className="flex items-center gap-2 min-w-[160px]">
            {channelIcon(dm)}
            <span className="font-medium">{dm}</span>
            <Badge variant="outline" className={STATUS_TONE[r.status] || ''}>{r.status}</Badge>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs text-muted-foreground">{r.event_code}</p>
            <p className="truncate"><span className="text-muted-foreground">To {r.recipient_type}:</span> {r.recipient_address || '—'}</p>
            {r.subject && <p className="text-xs text-muted-foreground truncate">{r.subject}</p>}
            {r.error_message && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                <AlertTriangle className="h-3 w-3" /> {r.error_message}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span><Clock className="h-3 w-3 inline mr-1" />{formatTime(r.created_at)}</span>
            {(r.status === 'FAILED' || r.status === 'SKIPPED') && (
              <Button size="sm" variant="outline" onClick={() => onRetry(r.id)}>
                <RefreshCw className="h-3 w-3 mr-1" /> Retry
              </Button>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
};

const NEXT_STATUS: Record<string, { label: string; next: string }[]> = {
  DRAFT: [{ label: 'Generate', next: 'GENERATED' }, { label: 'Cancel', next: 'CANCELLED' }],
  GENERATED: [{ label: 'Send for Approval', next: 'PENDING_APPROVAL' }, { label: 'Approve to Print', next: 'APPROVED_TO_PRINT' }, { label: 'Cancel', next: 'CANCELLED' }],
  PENDING_APPROVAL: [{ label: 'Approve to Print', next: 'APPROVED_TO_PRINT' }, { label: 'Cancel', next: 'CANCELLED' }],
  APPROVED_TO_PRINT: [{ label: 'Mark Printed', next: 'PRINTED' }],
  PRINTED: [{ label: 'Mark Dispatched', next: 'DISPATCHED' }],
  DISPATCHED: [{ label: 'Mark Delivered', next: 'DELIVERED' }, { label: 'Mark Returned', next: 'RETURNED' }],
};

const LetterList: React.FC<{ rows: any[]; onUpdate: (id: string, next: string) => void }> = ({ rows, onUpdate }) => {
  if (!rows.length) return <p className="text-sm text-muted-foreground p-4">No letters generated yet.</p>;
  return (
    <div className="rounded-md border divide-y">
      {rows.map((l) => (
        <div key={l.id} className="p-3 flex flex-col md:flex-row md:items-center gap-3 text-sm">
          <div className="flex items-center gap-2 min-w-[180px]">
            <FileText className="h-4 w-4" />
            <Badge variant="outline" className={STATUS_TONE[l.status] || ''}>{l.status.replace(/_/g, ' ')}</Badge>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs text-muted-foreground">{l.event_code}</p>
            <p className="truncate"><span className="text-muted-foreground">{l.recipient_type}:</span> {l.recipient_name || '—'}</p>
            {l.subject && <p className="text-xs text-muted-foreground truncate">{l.subject}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span><Clock className="h-3 w-3 inline mr-1" />{formatTime(l.created_at)}</span>
            {(NEXT_STATUS[l.status] || []).map(s => (
              <Button key={s.next} size="sm" variant="outline" onClick={() => onUpdate(l.id, s.next)}>
                {s.next === 'PRINTED' ? <Printer className="h-3 w-3 mr-1" /> : s.next === 'CANCELLED' ? <XCircle className="h-3 w-3 mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                {s.label}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CommunicationTab;
