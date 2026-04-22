import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { formatDateForDisplay } from '@/lib/format-config';

/**
 * Magic-link landing page used from approval emails.
 * URL: /approval/decide?t=<token>&i=<approve|reject>
 *
 * The token alone authorises the decision (single-use, expiring) — no app
 * session is required. The page validates the token, shows context, and
 * lets the approver confirm or add notes before posting back.
 */
export default function PlannerApprovalDecidePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('t') ?? '';
  const intent = (params.get('i') as 'approve' | 'reject') ?? 'approve';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | 'APPROVED' | 'REJECTED'>(null);

  useEffect(() => {
    if (!token) {
      setError('Missing token');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const url = `https://${projectId}.supabase.co/functions/v1/planner-approval-decide?t=${encodeURIComponent(token)}&i=${intent}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to load approval');
        setInfo(data);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [token, intent]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: invErr } = await supabase.functions.invoke(
        'planner-approval-decide',
        { body: { token, intent, notes: notes.trim() || undefined } },
      );
      if (invErr) throw invErr;
      if ((data as any)?.error) throw new Error((data as any).error);
      setDone((data as any).status);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-muted/30">
      <Card className="max-w-xl w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {intent === 'approve' ? (
              <><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Approve planner action</>
            ) : (
              <><XCircle className="h-5 w-5 text-destructive" /> Reject planner action</>
            )}
          </CardTitle>
          <CardDescription>
            One-click decision from your email. This link is single-use and expires.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5" /> <span>{error}</span>
            </div>
          )}
          {done && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md p-3 text-sm">
              Decision recorded: <strong>{done}</strong>. The requester has been notified by email.
            </div>
          )}

          {info?.approval && !done && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Employer</div>
                <div className="font-medium">{info.approval.employer_id}</div>
                <div className="text-muted-foreground">Week of</div>
                <div className="font-medium">{formatDateForDisplay(info.approval.week_start_date)}</div>
                <div className="text-muted-foreground">Action</div>
                <div className="font-medium">{info.approval.action_type}</div>
                <div className="text-muted-foreground">Requested by</div>
                <div className="font-medium">{info.approval.requested_by_user_code}</div>
                {info.approval.exception_category && (
                  <>
                    <div className="text-muted-foreground">Category</div>
                    <div className="font-medium">{info.approval.exception_category}</div>
                  </>
                )}
                {info.approval.capacity_impact_hours > 0 && (
                  <>
                    <div className="text-muted-foreground">Capacity impact</div>
                    <div className="font-medium">{info.approval.capacity_impact_hours}h</div>
                  </>
                )}
              </div>
              {info.approval.exception_justification && (
                <div className="bg-muted rounded-md p-3 text-sm">
                  <div className="font-medium mb-1">Justification</div>
                  <p>{info.approval.exception_justification}</p>
                </div>
              )}

              {info.alreadyDecided && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-3 text-sm">
                  This request has already been {info.approval.status.toLowerCase()}.
                </div>
              )}
              {info.alreadyUsed && !info.alreadyDecided && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-3 text-sm">
                  This link has already been used.
                </div>
              )}

              {!info.alreadyDecided && !info.alreadyUsed && (
                <>
                  <Textarea
                    placeholder={intent === 'reject' ? 'Reason for rejection (required)' : 'Optional notes'}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={submit}
                      disabled={submitting || (intent === 'reject' && !notes.trim())}
                      variant={intent === 'reject' ? 'destructive' : 'default'}
                    >
                      {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Confirm {intent === 'approve' ? 'approval' : 'rejection'}
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/')}>Cancel</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
