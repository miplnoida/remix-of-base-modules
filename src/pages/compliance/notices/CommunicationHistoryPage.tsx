/**
 * Communication History — chronological union of notices, correspondence,
 * employer responses, scoped by employer or case.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageSquare, Loader2, Search } from 'lucide-react';
import { fetchCommunicationHistory } from '@/services/noticeWorkflowService';
import { isComplianceFeatureEnabled } from '@/lib/compliance/featureToggles';

const MODULE = 'manage_compliance';

const CHANNEL_COLOR: Record<string, string> = {
  EMAIL: 'bg-blue-500/15 text-blue-700 border-blue-300',
  SMS: 'bg-purple-500/15 text-purple-700 border-purple-300',
  PORTAL: 'bg-cyan-500/15 text-cyan-700 border-cyan-300',
  CALL: 'bg-amber-500/15 text-amber-700 border-amber-300',
  POST: 'bg-slate-500/15 text-slate-700 border-slate-300',
  HAND_DELIVERY: 'bg-slate-500/15 text-slate-700 border-slate-300',
  NOTE: 'bg-muted text-muted-foreground',
  EMPLOYER_RESPONSE: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
};

export default function CommunicationHistoryPage() {
  const enabled = isComplianceFeatureEnabled('notices.communicationHistory');
  const [employerId, setEmployerId] = useState('');
  const [caseId, setCaseId] = useState('');
  const [applied, setApplied] = useState<{ employerId?: string; caseId?: string }>({});

  const { data = [], isLoading, isFetching } = useQuery({
    queryKey: ['ce_comm_history', applied],
    enabled: enabled && !!(applied.employerId || applied.caseId),
    queryFn: () => fetchCommunicationHistory(applied),
  });

  return (
    <PermissionWrapper moduleName={MODULE}>
      <div className="container mx-auto p-6 space-y-4">
        <PageHeader title="Communication History" description="Chronological view of notices, emails, portal messages, SMS, calls, and notes." icon={MessageSquare} />

        {!enabled ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Communication history is disabled in feature toggles.</CardContent></Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div>
                  <Label>Employer ID</Label>
                  <Input value={employerId} onChange={e => setEmployerId(e.target.value)} placeholder="e.g. E123456" />
                </div>
                <div>
                  <Label>Case ID (UUID)</Label>
                  <Input value={caseId} onChange={e => setCaseId(e.target.value)} placeholder="optional" />
                </div>
                <div>
                  <button
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm hover:opacity-90"
                    onClick={() => setApplied({ employerId: employerId || undefined, caseId: caseId || undefined })}>
                    <Search className="h-4 w-4" /> Load
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                {!applied.employerId && !applied.caseId ? (
                  <div className="p-10 text-center text-muted-foreground text-sm">Enter an employer ID or case ID to load history.</div>
                ) : isLoading || isFetching ? (
                  <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                ) : data.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground text-sm">No communication on record.</div>
                ) : (
                  <ul className="divide-y">
                    {data.map(e => (
                      <li key={e.id} className="p-4 flex items-start gap-3">
                        <Badge variant="outline" className={CHANNEL_COLOR[e.channel] || ''}>{e.channel}</Badge>
                        <Badge variant="outline">{e.direction}</Badge>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm truncate">{e.subject}</p>
                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                              {e.ts ? new Date(e.ts).toLocaleString('en-GB') : '—'}
                            </p>
                          </div>
                          {e.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">{e.body}</p>}
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Source: {e.source}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PermissionWrapper>
  );
}
