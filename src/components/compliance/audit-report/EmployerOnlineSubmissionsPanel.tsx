/**
 * Phase F — Public, token-gated panel that lets an employer respond to or
 * formally dispute a specific audit finding (or violation). Reuses the
 * tokenized acknowledgment link.
 */
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  submitFindingResponse,
  submitFindingDispute,
  listMySubmissions,
} from '@/services/auditPublicResponseService';
import type {
  FindingResponseSubmission,
  FindingDisputeSubmission,
} from '@/types/auditPublicSubmissions';
import type { InspectionFinding } from '@/types/inspectionTypes';
import { formatDateForDisplay } from '@/lib/format-config';

interface Props {
  token: string;
  inspectionId: string;
  findings: InspectionFinding[];
  acknowledgmentId?: string | null;
  defaultSubmitterName: string;
  defaultSubmitterEmail?: string;
  defaultSubmitterDesignation?: string;
  /** Phase 4 — gating from frozen snapshot. Defaults preserve old behavior. */
  allowResponse?: boolean;
  allowDispute?: boolean;
  allowUpload?: boolean;
}

const DISPUTE_REASONS = [
  'Factual inaccuracy',
  'Disagreement with calculation',
  'Records already submitted',
  'Outside applicable period',
  'Insufficient evidence',
  'Wrong employer attribution',
  'Other',
];

