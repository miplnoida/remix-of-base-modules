import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConsoleLayout from './ConsoleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ENDPOINT_CATALOG, GROUP_LABELS, type CatalogEndpoint } from './endpointCatalog';
import { BookOpen, Lock, KeyRound, AlertTriangle, PlayCircle, FileText } from 'lucide-react';

export default function EndpointExplorer() {
  const [filter, setFilter] = useState('');
  const [group, setGroup] = useState<string>('all');
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    return ENDPOINT_CATALOG.filter((e) => {
      if (group !== 'all' && e.group !== group) return false;
      if (!filter) return true;
      const f = filter.toLowerCase();
      return e.name.toLowerCase().includes(f) || e.path.toLowerCase().includes(f) || e.description.toLowerCase().includes(f);
    });
  }, [filter, group]);

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogEndpoint[]>();
    filtered.forEach((e) => {
      const g = e.group;
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(e);
    });
    return map;
  }, [filtered]);

  const openInRunner = (e: CatalogEndpoint) => {
    navigate(`/admin/api-test-console/runner?endpoint=${encodeURIComponent(e.id)}`);
  };

  return (
    <ConsoleLayout>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <CardTitle className="text-base">Endpoint Explorer</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Input placeholder="Search endpoint, path, description…" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 w-72" />
              <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={group} onChange={(e) => setGroup(e.target.value)}>
                <option value="all">All groups</option>
                {Object.entries(GROUP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{ENDPOINT_CATALOG.length} endpoints. Click "Open in Runner" to test any endpoint with full request/response inspection.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {Array.from(grouped.entries()).map(([g, items]) => (
            <div key={g}>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{GROUP_LABELS[g as CatalogEndpoint['group']]}</h3>
              <div className="space-y-2">
                {items.map((e) => (
                  <div key={e.id} className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="font-mono">{e.method}</Badge>
                          <span className="font-medium">{e.name}</span>
                          {e.requiresAuth && <span title="Requires Bearer JWT"><Lock className="h-3 w-3 text-muted-foreground" /></span>}
                          {e.requiresApiKey && <span title="Requires X-API-Key"><KeyRound className="h-3 w-3 text-muted-foreground" /></span>}
                          {e.destructive && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="mr-1 h-3 w-3" />destructive</Badge>}
                          {e.expectedStatus && <Badge variant="secondary" className="text-[10px]">expects {e.expectedStatus}</Badge>}
                        </div>
                        <code className="mt-1 block break-all text-xs text-muted-foreground">{e.path}</code>
                        <p className="mt-1 text-xs">{e.description}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button size="sm" onClick={() => openInRunner(e)}><PlayCircle className="mr-1 h-3 w-3" />Open in Runner</Button>
                        {e.sampleBody && (
                          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(JSON.stringify(e.sampleBody, null, 2)); }}>
                            <FileText className="mr-1 h-3 w-3" />Copy sample
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">No endpoints match your filter.</p>}
        </CardContent>
      </Card>
    </ConsoleLayout>
  );
}
