import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Copy, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { RunResult } from './types';

interface Props {
  result: RunResult | null;
  requestPreview: { method: string; url: string; headers: Record<string, string>; body?: any } | null;
  expectedStatus?: number;
}

export default function ResponseInspector({ result, requestPreview, expectedStatus }: Props) {
  if (!result && !requestPreview) {
    return (
      <Card className="flex h-full min-h-[300px] items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Run a request to see the response.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Tabs defaultValue="response">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3">
          <TabsList className="border-b-0 bg-transparent">
            <TabsTrigger value="response">Response</TabsTrigger>
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="result">Result</TabsTrigger>
          </TabsList>
          {result && (
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span>{result.durationMs}ms</span>
              <ResultPill result={result.result} status={result.status} />
            </div>
          )}
        </div>

        <TabsContent value="response" className="m-0 p-0">
          <pre className="max-h-[480px] overflow-auto bg-background p-3 text-xs">
            {result ? JSON.stringify(result.responseBody, null, 2) : '—'}
          </pre>
          {result && (
            <div className="border-t border-border p-2 text-right">
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(JSON.stringify(result.responseBody, null, 2)); toast.success('Response copied'); }}>
                <Copy className="mr-1 h-3 w-3" /> Copy JSON
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="request" className="m-0 p-0">
          {requestPreview ? (
            <div className="space-y-3 p-3 text-xs">
              <div>
                <Badge variant="outline" className="font-mono">{requestPreview.method}</Badge>
                <code className="ml-2 break-all">{requestPreview.url}</code>
              </div>
              {requestPreview.body && (
                <div>
                  <p className="mb-1 text-muted-foreground">Body</p>
                  <pre className="max-h-[300px] overflow-auto rounded bg-muted p-2">{JSON.stringify(requestPreview.body, null, 2)}</pre>
                </div>
              )}
              <div>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(buildCurl(requestPreview)); toast.success('cURL copied'); }}>
                  <Copy className="mr-1 h-3 w-3" /> Copy as cURL
                </Button>
              </div>
            </div>
          ) : <p className="p-3 text-sm text-muted-foreground">—</p>}
        </TabsContent>

        <TabsContent value="headers" className="m-0 p-0">
          <div className="grid grid-cols-1 gap-3 p-3 text-xs lg:grid-cols-2">
            <div>
              <p className="mb-1 font-semibold">Request headers (masked)</p>
              <pre className="max-h-[300px] overflow-auto rounded bg-muted p-2">{requestPreview ? JSON.stringify(maskHeaders(requestPreview.headers), null, 2) : '—'}</pre>
            </div>
            <div>
              <p className="mb-1 font-semibold">Response headers</p>
              <pre className="max-h-[300px] overflow-auto rounded bg-muted p-2">{result ? JSON.stringify(result.responseHeaders, null, 2) : '—'}</pre>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="result" className="m-0 p-0">
          {result ? (
            <div className="space-y-2 p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Outcome:</span>
                <ResultPill result={result.result} status={result.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Stat label="HTTP status" value={result.status ?? '—'} />
                <Stat label="Expected" value={expectedStatus ?? '—'} />
                <Stat label="Duration" value={`${result.durationMs} ms`} />
                <Stat label="Logged execution" value={result.executionId ? result.executionId.slice(0, 8) + '…' : '—'} />
              </div>
              {result.failureReason && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                  <AlertTriangle className="mr-1 inline h-3 w-3" /> {result.failureReason}
                </div>
              )}
            </div>
          ) : <p className="p-3 text-sm text-muted-foreground">—</p>}
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded border border-border bg-muted/30 p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-mono text-xs">{value}</p>
    </div>
  );
}

function ResultPill({ result, status }: { result: string; status: number | null }) {
  if (result === 'pass') return <Badge className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" />PASS {status}</Badge>;
  if (result === 'fail') return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />FAIL {status}</Badge>;
  if (result === 'error') return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />ERROR</Badge>;
  return <Badge variant="outline">{result}</Badge>;
}

function maskHeaders(h: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h)) {
    const lower = k.toLowerCase();
    if (lower === 'authorization' || lower === 'x-api-key' || lower === 'apikey') {
      out[k] = v.length > 12 ? `${v.slice(0, 8)}…${v.slice(-4)}` : '••••';
    } else out[k] = v;
  }
  return out;
}

function buildCurl(req: { method: string; url: string; headers: Record<string, string>; body?: any }) {
  const parts = [`curl -X ${req.method} '${req.url}'`];
  for (const [k, v] of Object.entries(req.headers)) parts.push(`  -H '${k}: ${v}'`);
  if (req.body) parts.push(`  -d '${typeof req.body === 'string' ? req.body : JSON.stringify(req.body)}'`);
  return parts.join(' \\\n');
}