export function EmployerOnlineSubmissionsPanel({
  token,
  inspectionId,
  findings,
  acknowledgmentId,
  defaultSubmitterName,
  defaultSubmitterEmail,
  defaultSubmitterDesignation,
  allowResponse = true,
  allowDispute = true,
  allowUpload = true,
}: Props) {
  const initialMode: 'response' | 'dispute' = allowResponse ? 'response' : allowDispute ? 'dispute' : 'response';
  const [mode, setMode] = useState<'response' | 'dispute'>(initialMode);
  const [findingId, setFindingId] = useState<string>(findings[0]?.id ?? '');
  const [text, setText] = useState('');
  const [reason, setReason] = useState<string>(DISPUTE_REASONS[0]);
  const [submitterName, setSubmitterName] = useState(defaultSubmitterName);
  const [submitterDesignation, setSubmitterDesignation] = useState(defaultSubmitterDesignation ?? '');
  const [submitterEmail] = useState(defaultSubmitterEmail ?? '');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [responses, setResponses] = useState<FindingResponseSubmission[]>([]);
  const [disputes, setDisputes] = useState<FindingDisputeSubmission[]>([]);

  const loadHistory = async () => {
    try {
      const data = await listMySubmissions(token);
      setResponses(data.responses);
      setDisputes(data.disputes);
    } catch (e) {
      // silent — token already validated upstream
    }
  };

  useEffect(() => { loadHistory(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  const findingsById = useMemo(() => {
    const map = new Map<string, InspectionFinding>();
    findings.forEach((f) => map.set(f.id, f));
    return map;
  }, [findings]);

  const reset = () => {
    setText('');
    setEvidenceUrl('');
  };

  const handleSubmit = async () => {
    if (!findingId) return toast.error('Select a finding to address');
    if (!submitterName.trim()) return toast.error('Your name is required');
    if (!text.trim()) return toast.error(mode === 'response' ? 'Please enter your response' : 'Please describe the dispute');

    try {
      setSubmitting(true);
      if (mode === 'response') {
        await submitFindingResponse({
          token,
          inspectionId,
          findingId,
          acknowledgmentId,
          submitterName: submitterName.trim(),
          submitterDesignation: submitterDesignation.trim() || undefined,
          submitterEmail: submitterEmail || undefined,
          responseText: text.trim(),
        });
        toast.success('Response submitted to the audit officer.');
      } else {
        await submitFindingDispute({
          token,
          inspectionId,
          findingId,
          acknowledgmentId,
          submitterName: submitterName.trim(),
          submitterDesignation: submitterDesignation.trim() || undefined,
          submitterEmail: submitterEmail || undefined,
          disputeReason: reason,
          disputeDetails: text.trim(),
          evidenceUrl: evidenceUrl.trim() || undefined,
        });
        toast.success('Dispute submitted. The audit officer will review it.');
      }
      reset();
      await loadHistory();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (findings.length === 0) {
    return (
      <Card className="no-print">
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          No findings have been recorded for this audit yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="no-print">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" /> Respond or Dispute Findings
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Submit a response to acknowledge or clarify a finding, or formally dispute it. Submissions are recorded against this audit and reviewed by the audit officer.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={mode === 'response' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('response')}
          >
            <MessageSquare className="h-4 w-4 mr-1.5" /> Response
          </Button>
          <Button
            variant={mode === 'dispute' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('dispute')}
          >
            <ShieldAlert className="h-4 w-4 mr-1.5" /> Dispute
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Your name *</Label>
            <Input value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} />
          </div>
          <div>
            <Label>Designation</Label>
            <Input
              value={submitterDesignation}
              onChange={(e) => setSubmitterDesignation(e.target.value)}
              placeholder="e.g. HR Manager"
            />
          </div>
        </div>

        <div>
          <Label>Finding *</Label>
          <Select value={findingId} onValueChange={setFindingId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a finding" />
            </SelectTrigger>
            <SelectContent>
              {findings.map((f, i) => (
                <SelectItem key={f.id} value={f.id}>
                  Finding {i + 1}: {f.title || 'Untitled'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {mode === 'dispute' && (
          <>
            <div>
              <Label>Dispute reason *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISPUTE_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Evidence URL (optional)</Label>
              <Input
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://… link to supporting documents"
              />
            </div>
          </>
        )}

        <div>
          <Label>{mode === 'response' ? 'Your response *' : 'Dispute details *'}</Label>
          <Textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={mode === 'response'
              ? 'Provide your response, clarification, or planned corrective action…'
              : 'Explain why you dispute this finding and reference supporting facts.'}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : mode === 'response' ? 'Submit Response' : 'Submit Dispute'}
          </Button>
        </div>

        {(responses.length > 0 || disputes.length > 0) && (
          <div className="border-t pt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Submitted on this link
            </p>
            <div className="space-y-2">
              {responses.map((r) => {
                const f = findingsById.get(r.finding_id);
                return (
                  <div key={r.id} className="rounded-md border bg-muted/30 p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">RESPONSE</Badge>
                        <span className="font-medium">{f?.title ?? 'Finding'}</span>
                      </div>
                      <Badge variant="outline">{r.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {formatDateForDisplay(r.submitted_at)} • by {r.submitter_name}
                    </p>
                    <p className="whitespace-pre-wrap">{r.response_text}</p>
                    {r.reviewer_notes && (
                      <div className="mt-2 rounded bg-background border p-2 text-xs">
                        <span className="font-semibold">Officer note: </span>{r.reviewer_notes}
                      </div>
                    )}
                  </div>
                );
              })}
              {disputes.map((d) => {
                const f = d.finding_id ? findingsById.get(d.finding_id) : null;
                return (
                  <div key={d.id} className="rounded-md border bg-muted/30 p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-[10px]">DISPUTE</Badge>
                        <span className="font-medium">{f?.title ?? 'Violation/Finding'}</span>
                      </div>
                      <Badge variant="outline">{d.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {formatDateForDisplay(d.submitted_at)} • {d.dispute_reason} • by {d.submitter_name}
                    </p>
                    <p className="whitespace-pre-wrap">{d.dispute_details}</p>
                    {d.evidence_url && (
                      <a href={d.evidence_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                        Supporting evidence
                      </a>
                    )}
                    {d.reviewer_notes && (
                      <div className="mt-2 rounded bg-background border p-2 text-xs">
                        <span className="font-semibold">Officer note: </span>{d.reviewer_notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Submissions are visible to the audit officer.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
