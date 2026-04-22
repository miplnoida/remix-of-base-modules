import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ConsoleLayout from './ConsoleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { ENDPOINT_CATALOG, type CatalogEndpoint } from './endpointCatalog';
import { useTestContext, getLastAccessToken } from './useTestContext';
import { useTestRunner } from './useTestRunner';
import ResponseInspector from './ResponseInspector';

export default function ComplianceRunner() {
  const ctx = useTestContext();
  const { run, isRunning, lastResult } = useTestRunner();
  const [params] = useSearchParams();
  const [endpointId, setEndpointId] = useState<string>(params.get('endpoint') || ENDPOINT_CATALOG[0].id);
  const endpoint: CatalogEndpoint = useMemo(() => ENDPOINT_CATALOG.find((e) => e.id === endpointId) || ENDPOINT_CATALOG[0], [endpointId]);

  const [pathValues, setPathValues] = useState<Record<string, string>>({});
  const [bodyText, setBodyText] = useState<string>('');
  const [token, setToken] = useState<string>(getLastAccessToken() || '');
  const [requestPreview, setRequestPreview] = useState<any>(null);

  useEffect(() => {
    setBodyText(endpoint.sampleBody ? JSON.stringify(endpoint.sampleBody, null, 2) : '');
    setPathValues({});
  }, [endpointId]);

  const buildUrl = () => {
    if (!ctx.env) return '';
    let p = endpoint.path;
    (endpoint.pathParams || []).forEach((k) => {
      p = p.replace(`{${k}}`, encodeURIComponent(pathValues[k] || `{${k}}`));
    });
    return `${ctx.env.edge_functions_url}${p}`;
  };

  const execute = async () => {
    if (!ctx.env) { toast.error('No environment selected'); return; }
    if (endpoint.destructive && !ctx.env.destructive_allowed) { toast.error('Destructive endpoints are disabled in this environment'); return; }
    for (const k of endpoint.pathParams || []) {
      if (!pathValues[k]) { toast.error(`Path parameter "${k}" is required`); return; }
    }
    const apiKey = endpoint.requiresApiKey ? await ctx.getApiKeyPlaintext() : null;
    if (endpoint.requiresApiKey && !apiKey) { toast.error('Could not resolve API key'); return; }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;
    if (endpoint.requiresAuth) {
      if (!token) { toast.error('Bearer token required — get one from Auth Test Lab'); return; }
      headers['Authorization'] = `Bearer ${token}`;
    }

    let body: any = undefined;
    if (endpoint.method !== 'GET' && bodyText.trim()) {
      try { body = JSON.parse(bodyText); }
      catch { toast.error('Body is not valid JSON'); return; }
    }

    const url = buildUrl();
    setRequestPreview({ method: endpoint.method, url, headers, body });
    await run({ method: endpoint.method, url, headers, body, expectedStatus: endpoint.expectedStatus, testName: endpoint.name, environmentId: ctx.env.id, apiKeyId: ctx.selectedKeyId });
  };

  return (
    <ConsoleLayout>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compliance API Test Runner</CardTitle>
            {ctx.env && <p className="text-xs text-muted-foreground">Active env: <Badge style={{ backgroundColor: ctx.env.color_hex, color: 'white' }}>{ctx.env.label}</Badge></p>}
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Endpoint</Label>
              <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={endpointId} onChange={(e) => setEndpointId(e.target.value)}>
                {ENDPOINT_CATALOG.map((e) => (
                  <option key={e.id} value={e.id}>[{e.method}] {e.name}</option>
                ))}
              </select>
              <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
                <Badge variant="outline" className="font-mono">{endpoint.method}</Badge>
                <code className="break-all text-muted-foreground">{endpoint.path}</code>
                {endpoint.destructive && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="mr-1 h-3 w-3" />destructive</Badge>}
              </div>
              <p className="mt-1 text-xs">{endpoint.description}</p>
            </div>

            {(endpoint.pathParams || []).map((k) => (
              <div key={k}>
                <Label className="text-xs">Path param: {`{${k}}`}</Label>
                <Input value={pathValues[k] || ''} onChange={(e) => setPathValues((prev) => ({ ...prev, [k]: e.target.value }))} className="mt-1 h-9" />
              </div>
            ))}

            {endpoint.requiresAuth && (
              <div>
                <Label className="text-xs">Bearer token (auto-filled from Auth Lab)</Label>
                <Input value={token} onChange={(e) => setToken(e.target.value)} className="mt-1 h-9 font-mono text-xs" placeholder="paste token or run Auth Lab login" />
              </div>
            )}

            {endpoint.method !== 'GET' && (
              <div>
                <Label className="text-xs">Request body (JSON)</Label>
                <Textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={10} className="mt-1 font-mono text-xs" />
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{endpoint.expectedStatus ? `Expects HTTP ${endpoint.expectedStatus}` : 'No expected status set'}</p>
              <Button onClick={execute} disabled={isRunning || !ctx.env}>
                <PlayCircle className="mr-1 h-4 w-4" /> {isRunning ? 'Running…' : 'Run request'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <ResponseInspector result={lastResult} requestPreview={requestPreview} expectedStatus={endpoint.expectedStatus} />
      </div>
    </ConsoleLayout>
  );
}
