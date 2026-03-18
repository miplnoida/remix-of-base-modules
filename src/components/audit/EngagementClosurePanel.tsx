import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Lock } from 'lucide-react';
import { useEngagementClosure, useEngagementClosureMutations, useEngagementLifecycle } from '@/hooks/useEngagementClosure';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  engagementId: string;
  findingsCount: number;
  openFindingsCount: number;
  responsesCount: number;
  actionsCount: number;
  verifiedActionsCount: number;
  documentsCount: number;
  lifecycleStatus: string;
}

const RATINGS = ['Satisfactory', 'Needs Improvement', 'Unsatisfactory'];

export function EngagementClosurePanel({
  engagementId,
  findingsCount,
  openFindingsCount,
  responsesCount,
  actionsCount,
  verifiedActionsCount,
  documentsCount,
  lifecycleStatus,
}: Props) {
  const { data: closure, isLoading } = useEngagementClosure(engagementId);
  const { upsert } = useEngagementClosureMutations();
  const { transition } = useEngagementLifecycle();
  const [rating, setRating] = React.useState('');
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    if (closure) {
      setRating(closure.final_audit_rating || '');
      setNotes(closure.review_notes || '');
    }
  }, [closure]);

  const allFindingsResolved = openFindingsCount === 0;
  const allResponsesComplete = findingsCount > 0 ? responsesCount >= findingsCount : true;
  const allDocsUploaded = documentsCount > 0;
  const isCompleted = lifecycleStatus?.toLowerCase() === 'completed';
  const isClosure = lifecycleStatus?.toLowerCase() === 'closure';

  const canClose = allFindingsResolved && allResponsesComplete && allDocsUploaded && rating && isClosure;

  const validationItems = [
    { label: 'All findings resolved or accepted', ok: allFindingsResolved, detail: `${openFindingsCount} open of ${findingsCount}` },
    { label: 'Management responses complete', ok: allResponsesComplete, detail: `${responsesCount} of ${findingsCount}` },
    { label: 'Documentation uploaded', ok: allDocsUploaded, detail: `${documentsCount} documents` },
    { label: 'Final audit rating set', ok: !!rating, detail: rating || 'Not set' },
  ];

  const handleSave = () => {
    upsert.mutate({
      engagement_id: engagementId,
      review_notes: notes,
      final_audit_rating: rating,
      all_findings_resolved: allFindingsResolved,
      all_docs_uploaded: allDocsUploaded,
      all_responses_completed: allResponsesComplete,
      qa_review_status: canClose ? 'Approved' : 'Pending',
    });
  };

  const handleClose = () => {
    upsert.mutate({
      engagement_id: engagementId,
      review_notes: notes,
      final_audit_rating: rating,
      all_findings_resolved: allFindingsResolved,
      all_docs_uploaded: allDocsUploaded,
      all_responses_completed: allResponsesComplete,
      qa_review_status: 'Approved',
      closure_status: 'Closed',
      closed_date: new Date().toISOString(),
    });
    transition.mutate({ engagementId, status: 'Completed' });
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading closure data...</div>;

  return (
    <div className="space-y-4">
      {isCompleted && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-primary/10 border border-primary/20">
          <Lock className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">This engagement is closed and read-only.</span>
          {closure?.final_audit_rating && <Badge variant="outline">{closure.final_audit_rating}</Badge>}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Closure Validation Checklist</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {validationItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                {item.ok ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                <span className="text-sm">{item.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{item.detail}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Final Audit Rating</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select value={rating} onValueChange={setRating} disabled={isCompleted}>
            <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
            <SelectContent>
              {RATINGS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Closure review notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isCompleted}
            rows={4}
          />
          {!isCompleted && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSave} disabled={upsert.isPending}>
                Save Draft
              </Button>
              <Button onClick={handleClose} disabled={!canClose || upsert.isPending || transition.isPending}>
                Close Engagement
              </Button>
            </div>
          )}
          {!canClose && !isCompleted && isClosure && (
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              Resolve all validation items before closing.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
