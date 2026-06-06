import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useExternalTasks } from './externalHooks';
import { Inbox } from 'lucide-react';

interface Props { basePath: string }

const STATUS_COLOR: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'default', SUBMITTED: 'outline', ACCEPTED: 'secondary', REJECTED: 'destructive', EXPIRED: 'destructive', CANCELLED: 'secondary',
};

export function ExternalTaskList({ basePath }: Props) {
  const { data, isLoading, error } = useExternalTasks();
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (error) return <Alert variant="destructive"><AlertTitle>Could not load tasks</AlertTitle><AlertDescription>{(error as Error).message}</AlertDescription></Alert>;
  const tasks = data?.tasks ?? [];
  if (!tasks.length) return (
    <Card><CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground"><Inbox className="h-8 w-8" /><p className="text-sm">No tasks assigned to you right now.</p></CardContent></Card>
  );
  return (
    <div className="grid gap-3">
      {tasks.map((t: any) => (
        <Link key={t.id} to={`${basePath}/${t.id}`}>
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">{t.task_title}</CardTitle>
                <CardDescription className="text-xs">{t.task_type} · Due {t.due_at ? new Date(t.due_at).toLocaleDateString() : 'no due date'}</CardDescription>
              </div>
              <Badge variant={STATUS_COLOR[t.status] ?? 'outline'}>{t.status}</Badge>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">{t.task_description}</CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
