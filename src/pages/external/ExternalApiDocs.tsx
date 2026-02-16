import React, { useState, useMemo } from 'react';
import { useExternalApis, useExternalApiDetails, ExternalApi, ExternalApiRequestField } from '@/hooks/useExternalApis';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ChevronDown, ChevronRight, Play, Clock, CheckCircle2, XCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PUT: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

function buildSampleJson(fields: ExternalApiRequestField[], location: string) {
  const obj: Record<string, unknown> = {};
  fields
    .filter((f) => f.location === location)
    .forEach((f) => {
      let val: unknown = f.sample_value || '';
      if (f.data_type === 'number') val = Number(f.sample_value) || 0;
      if (f.data_type === 'boolean') val = f.sample_value === 'true';
      if (f.data_type === 'json') {
        try { val = JSON.parse(f.sample_value || '{}'); } catch { val = {}; }
      }
      obj[f.field_name] = val;
    });
  return obj;
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
      <div>
        <span className="cursor-pointer select-none" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '▶' : '▼'} [{data.length}]
        </span>
        {!collapsed && (
          <div className="ml-4 border-l border-border pl-2">
            {data.map((item, i) => (
              <div key={i}><JsonViewer data={item} level={level + 1} />{i < data.length - 1 ? ',' : ''}</div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) return <span>{'{}'}</span>;
    return (
      <div>
        <span className="cursor-pointer select-none" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '▶' : '▼'} {'{'}
        </span>
        {!collapsed && (
          <div className="ml-4 border-l border-border pl-2">
            {entries.map(([key, value], i) => (
              <div key={key}>
                <span className="text-purple-600 dark:text-purple-400">"{key}"</span>: <JsonViewer data={value} level={level + 1} />
                {i < entries.length - 1 ? ',' : ''}
              </div>
            ))}
          </div>
        )}
        {!collapsed && <span>{'}'}</span>}
        {collapsed && <span>{'}'}</span>}
      </div>
    );
  }

  return <span>{String(data)}</span>;
}

function ApiDetailPanel({ api }: { api: ExternalApi }) {
  const { requestFields, responseFields, changeLogs } = useExternalApiDetails(api.id);
  const [activeTab, setActiveTab] = useState('request');
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{ status_code: number; response: unknown; execution_time_ms: number; is_success: boolean; error_message: string | null } | null>(null);

  const reqFields = requestFields.data || [];
  const resFields = responseFields.data || [];
  const logs = changeLogs.data || [];

  const fieldsByLocation = useMemo(() => {
    const groups: Record<string, ExternalApiRequestField[]> = {};
    reqFields.forEach((f) => {
      if (!groups[f.location]) groups[f.location] = [];
      groups[f.location].push(f);
    });
    return groups;
  }, [reqFields]);

  const sampleRequestJson = useMemo(() => {
    const bodyFields = reqFields.filter((f) => f.location === 'body');
    return bodyFields.length > 0 ? buildSampleJson(reqFields, 'body') : null;
  }, [reqFields]);

  const sampleResponseJson = useMemo(() => {
    const obj: Record<string, unknown> = {};
    resFields.forEach((f) => {
      let val: unknown = f.sample_value || '';
      if (f.data_type === 'number') val = Number(f.sample_value) || 0;
      if (f.data_type === 'boolean') val = f.sample_value === 'true';
      if (f.data_type === 'json') {
        try { val = JSON.parse(f.sample_value || '{}'); } catch { val = {}; }
      }
      obj[f.field_name] = val;
    });
    return obj;
  }, [resFields]);

  const handleExecute = async () => {
    // Validate required fields
    const missingRequired = reqFields
      .filter((f) => f.is_required && !formValues[f.field_name]?.trim())
      .map((f) => f.field_name);

    if (missingRequired.length > 0) {
      toast.error(`Required fields missing: ${missingRequired.join(', ')}`);
      return;
    }

    setExecuting(true);
    setResult(null);

    try {
      // Build query params
      const queryParams: Record<string, string> = {};
      reqFields.filter((f) => f.location === 'query').forEach((f) => {
        if (formValues[f.field_name]) queryParams[f.field_name] = formValues[f.field_name];
      });

      // Build path params - replace in URL
      let url = api.endpoint_url;
      reqFields.filter((f) => f.location === 'path').forEach((f) => {
        url = url.replace(`{${f.field_name}}`, encodeURIComponent(formValues[f.field_name] || ''));
      });

      // Build headers
      const headers: Record<string, string> = {};
      reqFields.filter((f) => f.location === 'header').forEach((f) => {
        if (formValues[f.field_name]) headers[f.field_name] = formValues[f.field_name];
      });

      // Build body
      const body: Record<string, unknown> = {};
      reqFields.filter((f) => f.location === 'body').forEach((f) => {
        let val: unknown = formValues[f.field_name] || '';
        if (f.data_type === 'number') val = Number(val) || 0;
        if (f.data_type === 'boolean') val = val === 'true';
        if (f.data_type === 'json') {
          try { val = JSON.parse(val as string); } catch { /* keep string */ }
        }
        body[f.field_name] = val;
      });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await supabase.functions.invoke('external-api-proxy', {
        body: {
          api_id: api.id,
          endpoint_url: url,
          http_method: api.http_method,
          headers,
          query_params: queryParams,
          body: Object.keys(body).length > 0 ? body : undefined,
          auth_type: api.auth_type,
          api_key: api.auth_type === 'api_key' ? apiKeyValue : undefined,
        },
      });

      if (response.error) {
        setResult({
          status_code: 500,
          response: { error: response.error.message },
          execution_time_ms: 0,
          is_success: false,
          error_message: response.error.message,
        });
      } else {
        setResult(response.data);
      }
    } catch (err) {
      toast.error('Execution failed');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* API Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Badge className={cn('text-xs font-mono', METHOD_COLORS[api.http_method])}>
              {api.http_method}
            </Badge>
            <CardTitle className="text-lg">{api.api_name}</CardTitle>
            <Badge variant="outline">v{api.version}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {api.description && <p className="text-muted-foreground">{api.description}</p>}
          <div className="grid grid-cols-2 gap-2">
            <div><span className="font-medium">Endpoint:</span> <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{api.endpoint_url}</code></div>
            <div><span className="font-medium">Auth:</span> {api.requires_auth ? api.auth_type.replace('_', ' ') : 'None'}</div>
          </div>
          {logs.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="text-xs text-primary underline">View Change History ({logs.length})</CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-1 max-h-40 overflow-auto">
                  {logs.map((log) => (
                    <div key={log.id} className="text-xs flex gap-2 text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">v{log.version}</Badge>
                      <span>{log.change_description}</span>
                      <span className="ml-auto">{new Date(log.changed_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* Request / Response Models */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="request">Request Model</TabsTrigger>
          <TabsTrigger value="response">Response Model</TabsTrigger>
        </TabsList>

        <TabsContent value="request" className="space-y-4">
          {Object.entries(fieldsByLocation).map(([loc, fields]) => (
            <div key={loc}>
              <h4 className="text-sm font-semibold capitalize mb-2">{loc} Parameters</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs">{f.field_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{f.data_type}</Badge></TableCell>
                      <TableCell>{f.is_required ? <Badge variant="destructive" className="text-[10px]">Required</Badge> : 'Optional'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{f.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
          {sampleRequestJson && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Sample Request Body</h4>
              <div className="bg-muted p-3 rounded-md font-mono text-xs overflow-auto max-h-60">
                <JsonViewer data={sampleRequestJson} />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="response" className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resFields.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.field_name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{f.data_type}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{f.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {Object.keys(sampleResponseJson).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Sample Response</h4>
              <div className="bg-muted p-3 rounded-md font-mono text-xs overflow-auto max-h-60">
                <JsonViewer data={sampleResponseJson} />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Try API */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Play className="h-4 w-4" /> Try API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {api.auth_type === 'api_key' && (
            <div>
              <Label htmlFor="api-key-input">API Key</Label>
              <Input
                id="api-key-input"
                type="password"
                placeholder="Enter your API key"
                value={apiKeyValue}
                onChange={(e) => setApiKeyValue(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reqFields.map((f) => (
              <div key={f.id}>
                <Label htmlFor={`field-${f.id}`} className="text-xs">
                  {f.field_name} {f.is_required && <span className="text-destructive">*</span>}
                  <span className="text-muted-foreground ml-1">({f.location})</span>
                </Label>
                {f.data_type === 'boolean' ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id={`field-${f.id}`}
                      checked={formValues[f.field_name] === 'true'}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, [f.field_name]: String(e.target.checked) }))}
                      className="rounded"
                    />
                    <span className="text-xs">{formValues[f.field_name] === 'true' ? 'true' : 'false'}</span>
                  </div>
                ) : f.data_type === 'json' ? (
                  <Textarea
                    id={`field-${f.id}`}
                    placeholder={f.sample_value || '{}'}
                    value={formValues[f.field_name] || ''}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, [f.field_name]: e.target.value }))}
                    className="font-mono text-xs mt-1"
                    rows={3}
                  />
                ) : f.data_type === 'date' ? (
                  <Input
                    id={`field-${f.id}`}
                    type="date"
                    value={formValues[f.field_name] || ''}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, [f.field_name]: e.target.value }))}
                    className="mt-1"
                  />
                ) : (
                  <Input
                    id={`field-${f.id}`}
                    type={f.data_type === 'number' ? 'number' : 'text'}
                    placeholder={f.sample_value || ''}
                    value={formValues[f.field_name] || ''}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, [f.field_name]: e.target.value }))}
                    className="mt-1"
                  />
                )}
              </div>
            ))}
          </div>

          <Button onClick={handleExecute} disabled={executing} className="w-full">
            {executing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Executing...</> : <><Play className="h-4 w-4 mr-2" /> Execute</>}
          </Button>

          {result && (
            <Card className={cn('border-2', result.is_success ? 'border-emerald-500' : 'border-destructive')}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-3">
                  {result.is_success ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
                  <Badge className={cn(result.is_success ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800')}>
                    Status: {result.status_code}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {result.execution_time_ms}ms
                  </div>
                </div>
                {result.error_message && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded p-2 text-sm text-destructive">
                    {result.error_message}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Response Body</h4>
                  <div className="bg-muted p-3 rounded-md font-mono text-xs overflow-auto max-h-80">
                    <JsonViewer data={result.response} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const ExternalApiDocs: React.FC = () => {
  const { data: apis, isLoading } = useExternalApis();
  const [selectedApi, setSelectedApi] = useState<ExternalApi | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const grouped = useMemo(() => {
    if (!apis) return {};
    const filtered = searchTerm
      ? apis.filter((a) => a.api_name.toLowerCase().includes(searchTerm.toLowerCase()) || a.api_code.toLowerCase().includes(searchTerm.toLowerCase()))
      : apis;
    const groups: Record<string, ExternalApi[]> = {};
    filtered.forEach((api) => {
      if (!groups[api.api_group]) groups[api.api_group] = [];
      groups[api.api_group].push(api);
    });
    return groups;
  }, [apis, searchTerm]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">External API Documentation</h1>
        <p className="text-muted-foreground">Browse and test all available external APIs</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search APIs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* API List */}
        <div className="space-y-2 lg:col-span-1">
          {Object.entries(grouped).map(([group, groupApis]) => (
            <Collapsible key={group} open={expandedGroups.has(group)} onOpenChange={() => toggleGroup(group)}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-muted rounded-md hover:bg-muted/80 transition-colors text-left font-medium text-sm">
                {expandedGroups.has(group) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {group}
                <Badge variant="secondary" className="ml-auto text-[10px]">{groupApis.length}</Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1 pl-2">
                {groupApis.map((api) => (
                  <button
                    key={api.id}
                    onClick={() => setSelectedApi(api)}
                    className={cn(
                      'w-full flex items-center gap-2 p-2.5 rounded-md text-left text-sm transition-colors',
                      selectedApi?.id === api.id
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'hover:bg-muted'
                    )}
                  >
                    <Badge className={cn('text-[10px] font-mono shrink-0', METHOD_COLORS[api.http_method])}>
                      {api.http_method}
                    </Badge>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{api.api_name}</div>
                      {api.description && (
                        <div className="text-xs text-muted-foreground truncate">{api.description}</div>
                      )}
                    </div>
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
          {Object.keys(grouped).length === 0 && (
            <div className="text-center text-muted-foreground py-10">No APIs available</div>
          )}
        </div>

        {/* API Detail */}
        <div className="lg:col-span-2">
          {selectedApi ? (
            <ApiDetailPanel api={selectedApi} />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg">
              Select an API from the left to view documentation
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExternalApiDocs;
