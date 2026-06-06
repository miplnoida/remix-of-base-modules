import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';
import { ExternalTaskForm } from './ExternalTaskForm';
import { publicBenefitApi } from './publicBenefitApiClient';

/**
 * SecureTaskPage — one-time secure-link landing for external users who were
 * invited by email/SMS without a full portal account. The :token in the URL
 * is forwarded to the public-benefits edge function as `X-Task-Token`. The
 * backend resolves it to exactly one task and scopes every subsequent call
 * to that task only. Read-only once the task is closed.
 */
export default function SecureTaskPage() {
  const { token } = useParams<{ token: string }>();
  const [resolved, setResolved] = useState<{ taskId?: string; error?: string; loading: boolean }>(
    { loading: true },
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setResolved({ loading: false, error: 'Missing secure token in URL.' });
        return;
      }
      try {
        // listTasks with a task token returns only the single task it grants.
        const res = await publicBenefitApi.listTasks({ taskToken: token });
        if (cancelled) return;
        const task = res.tasks?.[0];
        if (!task) {
          setResolved({ loading: false, error: 'This link is invalid, has expired, or has already been used.' });
          return;
        }
        setResolved({ loading: false, taskId: task.id });
      } catch (e: any) {
        if (cancelled) return;
        setResolved({ loading: false, error: e?.message ?? 'Could not validate this link.' });
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold">Secure Task</span>
          <Badge variant="outline" className="ml-2 text-xs">EXTERNAL</Badge>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invited action</CardTitle>
            <CardDescription>
              You're accessing this task through a one-time secure link. No login is required;
              your access is scoped to this single task and is recorded for audit.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Reference token: <code className="text-xs">{token?.slice(0, 8)}…</code>
          </CardContent>
        </Card>

        {resolved.loading && <Skeleton className="h-64 w-full" />}
        {resolved.error && (
          <Alert variant="destructive">
            <AlertTitle>Link unavailable</AlertTitle>
            <AlertDescription>{resolved.error}</AlertDescription>
          </Alert>
        )}
        {resolved.taskId && (
          <ExternalTaskForm taskId={resolved.taskId} taskToken={token} />
        )}
      </main>
    </div>
  );
}
