/**
 * Phase F — Officer-side viewer for online employer submissions
 * (responses & disputes) attached to a single finding. Lets the officer
 * mark them under-review / accepted / rejected, and add reviewer notes.
 */
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import {
  useFindingResponseSubmissions,
  useFindingDisputeSubmissions,
  useUpdateResponseSubmissionStatus,
  useUpdateDisputeSubmissionStatus,
} from '@/hooks/useAuditPublicSubmissions';
import { useUserCode } from '@/hooks/useUserCode';
import { formatDateForDisplay } from '@/lib/format-config';
import { toast } from 'sonner';
import type { FindingResponseStatus, FindingDisputeStatus } from '@/types/auditPublicSubmissions';

const RESPONSE_STATUSES: FindingResponseStatus[] = ['RECEIVED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];
const DISPUTE_STATUSES: FindingDisputeStatus[] = ['RECEIVED', 'UNDER_REVIEW', 'UPHELD', 'REJECTED', 'WITHDRAWN'];

interface Props {
  findingId: string;
}

export function FindingOnlineSubmissions({ findingId }: Props) {
  const { userCode } = useUserCode();
  const [expanded, setExpanded] = useState(false);
  const { data: responses = [] } = useFindingResponseSubmissions(findingId);
  const { data: disputes = [] } = useFindingDisputeSubmissions(findingId);

  const total = responses.length + disputes.length;
  if (total === 0) return null;

  return (
    <div className="mt-3 rounded-md border bg-muted/20">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/40 rounded-md"
      >
        <span className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Employer submissions online
          {responses.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{responses.length} response{responses.length === 1 ? '' : 's'}</Badge>
          )}
          {disputes.length > 0 && (
            <Badge variant="destructive" className="text-[10px]">{disputes.length} dispute{disputes.length === 1 ? '' : 's'}</Badge>
          )}
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {responses.map((r) => (
            <SubmissionRow
              key={r.id}
              kind="response"
              header={`Response by ${r.submitter_name}`}
              meta={`${formatDateForDisplay(r.submitted_at)}${r.submitter_designation ? ` • ${r.submitter_designation}` : ''}`}
              body={r.response_text}
              status={r.status}
              statuses={RESPONSE_STATUSES}
              reviewerNotes={r.reviewer_notes}
              onUpdate={(status, notes) => ({ id: r.id, status, notes })}
              tableKind="response"
              userCode={userCode}
            />
          ))}
          {disputes.map((d) => (
            <SubmissionRow
              key={d.id}
              kind="dispute"
              header={`Dispute: ${d.dispute_reason}`}
              meta={`${formatDateForDisplay(d.submitted_at)} • by ${d.submitter_name}${d.submitter_designation ? ` (${d.submitter_designation})` : ''}`}
              body={d.dispute_details}
              evidenceUrl={d.evidence_url}
              status={d.status}
              statuses={DISPUTE_STATUSES}
              reviewerNotes={d.reviewer_notes}
              onUpdate={(status, notes) => ({ id: d.id, status, notes })}
              tableKind="dispute"
              userCode={userCode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RowProps {
  kind: 'response' | 'dispute';
  header: string;
  meta: string;
  body: string;
  evidenceUrl?: string | null;
  status: string;
  statuses: string[];
  reviewerNotes: string | null;
  onUpdate: (status: string, notes: string) => { id: string; status: string; notes: string };
  tableKind: 'response' | 'dispute';
  userCode: string | null;
}

function SubmissionRow({
  kind, header, meta, body, evidenceUrl, status, statuses, reviewerNotes, onUpdate, tableKind, userCode,
}: RowProps) {
  const [editing, setEditing] = useState(false);
  const [newStatus, setNewStatus] = useState(status);
  const [notes, setNotes] = useState(reviewerNotes ?? '');
  const updateResponse = useUpdateResponseSubmissionStatus();
  const updateDispute = useUpdateDisputeSubmissionStatus();

  const handleSave = async () => {
    const payload = onUpdate(newStatus, notes);
    try {
      if (tableKind === 'response') {
        await updateResponse.mutateAsync({
          id: payload.id,
          status: payload.status as FindingResponseStatus,
          reviewerNotes: payload.notes || undefined,
          reviewedBy: userCode || undefined,
        });
      } else {
        await updateDispute.mutateAsync({
          id: payload.id,
          status: payload.status as FindingDisputeStatus,
          reviewerNotes: payload.notes || undefined,
          reviewedBy: userCode || undefined,
        });
      }
      toast.success('Updated');
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update');
    }
  };

  return (
    <div className="rounded-md border bg-background p-2.5 text-sm">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          {kind === 'dispute' ? (
            <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
          ) : (
            <MessageSquare className="h-4 w-4 text-primary shrink-0" />
          )}
          <span className="font-medium truncate">{header}</span>
        </div>
        <Badge variant="outline">{status}</Badge>
      </div>
      <p className="text-xs text-muted-foreground mb-1">{meta}</p>
      <p className="whitespace-pre-wrap text-sm">{body}</p>
      {evidenceUrl && (
        <a href={evidenceUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
          Supporting evidence
        </a>
      )}
      {reviewerNotes && !editing && (
        <div className="mt-2 rounded bg-muted/50 p-2 text-xs">
          <span className="font-semibold">Officer note: </span>{reviewerNotes}
        </div>
      )}
      {editing ? (
        <div className="mt-2 space-y-2 border-t pt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reviewer notes (optional)"
              className="md:col-span-2 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={updateResponse.isPending || updateDispute.isPending}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Update status
          </Button>
        </div>
      )}
    </div>
  );
}
