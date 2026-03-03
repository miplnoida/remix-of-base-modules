import React, { useState } from 'react';
import { useAllExternalApis, useExternalApiDetails, useExternalApiExecutionLogs, ExternalApi } from '@/hooks/useExternalApis';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Globe, Plus, Pencil, Trash2, Eye, History, Loader2, ListFilter } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const EMPTY_API: Partial<ExternalApi> = {
  api_code: '', api_name: '', api_group: '', description: '', http_method: 'GET',
  endpoint_url: '', requires_auth: false, auth_type: 'none', is_active: true, version: '1.0.0',
};

interface FieldForm {
  id?: string;
  field_name: string;
  data_type: string;
  is_required?: boolean;
  location?: string;
  sample_value: string;
  description: string;
  display_order: number;
}

const ExternalApiManagement: React.FC = () => {
  const { data: apis, isLoading } = useAllExternalApis();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('apis');
  const [editApi, setEditApi] = useState<Partial<ExternalApi> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [fieldType, setFieldType] = useState<'request' | 'response'>('request');
  const [editField, setEditField] = useState<FieldForm | null>(null);

  const { requestFields, responseFields, changeLogs } = useExternalApiDetails(selectedApiId);
  const { data: executionLogs } = useExternalApiExecutionLogs(selectedApiId || undefined);

  const handleSaveApi = async () => {
    if (!editApi) return;
    setSaving(true);
    try {
      if (editApi.id) {
        const { error } = await supabase.from('external_api_master').update({
          api_code: editApi.api_code,
          api_name: editApi.api_name,
          api_group: editApi.api_group,
          description: editApi.description,
          http_method: editApi.http_method,
          endpoint_url: editApi.endpoint_url,
          requires_auth: editApi.requires_auth,
          auth_type: editApi.auth_type,
          is_active: editApi.is_active,
          version: editApi.version,
        }).eq('id', editApi.id);
        if (error) throw error;
        toast.success('API updated');
      } else {
        const { error } = await supabase.from('external_api_master').insert({
          api_code: editApi.api_code!,
          api_name: editApi.api_name!,
          api_group: editApi.api_group!,
          description: editApi.description,
          http_method: editApi.http_method || 'GET',
          endpoint_url: editApi.endpoint_url!,
          requires_auth: editApi.requires_auth || false,
          auth_type: editApi.auth_type || 'none',
          is_active: editApi.is_active ?? true,
          version: editApi.version || '1.0.0',
        });
        if (error) throw error;
        toast.success('API created');
      }
      queryClient.invalidateQueries({ queryKey: ['external-apis-all'] });
      queryClient.invalidateQueries({ queryKey: ['external-apis'] });
      setDialogOpen(false);
      setEditApi(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteApi = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API?')) return;
    const { error } = await supabase.from('external_api_master').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('API deleted');
    queryClient.invalidateQueries({ queryKey: ['external-apis-all'] });
    if (selectedApiId === id) setSelectedApiId(null);
  };

  const handleSaveField = async () => {
    if (!editField || !selectedApiId) return;
    setSaving(true);
    try {
      const table = fieldType === 'request' ? 'external_api_request_fields' : 'external_api_response_fields';
      const payload: any = {
        api_id: selectedApiId,
        field_name: editField.field_name,
        data_type: editField.data_type,
        sample_value: editField.sample_value || null,
        description: editField.description || null,
        display_order: editField.display_order,
      };
      if (fieldType === 'request') {
        payload.is_required = editField.is_required || false;
        payload.location = editField.location || 'body';
      }
      if (editField.id) {
        const { error } = await supabase.from(table).update(payload).eq('id', editField.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert(payload);
        if (error) throw error;
      }
      toast.success('Field saved');
      queryClient.invalidateQueries({ queryKey: [`external-api-${fieldType}-fields`, selectedApiId] });
      setFieldDialogOpen(false);
      setEditField(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (id: string, type: 'request' | 'response') => {
    const table = type === 'request' ? 'external_api_request_fields' : 'external_api_response_fields';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Field deleted');
    queryClient.invalidateQueries({ queryKey: [`external-api-${type}-fields`, selectedApiId] });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">External API Management</h1>
        <p className="text-muted-foreground">Manage API definitions, fields, versions, and execution logs</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="apis" className="gap-1.5"><Globe className="h-4 w-4" /> API Registry</TabsTrigger>
          <TabsTrigger value="fields" className="gap-1.5"><ListFilter className="h-4 w-4" /> Fields</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5"><History className="h-4 w-4" /> Execution Logs</TabsTrigger>
          <TabsTrigger value="changelog" className="gap-1.5"><History className="h-4 w-4" /> Change Log</TabsTrigger>
        </TabsList>

        {/* API Registry */}
        <TabsContent value="apis">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">API Definitions</CardTitle>
              <Button size="sm" onClick={() => { setEditApi({ ...EMPTY_API }); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add API
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(apis || []).map((api) => (
                      <TableRow key={api.id}>
                        <TableCell className="font-mono text-xs">{api.api_code}</TableCell>
                        <TableCell>{api.api_name}</TableCell>
                        <TableCell><Badge variant="outline">{api.api_group}</Badge></TableCell>
                        <TableCell><Badge variant="secondary">{api.http_method}</Badge></TableCell>
                        <TableCell>v{api.version}</TableCell>
                        <TableCell>{api.is_active ? <Badge className="bg-primary/10 text-primary">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setSelectedApiId(api.id); setActiveTab('fields'); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => { setEditApi(api); setDialogOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteApi(api.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fields */}
        <TabsContent value="fields">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Label>Select API:</Label>
              <Select value={selectedApiId || ''} onValueChange={setSelectedApiId}>
                <SelectTrigger className="w-80"><SelectValue placeholder="Choose an API" /></SelectTrigger>
                <SelectContent>
                  {(apis || []).map((a) => <SelectItem key={a.id} value={a.id}>{a.api_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedApiId && (
              <>
                {/* Request Fields */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base">Request Fields</CardTitle>
                    <Button size="sm" onClick={() => { setFieldType('request'); setEditField({ field_name: '', data_type: 'string', is_required: false, location: 'body', sample_value: '', description: '', display_order: 0 }); setFieldDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Field</TableHead><TableHead>Type</TableHead><TableHead>Location</TableHead><TableHead>Required</TableHead><TableHead>Order</TableHead><TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(requestFields.data || []).map((f) => (
                          <TableRow key={f.id}>
                            <TableCell className="font-mono text-xs">{f.field_name}</TableCell>
                            <TableCell>{f.data_type}</TableCell>
                            <TableCell>{f.location}</TableCell>
                            <TableCell>{f.is_required ? 'Yes' : 'No'}</TableCell>
                            <TableCell>{f.display_order}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" onClick={() => { setFieldType('request'); setEditField(f as any); setFieldDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => handleDeleteField(f.id, 'request')}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Response Fields */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base">Response Fields</CardTitle>
                    <Button size="sm" onClick={() => { setFieldType('response'); setEditField({ field_name: '', data_type: 'string', sample_value: '', description: '', display_order: 0 }); setFieldDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Field</TableHead><TableHead>Type</TableHead><TableHead>Order</TableHead><TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(responseFields.data || []).map((f) => (
                          <TableRow key={f.id}>
                            <TableCell className="font-mono text-xs">{f.field_name}</TableCell>
                            <TableCell>{f.data_type}</TableCell>
                            <TableCell>{f.display_order}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" onClick={() => { setFieldType('response'); setEditField(f as any); setFieldDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => handleDeleteField(f.id, 'response')}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        {/* Execution Logs */}
        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Execution Logs</CardTitle>
              <Select value={selectedApiId || ''} onValueChange={setSelectedApiId}>
                <SelectTrigger className="w-80"><SelectValue placeholder="Filter by API" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All APIs</SelectItem>
                  {(apis || []).map((a) => <SelectItem key={a.id} value={a.id}>{a.api_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead><TableHead>Status</TableHead><TableHead>Duration</TableHead><TableHead>Success</TableHead><TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(executionLogs || []).map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{new Date(log.created_at).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={log.is_success ? 'default' : 'destructive'}>{log.http_status_code}</Badge></TableCell>
                      <TableCell>{log.execution_time_ms}ms</TableCell>
                      <TableCell>{log.is_success ? '✓' : '✗'}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px] truncate">{log.error_message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Change Log */}
        <TabsContent value="changelog">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Change Log</CardTitle>
              <Select value={selectedApiId || ''} onValueChange={setSelectedApiId}>
                <SelectTrigger className="w-80"><SelectValue placeholder="Filter by API" /></SelectTrigger>
                <SelectContent>
                  {(apis || []).map((a) => <SelectItem key={a.id} value={a.id}>{a.api_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead><TableHead>Description</TableHead><TableHead>Changed At</TableHead><TableHead>Changed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(changeLogs.data || []).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell><Badge variant="outline">v{log.version}</Badge></TableCell>
                      <TableCell>{log.change_description}</TableCell>
                      <TableCell className="text-xs">{new Date(log.changed_at).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{log.changed_by || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* API Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editApi?.id ? 'Edit API' : 'Add New API'}</DialogTitle>
          </DialogHeader>
          {editApi && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>API Code</Label><Input value={editApi.api_code || ''} onChange={(e) => setEditApi({ ...editApi, api_code: e.target.value })} /></div>
                <div><Label>API Name</Label><Input value={editApi.api_name || ''} onChange={(e) => setEditApi({ ...editApi, api_name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Group</Label><Input value={editApi.api_group || ''} onChange={(e) => setEditApi({ ...editApi, api_group: e.target.value })} /></div>
                <div><Label>Version</Label><Input value={editApi.version || ''} onChange={(e) => setEditApi({ ...editApi, version: e.target.value })} /></div>
              </div>
              <div><Label>Description</Label><Textarea value={editApi.description || ''} onChange={(e) => setEditApi({ ...editApi, description: e.target.value })} /></div>
              <div><Label>Endpoint URL</Label><Input value={editApi.endpoint_url || ''} onChange={(e) => setEditApi({ ...editApi, endpoint_url: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>HTTP Method</Label>
                  <Select value={editApi.http_method || 'GET'} onValueChange={(v) => setEditApi({ ...editApi, http_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['GET','POST','PUT','DELETE'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Auth Type</Label>
                  <Select value={editApi.auth_type || 'none'} onValueChange={(v) => setEditApi({ ...editApi, auth_type: v, requires_auth: v !== 'none' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="bearer_token">Bearer Token</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Label>Active</Label>
                  <Switch checked={editApi.is_active ?? true} onCheckedChange={(v) => setEditApi({ ...editApi, is_active: v })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveApi} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Field Edit Dialog */}
      <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editField?.id ? 'Edit' : 'Add'} {fieldType === 'request' ? 'Request' : 'Response'} Field</DialogTitle>
          </DialogHeader>
          {editField && (
            <div className="grid gap-3">
              <div><Label>Field Name</Label><Input value={editField.field_name} onChange={(e) => setEditField({ ...editField, field_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data Type</Label>
                  <Select value={editField.data_type} onValueChange={(v) => setEditField({ ...editField, data_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['string','number','boolean','date','json'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Display Order</Label><Input type="number" value={editField.display_order} onChange={(e) => setEditField({ ...editField, display_order: parseInt(e.target.value) || 0 })} /></div>
              </div>
              {fieldType === 'request' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Location</Label>
                    <Select value={editField.location || 'body'} onValueChange={(v) => setEditField({ ...editField, location: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['query','path','header','body'].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <Label>Required</Label>
                    <Switch checked={editField.is_required || false} onCheckedChange={(v) => setEditField({ ...editField, is_required: v })} />
                  </div>
                </div>
              )}
              <div><Label>Sample Value</Label><Input value={editField.sample_value} onChange={(e) => setEditField({ ...editField, sample_value: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={editField.description} onChange={(e) => setEditField({ ...editField, description: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveField} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExternalApiManagement;
