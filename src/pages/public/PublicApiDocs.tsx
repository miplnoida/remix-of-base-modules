import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ChevronRight, Globe, Copy, Check, ExternalLink, Code, FileText, Clock, Play, Loader2, AlertCircle, KeyRound, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface RegistryApi {
  id: string;
  api_name: string;
  api_version: string;
  http_method: string;
  endpoint_path: string;
  description: string | null;
  requires_auth: boolean;
  rate_limit_override: number | null;
  is_enabled: boolean;
  category: string | null;
  sort_order: number | null;
  updated_at: string;
}

interface RequestField {
  id: string;
  api_id: string;
  field_name: string;
  data_type: string;
  is_required: boolean;
  location: string;
  sample_value: string | null;
  description: string | null;
  display_order: number;
}

interface ResponseField {
  id: string;
  api_id: string;
  field_name: string;
  data_type: string;
  description: string | null;
  sample_value: string | null;
  display_order: number;
}

interface ExecutionResult {
  status_code: number;
  response: unknown;
  execution_time_ms: number;
  is_success: boolean;
  error_message: string | null;
}

interface KeyValidationResult {
  valid: boolean;
  app_name?: string;
  key_prefix?: string;
  permitted_apis?: RegistryApi[];
  error?: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  PUT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

function normalizeGroup(cat: string | null): string {
  return (cat || 'General').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

function useBaseUrl() {
  return useQuery({
    queryKey: ['public-api-base-url'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'public_api_base_url')
          .maybeSingle();
        if (!error && data?.setting_value) return data.setting_value;
      } catch {
        // ignore – fall back to env var
      }
      const url = import.meta.env.VITE_SUPABASE_URL;
      return url ? `${url}/functions/v1/public-api` : '';
    },
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}

function useRequestFields(apiId: string | null) {
  return useQuery({
    queryKey: ['public-api-request-fields', apiId],
    queryFn: async () => {
      if (!apiId) return [];
      const { data, error } = await supabase
        .from('external_api_request_fields')
        .select('*')
        .eq('api_id', apiId)
        .order('display_order');
      if (error) return [];
      return data as RequestField[];
    },
    enabled: !!apiId,
    staleTime: 5 * 60 * 1000,
  });
}

function useResponseFields(apiId: string | null) {
  return useQuery({
    queryKey: ['public-api-response-fields', apiId],
    queryFn: async () => {
      if (!apiId) return [];
      const { data, error } = await supabase
        .from('external_api_response_fields')
        .select('*')
        .eq('api_id', apiId)
        .order('display_order');
      if (error) return [];
      return data as ResponseField[];
    },
    enabled: !!apiId,
    staleTime: 5 * 60 * 1000,
  });
}

function buildFullUrl(baseUrl: string, endpointPath: string) {
  return `${baseUrl}${endpointPath}`;
}

function buildCurl(api: RegistryApi, baseUrl: string) {
  const url = buildFullUrl(baseUrl, api.endpoint_path);
  let curl = `curl -X ${api.http_method} "${url}"`;
  if (api.requires_auth) {
    curl += ` \\\n  -H "x-api-key: <your_api_key>"`;
  }
  curl += ` \\\n  -H "Content-Type: application/json"`;
  return curl;
}

function buildHttpRequest(api: RegistryApi, baseUrl: string) {
  const url = buildFullUrl(baseUrl, api.endpoint_path);
  let req = `${api.http_method} ${url} HTTP/1.1`;
  req += `\nHost: ${new URL(baseUrl).host}`;
  req += `\nContent-Type: application/json`;
  if (api.requires_auth) {
    req += `\nx-api-key: <your_api_key>`;
  }
  return req;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-xs overflow-x-auto font-mono whitespace-pre-wrap break-all text-foreground">{code}</pre>
    </div>
  );
}

function JsonViewer({ data, level = 0 }: { data: unknown; level?: number }) {
  const [collapsed, setCollapsed] = useState(level > 1);

  if (data === null || data === undefined) return <span className="text-muted-foreground">null</span>;
  if (typeof data === 'string') return <span className="text-emerald-600 dark:text-emerald-400">"{data}"</span>;
  if (typeof data === 'number') return <span className="text-blue-600 dark:text-blue-400">{data}</span>;
  if (typeof data === 'boolean') return <span className="text-amber-600 dark:text-amber-400">{String(data)}</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span>[]</span>;
    return (
      <span>
        <button onClick={() => setCollapsed(!collapsed)} className="text-muted-foreground hover:text-foreground">
          {collapsed ? '▶' : '▼'} [{data.length}]
        </button>
        {!collapsed && (
          <div className="ml-4 border-l border-border pl-2">
            {data.map((item, i) => (
              <div key={i}><JsonViewer data={item} level={level + 1} />{i < data.length - 1 && ','}</div>
            ))}
          </div>
        )}
      </span>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) return <span>{'{}'}</span>;
    return (
      <span>
        <button onClick={() => setCollapsed(!collapsed)} className="text-muted-foreground hover:text-foreground">
          {collapsed ? '▶' : '▼'} {'{'}...{'}'}
        </button>
        {!collapsed && (
          <div className="ml-4 border-l border-border pl-2">
            {entries.map(([key, value], i) => (
              <div key={key}>
                <span className="text-purple-600 dark:text-purple-400">"{key}"</span>: <JsonViewer data={value} level={level + 1} />
                {i < entries.length - 1 && ','}
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  return <span>{String(data)}</span>;
}

function ExecuteApiSection({ api, userApiKey }: { api: RegistryApi; userApiKey: string }) {
  const { data: requestFields } = useRequestFields(api.id);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const pathParams = api.endpoint_path.match(/\{(\w+)\}/g)?.map(p => p.replace(/[{}]/g, '')) || [];

  const effectiveFields = useMemo(() => {
    const fields: RequestField[] = [...(requestFields || [])];
    pathParams.forEach((param, idx) => {
      if (!fields.some(f => f.field_name === param && f.location === 'path')) {
        fields.push({
          id: `auto-path-${param}`,
          api_id: api.id,
          field_name: param,
          data_type: 'string',
          is_required: true,
          location: 'path',
          sample_value: null,
          description: `Path parameter: ${param}`,
          display_order: idx,
        });
      }
    });
    if (api.http_method === 'GET' && !fields.some(f => f.location === 'query')) {
      fields.push({
        id: 'auto-search',
        api_id: api.id,
        field_name: 'search',
        data_type: 'string',
        is_required: false,
        location: 'query',
        sample_value: '',
        description: 'Filter results by search term (case-insensitive)',
        display_order: 100,
      });
    }
    return fields;
  }, [requestFields, pathParams, api]);

  const handleFieldChange = useCallback((fieldName: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldName]: value }));
    setValidationErrors(prev => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

  const handleExecute = async () => {
    const errors: Record<string, string> = {};
    effectiveFields.forEach(f => {
      if (f.is_required && !fieldValues[f.field_name]?.trim()) {
        errors[f.field_name] = `${f.field_name} is required`;
      }
    });
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setExecuting(true);
    setResult(null);
    setValidationErrors({});

    try {
      const queryParams: Record<string, string> = {};
      const pathParamsObj: Record<string, string> = {};
      const headerParams: Record<string, string> = {};

      effectiveFields.forEach(f => {
        const val = fieldValues[f.field_name];
        if (!val) return;
        if (f.location === 'query') queryParams[f.field_name] = val;
        else if (f.location === 'path') pathParamsObj[f.field_name] = val;
        else if (f.location === 'header') headerParams[f.field_name] = val;
      });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/public-api-execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
        },
        body: JSON.stringify({
          api_registry_id: api.id,
          query_params: queryParams,
          path_params: pathParamsObj,
          headers: headerParams,
          api_key: userApiKey || undefined,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({
        status_code: 0,
        response: { error: err instanceof Error ? err.message : 'Unknown error' },
        execution_time_ms: 0,
        is_success: false,
        error_message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setExecuting(false);
    }
  };

  const groupedFields = useMemo(() => {
    const groups: Record<string, RequestField[]> = {};
    effectiveFields.forEach(f => {
      const loc = f.location || 'query';
      if (!groups[loc]) groups[loc] = [];
      groups[loc].push(f);
    });
    return groups;
  }, [effectiveFields]);

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
      <div className="flex items-center gap-2">
        <Play className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Execute API</h4>
      </div>

      <div className="p-3 rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          <KeyRound className="h-3 w-3 inline mr-1" />
          Your authenticated API key will be used automatically for this request.
        </p>
      </div>

      {Object.entries(groupedFields).map(([location, fields]) => (
        <div key={location} className="space-y-3">
          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {location} Parameters
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fields.map(field => (
              <div key={field.id} className="space-y-1">
                <Label className="text-xs">
                  {field.field_name}
                  {field.is_required && <span className="text-destructive ml-0.5">*</span>}
                  <span className="text-muted-foreground ml-1">({field.data_type})</span>
                </Label>
                {field.data_type === 'boolean' ? (
                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      checked={fieldValues[field.field_name] === 'true'}
                      onCheckedChange={checked => handleFieldChange(field.field_name, String(checked))}
                    />
                    <span className="text-xs text-muted-foreground">{field.description}</span>
                  </div>
                ) : field.data_type === 'json' ? (
                  <Textarea
                    placeholder={field.sample_value || '{}'}
                    value={fieldValues[field.field_name] || ''}
                    onChange={e => handleFieldChange(field.field_name, e.target.value)}
                    className={cn('font-mono text-xs min-h-[80px]', validationErrors[field.field_name] && 'border-destructive')}
                  />
                ) : field.data_type === 'date' ? (
                  <DatePicker
                    date={fieldValues[field.field_name] ? new Date(fieldValues[field.field_name]) : undefined}
                    onDateChange={d => handleFieldChange(field.field_name, d ? d.toISOString().split('T')[0] : '')}
                    className={cn(validationErrors[field.field_name] && 'border-destructive')}
                  />
                ) : (
                  <Input
                    type={field.data_type === 'number' ? 'number' : 'text'}
                    placeholder={field.sample_value || field.description || ''}
                    value={fieldValues[field.field_name] || ''}
                    onChange={e => handleFieldChange(field.field_name, e.target.value)}
                    className={cn(validationErrors[field.field_name] && 'border-destructive')}
                  />
                )}
                {field.description && field.data_type !== 'boolean' && (
                  <p className="text-[10px] text-muted-foreground">{field.description}</p>
                )}
                {validationErrors[field.field_name] && (
                  <p className="text-xs text-destructive">{validationErrors[field.field_name]}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <Button onClick={handleExecute} disabled={executing} className="w-full">
        {executing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
        {executing ? 'Executing...' : 'Execute'}
      </Button>

      {result && (
        <div className="space-y-3 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={cn(
              'text-xs px-2 py-1',
              result.is_success
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
            )}>
              Status: {result.status_code || 'N/A'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              <Clock className="h-3 w-3 inline mr-1" />
              {result.execution_time_ms}ms
            </span>
          </div>

          {result.error_message && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-destructive">Error</p>
                <p className="text-xs text-destructive/80">{result.error_message}</p>
              </div>
            </div>
          )}

          <div className="rounded-lg border bg-muted/30 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
              <span className="text-xs font-medium text-muted-foreground">Response Body</span>
              <CopyButton text={JSON.stringify(result.response, null, 2)} />
            </div>
            <div className="p-4 text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto">
              <JsonViewer data={result.response} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ApiDetailPanel({ api, baseUrl, userApiKey }: { api: RegistryApi; baseUrl: string; userApiKey: string }) {
  const fullUrl = buildFullUrl(baseUrl, api.endpoint_path);
  const curlExample = useMemo(() => buildCurl(api, baseUrl), [api, baseUrl]);
  const httpExample = useMemo(() => buildHttpRequest(api, baseUrl), [api, baseUrl]);
  const { data: requestFields } = useRequestFields(api.id);
  const { data: responseFields } = useResponseFields(api.id);

  const pathParams = api.endpoint_path.match(/\{(\w+)\}/g)?.map(p => p.replace(/[{}]/g, '')) || [];

  const sampleResponse = useMemo(() => {
    if (responseFields && responseFields.length > 0) {
      const obj: Record<string, unknown> = {};
      responseFields.forEach(f => {
        try {
          obj[f.field_name] = f.sample_value ? JSON.parse(f.sample_value) : null;
        } catch {
          obj[f.field_name] = f.sample_value;
        }
      });
      return JSON.stringify({ success: true, data: [obj], count: 1 }, null, 2);
    }
    return JSON.stringify({
      success: true,
      data: [{ code: "SAMPLE_CODE", description: "Sample Description" }],
      count: 1
    }, null, 2);
  }, [responseFields]);

  const sampleRequest = useMemo(() => {
    if (!requestFields || requestFields.length === 0) return null;
    const bodyFields = requestFields.filter(f => f.location === 'body');
    if (bodyFields.length === 0) return null;
    const obj: Record<string, unknown> = {};
    bodyFields.forEach(f => {
      try {
        obj[f.field_name] = f.sample_value ? JSON.parse(f.sample_value) : null;
      } catch {
        obj[f.field_name] = f.sample_value;
      }
    });
    return JSON.stringify(obj, null, 2);
  }, [requestFields]);

  return (
    <div className="space-y-6 p-6 border rounded-lg bg-card">
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge className={cn('text-xs font-bold uppercase px-3 py-1', METHOD_COLORS[api.http_method] || 'bg-muted')}>
            {api.http_method}
          </Badge>
          <h2 className="text-xl font-bold text-foreground">{api.api_name}</h2>
          <Badge variant="outline" className="text-xs">{api.api_version}</Badge>
        </div>
        {api.description && <p className="text-sm text-muted-foreground">{api.description}</p>}
        <div className="flex items-center gap-2 text-xs">
          <code className="bg-muted px-2 py-1 rounded font-mono text-foreground break-all">{fullUrl}</code>
          <CopyButton text={fullUrl} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={api.requires_auth ? 'default' : 'secondary'} className="text-xs">
            {api.requires_auth ? '🔒 API Key Required' : '🌐 Public'}
          </Badge>
          {api.rate_limit_override && (
            <Badge variant="outline" className="text-xs">Rate Limit: {api.rate_limit_override}/min</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Last updated: {format(new Date(api.updated_at), 'dd MMM yyyy')}
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="details" className="flex-1"><FileText className="h-3.5 w-3.5 mr-1.5" />Request</TabsTrigger>
          <TabsTrigger value="response" className="flex-1"><FileText className="h-3.5 w-3.5 mr-1.5" />Response</TabsTrigger>
          <TabsTrigger value="examples" className="flex-1"><Code className="h-3.5 w-3.5 mr-1.5" />Examples</TabsTrigger>
          <TabsTrigger value="execute" className="flex-1"><Play className="h-3.5 w-3.5 mr-1.5" />Try It</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          {api.requires_auth && (
            <div className="p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">Authentication</h4>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Include your API key in the <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">x-api-key</code> request header.
              </p>
            </div>
          )}

          {pathParams.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Path Parameters</h4>
              <Table>
                <TableHeader><TableRow><TableHead>Parameter</TableHead><TableHead>Type</TableHead><TableHead>Required</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
                <TableBody>
                  {pathParams.map(param => {
                    const configured = requestFields?.find(f => f.field_name === param && f.location === 'path');
                    return (
                      <TableRow key={param}>
                        <TableCell className="font-mono text-xs font-medium">{param}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{configured?.data_type || 'string'}</Badge></TableCell>
                        <TableCell><Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs">Required</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{configured?.description || 'Path parameter'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {requestFields && requestFields.filter(f => f.location !== 'path').length > 0 && (
            <>
              {['query', 'header', 'body'].map(loc => {
                const locFields = requestFields.filter(f => f.location === loc);
                if (locFields.length === 0) return null;
                return (
                  <div key={loc} className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground capitalize">{loc} Parameters</h4>
                    <Table>
                      <TableHeader><TableRow><TableHead>Field</TableHead><TableHead>Type</TableHead><TableHead>Required</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {locFields.map(f => (
                          <TableRow key={f.id}>
                            <TableCell className="font-mono text-xs font-medium">{f.field_name}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{f.data_type}</Badge></TableCell>
                            <TableCell>{f.is_required ? <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs">Required</Badge> : <span className="text-xs text-muted-foreground">Optional</span>}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{f.description}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </>
          )}

          {(!requestFields || requestFields.filter(f => f.location === 'query').length === 0) && api.http_method === 'GET' && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Query Parameters</h4>
              <Table>
                <TableHeader><TableRow><TableHead>Parameter</TableHead><TableHead>Type</TableHead><TableHead>Required</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono text-xs font-medium">search</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">string</Badge></TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">Optional</span></TableCell>
                    <TableCell className="text-xs text-muted-foreground">Filter results by search term (case-insensitive)</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          {sampleRequest && <CodeBlock code={sampleRequest} label="Sample Request Body (JSON)" />}

          {api.http_method === 'GET' && !sampleRequest && (
            <p className="text-sm text-muted-foreground italic">This is a GET endpoint — no request body required.</p>
          )}
        </TabsContent>

        <TabsContent value="response" className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Response Structure</h4>
            <Table>
              <TableHeader><TableRow><TableHead>Field</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs font-medium">success</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">boolean</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">Whether the request was successful</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs font-medium">data</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">array</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">Array of result objects</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs font-medium">count</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">number</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">Total number of results</TableCell>
                </TableRow>
                {responseFields && responseFields.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs font-medium">data[].{f.field_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{f.data_type}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{f.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">HTTP Status Codes</h4>
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
              <TableBody>
                {[
                  ['200', 'Success'],
                  ['401', 'Unauthorized — missing or invalid API key'],
                  ['403', 'Forbidden — API key lacks scope'],
                  ['404', 'Endpoint not found or disabled'],
                  ['429', 'Rate limit exceeded'],
                ].map(([code, desc]) => (
                  <TableRow key={code}>
                    <TableCell><Badge variant="outline">{code}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{desc}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <CodeBlock code={sampleResponse} label="Sample Success Response (JSON)" />
        </TabsContent>

        <TabsContent value="examples" className="space-y-4">
          <CodeBlock code={curlExample} label="cURL" />
          <CodeBlock code={httpExample} label="HTTP Request" />
          {api.http_method === 'GET' && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Example URL with search</p>
              <div className="flex items-center gap-2">
                <code className="bg-muted px-3 py-1.5 rounded text-xs font-mono flex-1 text-foreground break-all">
                  {fullUrl}?search=example
                </code>
                <CopyButton text={`${fullUrl}?search=example`} />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="execute" className="space-y-4">
          <ExecuteApiSection api={api} userApiKey={userApiKey} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── API Key Entry Gate ──
function ApiKeyGate({ onValidated }: { onValidated: (key: string, result: KeyValidationResult) => void }) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmedKey = apiKeyInput.trim();
    if (!trimmedKey) {
      setError('Please enter an API key');
      return;
    }

    setValidating(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/public-api-validate-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
        },
        body: JSON.stringify({ api_key: trimmedKey }),
      });

      const data: KeyValidationResult = await response.json();

      if (!data.valid) {
        setError(data.error || 'Invalid API key');
        return;
      }

      onValidated(trimmedKey, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate API key');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b bg-card shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Globe className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Public API Documentation</h1>
              <p className="text-xs text-muted-foreground">Enter your API key to browse available endpoints</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">API Key Required</h2>
            <p className="text-sm text-muted-foreground">
              Enter your API key to view the endpoints you have access to. Only APIs permitted by your key will be displayed.
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="api-key-input" className="text-sm font-medium">API Key</Label>
            <Input
              id="api-key-input"
              type="password"
              placeholder="Enter your API key..."
              value={apiKeyInput}
              onChange={e => { setApiKeyInput(e.target.value); setError(null); }}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              className={cn(error && 'border-destructive focus-visible:ring-destructive')}
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="text-xs">{error}</p>
              </div>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={validating} className="w-full">
            {validating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
            {validating ? 'Validating...' : 'Validate & Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──
export default function PublicApiDocs() {
  const { data: baseUrl } = useBaseUrl();
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  // API key state
  const [userApiKey, setUserApiKey] = useState<string | null>(null);
  const [appName, setAppName] = useState<string | null>(null);
  const [keyPrefix, setKeyPrefix] = useState<string | null>(null);
  const [apis, setApis] = useState<RegistryApi[] | null>(null);

  const handleKeyValidated = useCallback((key: string, result: KeyValidationResult) => {
    setUserApiKey(key);
    setAppName(result.app_name || null);
    setKeyPrefix(result.key_prefix || null);
    setApis(result.permitted_apis || []);
    setSelectedApiId(null);
    setOpenGroups(new Set());
  }, []);

  const handleSwitchKey = useCallback(() => {
    setUserApiKey(null);
    setAppName(null);
    setKeyPrefix(null);
    setApis(null);
    setSelectedApiId(null);
    setOpenGroups(new Set());
  }, []);

  // Group APIs
  const grouped = useMemo(() => {
    if (!apis) return {};
    const g: Record<string, RegistryApi[]> = {};
    apis.forEach(a => {
      const group = normalizeGroup(a.category);
      if (!g[group]) g[group] = [];
      g[group].push(a);
    });
    return g;
  }, [apis]);

  // Auto-open all groups when apis load
  useMemo(() => {
    if (apis && apis.length > 0 && openGroups.size === 0) {
      setOpenGroups(new Set(Object.keys(grouped)));
    }
  }, [apis, grouped]);

  const selectedApi = apis?.find(a => a.id === selectedApiId) || null;

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  };

  // If no API key yet, show the gate
  if (!userApiKey || !apis) {
    return <ApiKeyGate onValidated={handleKeyValidated} />;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b bg-card shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-7 w-7 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Public API Documentation</h1>
                <p className="text-xs text-muted-foreground">
                  Authenticated as <span className="font-semibold text-foreground">{appName}</span>
                  {keyPrefix && <span className="text-muted-foreground"> ({keyPrefix}...)</span>}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleSwitchKey}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Switch API Key
            </Button>
          </div>
          {baseUrl && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Base URL:</span>
              <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono text-foreground select-all">{baseUrl}</code>
              <CopyButton text={baseUrl} />
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 h-full">
          {apis.length === 0 && (
            <div className="text-center py-20">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No APIs are available for this API key.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleSwitchKey}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Try a Different Key
              </Button>
            </div>
          )}

          {apis.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full py-4">
              <div className="lg:col-span-3 flex flex-col min-h-0">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 shrink-0">
                  {apis.length} API{apis.length !== 1 ? 's' : ''} Available
                </h3>
                <ScrollArea className="flex-1">
                  <div className="space-y-2 pr-3">
                    {Object.entries(grouped).map(([group, groupApis]) => (
                      <Collapsible key={group} open={openGroups.has(group)} onOpenChange={() => toggleGroup(group)}>
                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left">
                          {openGroups.has(group) ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                          <span className="font-semibold text-sm text-foreground">{group}</span>
                          <Badge variant="secondary" className="ml-auto text-xs">{groupApis.length}</Badge>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-6 space-y-1 mt-1">
                          {groupApis.map(api => (
                            <button
                              key={api.id}
                              onClick={() => setSelectedApiId(api.id)}
                              className={cn(
                                'flex items-center gap-2 w-full p-2 rounded-md text-left transition-colors text-sm',
                                selectedApiId === api.id
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 font-semibold'
                                  : 'hover:bg-muted/50'
                              )}
                            >
                              <Badge className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 shrink-0', METHOD_COLORS[api.http_method] || 'bg-muted')}>
                                {api.http_method}
                              </Badge>
                              <span className="truncate">{api.api_name}</span>
                            </button>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="lg:col-span-9 min-h-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="pr-3">
                    {selectedApi && baseUrl ? (
                      <ApiDetailPanel api={selectedApi} baseUrl={baseUrl} userApiKey={userApiKey} />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-card">
                        <ExternalLink className="h-10 w-10 text-muted-foreground/40 mb-4" />
                        <p className="text-muted-foreground font-medium">Select an API from the list to view its documentation</p>
                        <p className="text-xs text-muted-foreground mt-1">Browse request models, response structures, and test endpoints</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
