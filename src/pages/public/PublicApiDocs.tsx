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

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  PUT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

function useRegistryApis() {
  return useQuery({
    queryKey: ['public-registry-apis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_registry')
        .select('*')
        .eq('is_enabled', true)
        .order('sort_order')
        .order('api_name');
      if (error) throw error;
      return data as RegistryApi[];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

function useBaseUrl() {
  return useQuery({
    queryKey: ['public-api-base-url'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'public_api_base_url')
        .single();
      if (data) return data.setting_value;
      const url = import.meta.env.VITE_SUPABASE_URL;
      return url ? `${url}/functions/v1/public-api` : '';
    },
    staleTime: 10 * 60 * 1000,
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

function ApiDetailPanel({ api, baseUrl }: { api: RegistryApi; baseUrl: string }) {
  const fullUrl = buildFullUrl(baseUrl, api.endpoint_path);
  const curlExample = useMemo(() => buildCurl(api, baseUrl), [api, baseUrl]);
  const httpExample = useMemo(() => buildHttpRequest(api, baseUrl), [api, baseUrl]);

  // Check if endpoint has path params like {id}
  const pathParams = api.endpoint_path.match(/\{(\w+)\}/g)?.map(p => p.replace(/[{}]/g, '')) || [];

  // Build sample response based on the endpoint name
  const sampleResponse = useMemo(() => {
    return JSON.stringify({
      success: true,
      data: [
        { code: "SAMPLE_CODE", description: "Sample Description" }
      ],
      count: 1
    }, null, 2);
  }, []);

  return (
    <div className="space-y-6 p-6 border rounded-lg bg-card">
      {/* Header */}
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
          {api.category && (
            <Badge variant="outline" className="text-xs capitalize">{api.category}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Last updated: {format(new Date(api.updated_at), 'dd MMM yyyy')}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="details" className="flex-1"><FileText className="h-3.5 w-3.5 mr-1.5" />Details</TabsTrigger>
          <TabsTrigger value="examples" className="flex-1"><Code className="h-3.5 w-3.5 mr-1.5" />Examples</TabsTrigger>
          <TabsTrigger value="response" className="flex-1"><FileText className="h-3.5 w-3.5 mr-1.5" />Response</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          {/* Auth info */}
          {api.requires_auth && (
            <div className="p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">Authentication</h4>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Include your API key in the <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">x-api-key</code> request header.
                API keys can be obtained from the system administrator.
              </p>
            </div>
          )}

          {/* Path parameters */}
          {pathParams.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Path Parameters</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pathParams.map(param => (
                    <TableRow key={param}>
                      <TableCell className="font-mono text-xs font-medium">{param}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">string</Badge></TableCell>
                      <TableCell><Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs">Required</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">Path parameter</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Query parameters info */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Query Parameters</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parameter</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
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

          {/* No request body for GET */}
          {api.http_method === 'GET' && (
            <p className="text-sm text-muted-foreground italic">This is a GET endpoint — no request body required.</p>
          )}
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

        <TabsContent value="response" className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Response Structure</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
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
                <TableRow>
                  <TableCell className="font-mono text-xs font-medium">error</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">string</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">Error message (only on failure)</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">HTTP Status Codes</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell><Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">200</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">Success</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">401</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">Unauthorized — missing or invalid API key</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">403</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">Forbidden — API key lacks scope for this endpoint</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">404</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">Endpoint not found or disabled</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">429</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">Rate limit exceeded</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <CodeBlock code={sampleResponse} label="Sample Success Response (JSON)" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function PublicApiDocs() {
  const { data: apis, isLoading, error } = useRegistryApis();
  const { data: baseUrl } = useBaseUrl();
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    if (!apis) return {};
    const g: Record<string, RegistryApi[]> = {};
    apis.forEach(a => {
      const group = a.category || 'General';
      if (!g[group]) g[group] = [];
      g[group].push(a);
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
          {baseUrl && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Base URL:</span>
              <code className="bg-muted px-2 py-1 rounded text-xs font-mono text-foreground select-all">{baseUrl}</code>
              <CopyButton text={baseUrl} />
            </div>
          )}
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
                    <span className="font-semibold text-sm text-foreground capitalize">{group.replace(/-/g, ' ')}</span>
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
              {selectedApi && baseUrl ? (
                <ApiDetailPanel api={selectedApi} baseUrl={baseUrl} />
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
