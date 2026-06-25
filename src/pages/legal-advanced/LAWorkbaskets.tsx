import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMatters, useWorkbaskets } from '@/hooks/legal-advanced/useLegalAdvancedData';

export default function LAWorkbaskets() {
  const [sp, setSp] = useSearchParams();
  const selected = sp.get('wb') || '';
  const { data: workbaskets = [], isLoading: wbLoading } = useWorkbaskets();
  const { data: matters = [], isLoading } = useMatters(selected ? { workbasket_id: selected } : {});

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Workbaskets</h1>
        <p className="text-sm text-muted-foreground">Matters grouped by routing queue</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Queues</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <button
              onClick={() => setSp({})}
              className={`w-full text-left rounded-md px-3 py-2 text-sm ${!selected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'}`}
            >
              All
            </button>
            {wbLoading ? <Skeleton className="h-8 w-full" /> :
              workbaskets.map((wb: any) => (
                <button
                  key={wb.id}
                  onClick={() => setSp({ wb: wb.id })}
                  className={`w-full text-left rounded-md px-3 py-2 text-sm ${selected === wb.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'}`}
                >
                  {wb.display_name}
                </button>
              ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Matters in Queue</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? <Skeleton className="h-24 w-full" /> :
              matters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No matters in this queue.</p>
              ) : matters.map((m) => (
                <Link
                  key={m.id}
                  to={`/legal-advanced/matters/${m.id}`}
                  className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-accent"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{m.title}</div>
                    <div className="text-xs text-muted-foreground">{m.matter_no} • {m.category}</div>
                  </div>
                  <Badge variant="outline">{m.status}</Badge>
                </Link>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
