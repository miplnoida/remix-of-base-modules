import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, FolderKanban, Inbox } from 'lucide-react';
import { useMatters, useWorkbaskets } from '@/hooks/legal-advanced/useLegalAdvancedData';

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function LADashboard() {
  const { data: matters = [], isLoading } = useMatters();
  const { data: workbaskets = [] } = useWorkbaskets();

  const draft = matters.filter((m) => m.status === 'DRAFT').length;
  const open = matters.filter((m) => ['SUBMITTED', 'ACCEPTED', 'IN_PROGRESS', 'PENDING_REVIEW'].includes(m.status)).length;
  const closed = matters.filter((m) => m.status === 'CLOSED').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Legal Advanced Dashboard</h1>
          <p className="text-sm text-muted-foreground">Matter framework overview</p>
        </div>
        <Button asChild>
          <Link to="/legal-advanced/intake">
            <Plus className="h-4 w-4 mr-2" /> New Matter
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Matters" value={isLoading ? '…' : matters.length} />
        <StatCard label="Draft" value={isLoading ? '…' : draft} />
        <StatCard label="Open" value={isLoading ? '…' : open} />
        <StatCard label="Closed" value={isLoading ? '…' : closed} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderKanban className="h-4 w-4" /> Recent Matters
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/legal-advanced/matters">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : matters.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No matters yet.</p>
            ) : (
              matters.slice(0, 6).map((m) => (
                <Link
                  key={m.id}
                  to={`/legal-advanced/matters/${m.id}`}
                  className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-accent transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{m.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.matter_no} • {m.category}
                    </div>
                  </div>
                  <Badge variant="outline">{m.status}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox className="h-4 w-4" /> Workbaskets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {workbaskets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No workbaskets configured.</p>
            ) : (
              workbaskets.map((wb: any) => {
                const count = matters.filter((m) => m.current_workbasket_id === wb.id).length;
                return (
                  <Link
                    key={wb.id}
                    to={`/legal-advanced/workbaskets?wb=${wb.id}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-accent transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium">{wb.display_name}</div>
                      <div className="text-xs text-muted-foreground">{wb.code}</div>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
