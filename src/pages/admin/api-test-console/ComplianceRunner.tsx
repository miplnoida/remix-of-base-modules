import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ConsoleLayout from './ConsoleLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, AlertTriangle, RefreshCw, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { ENDPOINT_CATALOG, type CatalogEndpoint } from './endpointCatalog';
import { useTestContext, getLastAccessToken } from './useTestContext';
import { useTestRunner } from './useTestRunner';
import ResponseInspector from './ResponseInspector';

interface ApiSettingRow {
  id: string;
  setting_key: string;
  setting_name: string;
  base_url: string | null;
  linked_module: string | null;
  is_active: boolean | null;
}

function joinUrl(base: string, path: string): string {
  if (!base) return path;
  const b = base.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}

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

  // API Settings (used to resolve base URL automatically per endpoint)
  const [apiSettings, setApiSettings] = useState<ApiSettingRow[]>([]);
  const [overrideSettingId, setOverrideSettingId] = useState<string>('');
  const [urlOverride, setUrlOverride] = useState<string>(''); // user-edited final URL

  useEffect(() => {
    supabase
      .from('api_settings')
      .select('id, setting_key, setting_name, base_url, linked_module, is_active')
      .eq('is_active', true)
      .order('setting_name')
      .then(({ data }) => setApiSettings((data as any) || []));
  }, []);

  // Reset per-endpoint state on change
  useEffect(() => {
    setBodyText(endpoint.sampleBody ? JSON.stringify(endpoint.sampleBody, null, 2) : '');
    setPathValues({});
    setOverrideSettingId('');
    setUrlOverride('');
  }, [endpointId]);

  // The api_settings row that auto-applies to this endpoint (if any)
  const matchedSetting = useMemo(() => {
    if (!endpoint.apiSettingKey) return null;
    return apiSettings.find((s) => s.setting_key === endpoint.apiSettingKey) || null;
  }, [apiSettings, endpoint.apiSettingKey]);

  // The setting actually used (override > matched)
  const effectiveSetting = useMemo(() => {
    if (overrideSettingId) return apiSettings.find((s) => s.id === overrideSettingId) || null;
    return matchedSetting;
  }, [overrideSettingId, apiSettings, matchedSetting]);

  const baseUrlSource: 'override' | 'api_settings' | 'environment' | 'none' = useMemo(() => {
    if (urlOverride) return 'override';
    if (effectiveSetting?.base_url) return 'api_settings';
    if (ctx.env?.edge_functions_url) return 'environment';
    return 'none';
  }, [urlOverride, effectiveSetting, ctx.env]);

  const resolvedBaseUrl = useMemo(() => {
    if (effectiveSetting?.base_url) return effectiveSetting.base_url;
    return ctx.env?.edge_functions_url || '';
  }, [effectiveSetting, ctx.env]);

  const computedUrl = useMemo(() => {
    let p = endpoint.path;
    (endpoint.pathParams || []).forEach((k) => {
      p = p.replace(`{${k}}`, encodeURIComponent(pathValues[k] || `{${k}}`));
    });
    return joinUrl(resolvedBaseUrl, p);
  }, [endpoint, pathValues, resolvedBaseUrl]);

  const finalUrl = urlOverride || computedUrl;

  const execute = async () => {
    if (!finalUrl) { toast.error('No URL resolved. Configure an API setting or environment.'); return; }
    if (endpoint.destructive && ctx.env && !ctx.env.destructive_allowed) {
      toast.error('Destructive endpoints are disabled in this environment'); return;
    }
    for (const k of endpoint.pathParams || []) {
      if (!pathValues[k] && !urlOverride) { toast.error(`Path parameter "${k}" is required`); return; }
    }
    let apiKey: string | null = null;
    if (endpoint.requiresApiKey) {
      const res = await ctx.getApiKeyPlaintext();
      if (!res.key) { toast.error(res.error || 'Could not resolve API key — pick one in API Keys'); return; }
      apiKey = res.key;
    }

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

    setRequestPreview({ method: endpoint.method, url: finalUrl, headers, body });
    await run({
      method: endpoint.method,
      url: finalUrl,
      headers,
      body,
      expectedStatus: endpoint.expectedStatus,
      testName: endpoint.name,
      environmentId: ctx.env?.id ?? null,
      apiKeyId: ctx.selectedKeyId,
    });
  };

  return (
    <ConsoleLayout>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">API Test Runner</CardTitle>
            <p className="text-xs text-muted-foreground">
              The base URL is resolved automatically from <strong>API Settings</strong> when available, otherwise from the active <strong>Environment</strong>. You can override the final URL inline.
            </p>
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

            {/* Base URL resolution panel */}
            <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1"><Settings2 className="h-3 w-3" /> Base URL source</Label>
                <Badge variant={baseUrlSource === 'api_settings' ? 'default' : baseUrlSource === 'environment' ? 'secondary' : baseUrlSource === 'override' ? 'outline' : 'destructive'} className="text-[10px]">
                  {baseUrlSource === 'api_settings' && (effectiveSetting?.setting_name || 'API Settings')}
                  {baseUrlSource === 'environment' && (ctx.env?.label || 'Environment')}
                  {baseUrlSource === 'override' && 'Manual override'}
                  {baseUrlSource === 'none' && 'No URL configured'}
                </Badge>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Override with API setting</Label>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={overrideSettingId}
                  onChange={(e) => { setOverrideSettingId(e.target.value); setUrlOverride(''); }}
                >
                  <option value="">{matchedSetting ? `Auto: ${matchedSetting.setting_name}` : '— Use environment URL —'}</option>
                  {apiSettings.map((s) => (
                    <option key={s.id} value={s.id}>{s.setting_name} ({s.setting_key})</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs">Final URL (editable)</Label>
                <div className="mt-1 flex gap-1">
                  <Input
                    value={finalUrl}
                    onChange={(e) => setUrlOverride(e.target.value)}
                    className="h-9 font-mono text-xs"
                    placeholder="https://…/path"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={() => setUrlOverride('')} title="Reset to computed URL">
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
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
              <Button onClick={execute} disabled={isRunning || !finalUrl}>
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
