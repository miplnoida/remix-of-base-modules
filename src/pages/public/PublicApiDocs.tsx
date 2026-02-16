import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ChevronRight, Globe, Copy, Check, ExternalLink, Code, FileText, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface PublicApi {
  id: string;
  api_code: string;
  api_name: string;
  api_group: string;
  description: string | null;
  http_method: string;
  endpoint_url: string;
  requires_auth: boolean;
  auth_type: string;
  version: string;
  updated_at: string;
}

interface RequestField {
  id: string;
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
  field_name: string;
  data_type: string;
  description: string | null;
  sample_value: string | null;
  display_order: number;
}

interface ChangeLog {
  id: string;
  version: string;
  change_description: string;
  changed_at: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  PUT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

function usePublicApis() {
  return useQuery({
    queryKey: ['public-apis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_api_master')
        .select('*')
        .eq('is_active', true)
        .eq('is_public', true)
        .order('api_group')
        .order('api_name');
      if (error) throw error;
      return data as PublicApi[];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

function usePublicApiDetails(apiId: string | null) {
  const requestFields = useQuery({
    queryKey: ['public-api-request-fields', apiId],
    queryFn: async () => {
      if (!apiId) return [];
      const { data, error } = await supabase
        .from('external_api_request_fields')
        .select('*')
        .eq('api_id', apiId)
        .order('display_order');
      if (error) throw error;
      return data as RequestField[];
    },
    enabled: !!apiId,
    staleTime: 5 * 60 * 1000,
  });

  const responseFields = useQuery({
    queryKey: ['public-api-response-fields', apiId],
    queryFn: async () => {
      if (!apiId) return [];
      const { data, error } = await supabase
        .from('external_api_response_fields')
        .select('*')
        .eq('api_id', apiId)
        .order('display_order');
      if (error) throw error;
      return data as ResponseField[];
    },
    enabled: !!apiId,
    staleTime: 5 * 60 * 1000,
  });

  const changeLogs = useQuery({
    queryKey: ['public-api-change-logs', apiId],
    queryFn: async () => {
      if (!apiId) return [];
      const { data, error } = await supabase
        .from('external_api_change_log')
        .select('*')
        .eq('api_id', apiId)
        .order('changed_at', { ascending: false });
      if (error) throw error;
      return data as ChangeLog[];
    },
    enabled: !!apiId,
    staleTime: 5 * 60 * 1000,
  });

  return { requestFields, responseFields, changeLogs };
}

function generateSampleJson(fields: { field_name: string; data_type: string; sample_value: string | null }[]) {
  const obj: Record<string, unknown> = {};
  fields.forEach((f) => {
    if (f.sample_value) {
      try { obj[f.field_name] = JSON.parse(f.sample_value); } catch { obj[f.field_name] = f.sample_value; }
    } else {
      const defaults: Record<string, unknown> = { string: '', number: 0, boolean: false, date: '2026-01-01', json: {} };
      obj[f.field_name] = defaults[f.data_type] ?? '';
    }
  });
  return JSON.stringify(obj, null, 2);
}

function buildExampleUrl(endpoint: string, fields: RequestField[]) {
  let url = endpoint;
  const pathFields = fields.filter(f => f.location === 'path');
  pathFields.forEach(f => { url = url.replace(`{${f.field_name}}`, f.sample_value || `<${f.field_name}>`); });
  const queryFields = fields.filter(f => f.location === 'query');
  if (queryFields.length > 0) {
    const qs = queryFields.map(f => `${f.field_name}=${encodeURIComponent(f.sample_value || `<${f.field_name}>`)}`).join('&');
    url += `?${qs}`;
  }
  return url;
}

function buildCurl(api: PublicApi, fields: RequestField[]) {
  const url = buildExampleUrl(api.endpoint_url, fields);
  let curl = `curl -X ${api.http_method} "${url}"`;
  const headerFields = fields.filter(f => f.location === 'header');
  headerFields.forEach(f => { curl += ` \\\n  -H "${f.field_name}: ${f.sample_value || '<value>'}"` });
  if (api.requires_auth) {
    if (api.auth_type === 'bearer_token') curl += ` \\\n  -H "Authorization: Bearer <your_token>"`;
    if (api.auth_type === 'api_key') curl += ` \\\n  -H "x-api-key: <your_api_key>"`;
  }
  const bodyFields = fields.filter(f => f.location === 'body');
  if (['POST', 'PUT'].includes(api.http_method) && bodyFields.length > 0) {
    curl += ` \\\n  -H "Content-Type: application/json"`;
    curl += ` \\\n  -d '${generateSampleJson(bodyFields)}'`;
  }
  return curl;
}

function buildHttpRequest(api: PublicApi, fields: RequestField[]) {
  const url = buildExampleUrl(api.endpoint_url, fields);
  let req = `${api.http_method} ${url} HTTP/1.1`;
  const headerFields = fields.filter(f => f.location === 'header');
  headerFields.forEach(f => { req += `\n${f.field_name}: ${f.sample_value || '<value>'}` });
  if (api.requires_auth) {
    if (api.auth_type === 'bearer_token') req += `\nAuthorization: Bearer <your_token>`;
    if (api.auth_type === 'api_key') req += `\nx-api-key: <your_api_key>`;
  }
  const bodyFields = fields.filter(f => f.location === 'body');
  if (['POST', 'PUT'].includes(api.http_method) && bodyFields.length > 0) {
    req += `\nContent-Type: application/json`;
    req += `\n\n${generateSampleJson(bodyFields)}`;
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

function ApiDetailPanel({ api }: { api: PublicApi }) {
  const { requestFields, responseFields, changeLogs } = usePublicApiDetails(api.id);
  const reqFields = requestFields.data || [];
  const resFields = responseFields.data || [];
  const logs = changeLogs.data || [];

  const groupedReqFields = useMemo(() => {
    const groups: Record<string, RequestField[]> = {};
    reqFields.forEach(f => {
      if (!groups[f.location]) groups[f.location] = [];
      groups[f.location].push(f);
    });
    return groups;
  }, [reqFields]);

  const sampleRequest = useMemo(() => {
    const bodyFields = reqFields.filter(f => f.location === 'body');
    return bodyFields.length > 0 ? generateSampleJson(bodyFields) : null;
  }, [reqFields]);

  const sampleResponse = useMemo(() => resFields.length > 0 ? generateSampleJson(resFields) : null, [resFields]);
  const curlExample = useMemo(() => buildCurl(api, reqFields), [api, reqFields]);
  const httpExample = useMemo(() => buildHttpRequest(api, reqFields), [api, reqFields]);
  const exampleUrl = useMemo(() => buildExampleUrl(api.endpoint_url, reqFields), [api, reqFields]);

  return (
    <div className="space-y-6 p-6 border rounded-lg bg-card">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge className={cn('text-xs font-bold uppercase px-3 py-1', METHOD_COLORS[api.http_method] || 'bg-muted')}>
            {api.http_method}
          </Badge>
          <h2 className="text-xl font-bold text-foreground">{api.api_name}</h2>
          <Badge variant="outline" className="text-xs">v{api.version}</Badge>
        </div>
        {api.description && <p className="text-sm text-muted-foreground">{api.description}</p>}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <code className="bg-muted px-2 py-1 rounded font-mono text-foreground">{api.endpoint_url}</code>
        </div>
        {api.requires_auth && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">🔒 Auth: {api.auth_type.replace('_', ' ')}</Badge>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Last updated: {format(new Date(api.updated_at), 'dd MMM yyyy')}
        </div>
      </div>

      {/* Example URL for GET endpoints */}
      {api.http_method === 'GET' && reqFields.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Example URL</p>
          <div className="flex items-center gap-2">
            <code className="bg-muted px-3 py-1.5 rounded text-xs font-mono flex-1 text-foreground break-all">{exampleUrl}</code>
            <CopyButton text={exampleUrl} />
          </div>
        </div>
      )}

      {/* Request & Response Models */}
      <Tabs defaultValue="request" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="request" className="flex-1"><FileText className="h-3.5 w-3.5 mr-1.5" />Request Model</TabsTrigger>
          <TabsTrigger value="response" className="flex-1"><FileText className="h-3.5 w-3.5 mr-1.5" />Response Model</TabsTrigger>
          <TabsTrigger value="examples" className="flex-1"><Code className="h-3.5 w-3.5 mr-1.5" />Examples</TabsTrigger>
          {logs.length > 0 && (
            <TabsTrigger value="changelog" className="flex-1"><Clock className="h-3.5 w-3.5 mr-1.5" />Changelog</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="request" className="space-y-4">
          {reqFields.length === 0 ? (
            <p className="text-sm text-muted-foreground italic p-4">No request parameters required.</p>
          ) : (
            Object.entries(groupedReqFields).map(([location, fields]) => (
              <div key={location} className="space-y-2">
                <h4 className="text-sm font-semibold capitalize text-foreground">{location} Parameters</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Example</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-mono text-xs font-medium">{f.field_name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{f.data_type}</Badge></TableCell>
                        <TableCell>{f.is_required ? <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs">Required</Badge> : <span className="text-xs text-muted-foreground">Optional</span>}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{f.description || '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{f.sample_value || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))
          )}
          {sampleRequest && <CodeBlock code={sampleRequest} label="Sample Request Body (JSON)" />}
        </TabsContent>

        <TabsContent value="response" className="space-y-4">
          {resFields.length === 0 ? (
            <p className="text-sm text-muted-foreground italic p-4">No response model defined.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Example</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resFields.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs font-medium">{f.field_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{f.data_type}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{f.description || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{f.sample_value || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {sampleResponse && <CodeBlock code={sampleResponse} label="Sample Response (JSON)" />}
        </TabsContent>

        <TabsContent value="examples" className="space-y-4">
          <CodeBlock code={curlExample} label="cURL" />
          <CodeBlock code={httpExample} label="HTTP Request" />
        </TabsContent>

        {logs.length > 0 && (
          <TabsContent value="changelog" className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-3 p-3 border rounded bg-muted/20">
                <Badge variant="outline" className="text-xs shrink-0">v{log.version}</Badge>
                <div className="flex-1">
                  <p className="text-sm text-foreground">{log.change_description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(log.changed_at), 'dd MMM yyyy HH:mm')}</p>
                </div>
              </div>
            ))}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default function PublicApiDocs() {
  const { data: apis, isLoading, error } = usePublicApis();
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    if (!apis) return {};
    const g: Record<string, PublicApi[]> = {};
    apis.forEach(a => {
      if (!g[a.api_group]) g[a.api_group] = [];
      g[a.api_group].push(a);
    });
    return g;
  }, [apis]);

  // Auto-open all groups on load
  useMemo(() => {
    if (apis && openGroups.size === 0) {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <Globe className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Public API Documentation</h1>
              <p className="text-sm text-muted-foreground">Browse available APIs, view request/response models, and get integration examples</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-destructive">Failed to load API documentation. Please try again later.</p>
          </div>
        )}

        {apis && apis.length === 0 && (
          <div className="text-center py-20">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No public APIs available at this time.</p>
          </div>
        )}

        {apis && apis.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: API list */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {apis.length} API{apis.length !== 1 ? 's' : ''} Available
              </h3>
              {Object.entries(grouped).map(([group, groupApis]) => (
                <Collapsible key={group} open={openGroups.has(group)} onOpenChange={() => toggleGroup(group)}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
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
                          'flex items-center gap-2 w-full p-2.5 rounded-md text-left transition-colors text-sm',
                          selectedApiId === api.id
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        <Badge className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 shrink-0', METHOD_COLORS[api.http_method] || 'bg-muted')}>
                          {api.http_method}
                        </Badge>
                        <span className="truncate font-medium">{api.api_name}</span>
                      </button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>

            {/* Right: Detail panel */}
            <div className="lg:col-span-2">
              {selectedApi ? (
                <ApiDetailPanel api={selectedApi} />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-card">
                  <ExternalLink className="h-10 w-10 text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground font-medium">Select an API from the list to view its documentation</p>
                  <p className="text-xs text-muted-foreground mt-1">Browse request models, response structures, and integration examples</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center text-xs text-muted-foreground">
          Documentation auto-generated from API configuration. Last refreshed automatically.
        </div>
      </footer>
    </div>
  );
}
