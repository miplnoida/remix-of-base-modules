import React, { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CreditCard, Globe, Mail, Settings, Server, Upload, RefreshCw, Eye, EyeOff, Save, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserCode } from '@/hooks/useUserCode';
import {
  useSiteSettings,
  useEmailConfig,
  usePendingCount,
  useSaveSiteSetting,
  useSaveEmailConfig,
  usePublishAll,
  useRetrySync,
} from '@/hooks/useSettingsConfiguration';

// ─── Helpers ───

function SyncBadge({ isSynced, syncError }: { isSynced: boolean; syncError?: string | null }) {
  if (syncError) return (
    <TooltipProvider><Tooltip><TooltipTrigger><AlertCircle className="h-4 w-4 text-destructive" /></TooltipTrigger><TooltipContent>Sync Failed</TooltipContent></Tooltip></TooltipProvider>
  );
  if (isSynced) return (
    <TooltipProvider><Tooltip><TooltipTrigger><CheckCircle2 className="h-4 w-4 text-green-600" /></TooltipTrigger><TooltipContent>Synced</TooltipContent></Tooltip></TooltipProvider>
  );
  return (
    <TooltipProvider><Tooltip><TooltipTrigger><Clock className="h-4 w-4 text-amber-500" /></TooltipTrigger><TooltipContent>Pending Publish</TooltipContent></Tooltip></TooltipProvider>
  );
}

function maskSecret(val: string): string {
  if (!val || val.length <= 8) return '••••••••';
  return '•'.repeat(val.length - 8) + val.slice(-8);
}

function parseJsonSafe(val: string): Record<string, unknown> {
  try { return JSON.parse(val); } catch { return {}; }
}

// ─── Payment Gateway Tab ───

function PaymentGatewayTab() {
  const { data: settings, isLoading } = useSiteSettings('PAYMENT_GATEWAY');
  const saveMutation = useSaveSiteSetting();
  const retryMutation = useRetrySync();
  const { userCode } = useUserCode();
  const [editDialog, setEditDialog] = useState<{ open: boolean; row: any; fields: Record<string, string> }>({ open: false, row: null, fields: {} });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const openEdit = (row: any) => {
    const parsed = parseJsonSafe(row.setting_value);
    setEditDialog({
      open: true,
      row,
      fields: {
        merchant_id: (parsed.merchant_id as string) || '',
        key_id: (parsed.key_id as string) || '',
        secret_key: (parsed.secret_key as string) || '',
        base_url: (parsed.base_url as string) || '',
      },
    });
  };

  const handleSave = () => {
    if (!editDialog.row) return;
    const currentParsed = parseJsonSafe(editDialog.row.setting_value);
    const newValue = JSON.stringify({ ...currentParsed, ...editDialog.fields });
    saveMutation.mutate(
      { id: editDialog.row.id, updates: { setting_value: newValue }, userCode: userCode || 'system' },
      { onSuccess: () => setEditDialog({ open: false, row: null, fields: {} }) }
    );
  };

  const handleToggleActive = (row: any) => {
    if (!settings) return;
    if (!row.is_active) {
      // Mutual exclusion: deactivate all others, activate this one
      settings.forEach((s) => {
        if (s.id !== row.id && s.is_active) {
          saveMutation.mutate({ id: s.id, updates: { is_active: false }, userCode: userCode || 'system' });
        }
      });
      saveMutation.mutate({ id: row.id, updates: { is_active: true }, userCode: userCode || 'system' });
    } else {
      saveMutation.mutate({ id: row.id, updates: { is_active: false }, userCode: userCode || 'system' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {settings?.map((row) => {
          const parsed = parseJsonSafe(row.setting_value);
          return (
            <Card key={row.id} className={row.is_active ? 'border-primary' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{row.description || row.setting_key}</CardTitle>
                    <CardDescription>{row.environment}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <SyncBadge isSynced={row.is_synced} syncError={row.sync_error} />
                    {row.is_active ? (
                      <Badge className="bg-green-600 text-xs">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">Merchant ID:</span>
                  <span className="font-mono">{(parsed.merchant_id as string) || '—'}</span>
                  <span className="text-muted-foreground">Key ID:</span>
                  <span className="font-mono">{maskSecret((parsed.key_id as string) || '')}</span>
                  <span className="text-muted-foreground">Base URL:</span>
                  <span className="font-mono text-xs break-all">{(parsed.base_url as string) || '—'}</span>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    checked={row.is_active}
                    onCheckedChange={() => handleToggleActive(row)}
                    disabled={saveMutation.isPending}
                  />
                  <span className="text-xs text-muted-foreground">{row.is_active ? 'Active' : 'Inactive'}</span>
                  <div className="flex-1" />
                  <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                    <Settings className="h-3 w-3 mr-1" />Edit
                  </Button>
                  {row.sync_error && (
                    <Button size="sm" variant="destructive" onClick={() => retryMutation.mutate({ table: 'setting', id: row.id })}>
                      <RefreshCw className="h-3 w-3 mr-1" />Retry
                    </Button>
                  )}
                </div>
                {row.sync_error && <p className="text-xs text-destructive mt-1">{row.sync_error}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={editDialog.open} onOpenChange={(o) => !o && setEditDialog({ open: false, row: null, fields: {} })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Payment Gateway</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Merchant ID</Label><Input value={editDialog.fields.merchant_id || ''} onChange={(e) => setEditDialog(p => ({ ...p, fields: { ...p.fields, merchant_id: e.target.value } }))} /></div>
            <div><Label>Key ID</Label><Input value={editDialog.fields.key_id || ''} onChange={(e) => setEditDialog(p => ({ ...p, fields: { ...p.fields, key_id: e.target.value } }))} /></div>
            <div>
              <Label>Secret Key</Label>
              <div className="relative">
                <Input
                  type={showSecrets['secret_key'] ? 'text' : 'password'}
                  value={editDialog.fields.secret_key || ''}
                  onChange={(e) => setEditDialog(p => ({ ...p, fields: { ...p.fields, secret_key: e.target.value } }))}
                />
                <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1 h-7 w-7 p-0" onClick={() => setShowSecrets(p => ({ ...p, secret_key: !p.secret_key }))}>
                  {showSecrets['secret_key'] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
              </div>
            </div>
            <div><Label>Base URL</Label><Input value={editDialog.fields.base_url || ''} onChange={(e) => setEditDialog(p => ({ ...p, fields: { ...p.fields, base_url: e.target.value } }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, row: null, fields: {} })}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              <Save className="h-4 w-4 mr-1" />Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Payment Defaults Tab ───

function PaymentDefaultsTab() {
  const { data: settings, isLoading } = useSiteSettings('PAYMENT_CONFIG');
  const saveMutation = useSaveSiteSetting();
  const retryMutation = useRetrySync();
  const { userCode } = useUserCode();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const startEdit = (row: any) => { setEditingId(row.id); setEditValue(row.setting_value); };
  const cancelEdit = () => { setEditingId(null); setEditValue(''); };
  const saveEdit = (id: string) => {
    saveMutation.mutate(
      { id, updates: { setting_value: editValue }, userCode: userCode || 'system' },
      { onSuccess: cancelEdit }
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Setting</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Environment</TableHead>
          <TableHead>Sync Status</TableHead>
          <TableHead className="w-[120px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {settings?.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <div><span className="font-medium">{row.setting_key}</span></div>
              <div className="text-xs text-muted-foreground">{row.description}</div>
            </TableCell>
            <TableCell>
              {editingId === row.id ? (
                <Input className="h-8 w-48" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
              ) : (
                <span className="font-mono text-sm">{row.setting_value}</span>
              )}
            </TableCell>
            <TableCell><Badge variant="outline">{row.environment}</Badge></TableCell>
            <TableCell><SyncBadge isSynced={row.is_synced} syncError={row.sync_error} /></TableCell>
            <TableCell>
              <div className="flex gap-1">
                {editingId === row.id ? (
                  <>
                    <Button size="sm" variant="default" onClick={() => saveEdit(row.id)} disabled={saveMutation.isPending}>
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => startEdit(row)}>Edit</Button>
                )}
                {row.sync_error && (
                  <Button size="sm" variant="destructive" onClick={() => retryMutation.mutate({ table: 'setting', id: row.id })}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ─── API Configuration Tab ───

function ApiConfigTab() {
  const { data: settings, isLoading } = useSiteSettings('EXTERNAL_API');
  const saveMutation = useSaveSiteSetting();
  const retryMutation = useRetrySync();
  const { userCode } = useUserCode();
  const [editDialog, setEditDialog] = useState<{ open: boolean; row: any; fields: Record<string, string> }>({ open: false, row: null, fields: {} });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const grouped = {
    Dev: settings?.filter(s => s.environment === 'Dev') || [],
    Prod: settings?.filter(s => s.environment === 'Prod') || [],
  };

  const openEdit = (row: any) => {
    const parsed = parseJsonSafe(row.setting_value);
    setEditDialog({
      open: true,
      row,
      fields: {
        base_url: (parsed.base_url as string) || '',
        api_key: (parsed.api_key as string) || '',
        endpoint: (parsed.endpoint as string) || '',
      },
    });
  };

  const handleSave = () => {
    if (!editDialog.row) return;
    const newValue = JSON.stringify(editDialog.fields);
    saveMutation.mutate(
      { id: editDialog.row.id, updates: { setting_value: newValue }, userCode: userCode || 'system' },
      { onSuccess: () => setEditDialog({ open: false, row: null, fields: {} }) }
    );
  };

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([env, rows]) => (
        <div key={env}>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Server className="h-4 w-4" />{env} Environment
            <Badge variant="outline">{rows.length} APIs</Badge>
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>API Name</TableHead>
                <TableHead>Base URL</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Sync</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const parsed = parseJsonSafe(row.setting_value);
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="font-medium text-sm">{row.setting_key}</span>
                      <div className="text-xs text-muted-foreground">{row.description}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{(parsed.base_url as string) || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{maskSecret((parsed.api_key as string) || '')}</TableCell>
                    <TableCell className="font-mono text-xs">{(parsed.endpoint as string) || '—'}</TableCell>
                    <TableCell><SyncBadge isSynced={row.is_synced} syncError={row.sync_error} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(row)}>Edit</Button>
                        {row.sync_error && (
                          <Button size="sm" variant="destructive" onClick={() => retryMutation.mutate({ table: 'setting', id: row.id })}>
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ))}

      <Dialog open={editDialog.open} onOpenChange={(o) => !o && setEditDialog({ open: false, row: null, fields: {} })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit API Configuration</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Base URL</Label><Input value={editDialog.fields.base_url || ''} onChange={(e) => setEditDialog(p => ({ ...p, fields: { ...p.fields, base_url: e.target.value } }))} /></div>
            <div><Label>API Key</Label><Input type="password" value={editDialog.fields.api_key || ''} onChange={(e) => setEditDialog(p => ({ ...p, fields: { ...p.fields, api_key: e.target.value } }))} /></div>
            <div><Label>Endpoint</Label><Input value={editDialog.fields.endpoint || ''} onChange={(e) => setEditDialog(p => ({ ...p, fields: { ...p.fields, endpoint: e.target.value } }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, row: null, fields: {} })}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              <Save className="h-4 w-4 mr-1" />Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Email Settings Tab ───

function EmailSettingsTab() {
  const { data: configs, isLoading } = useEmailConfig();
  const saveMutation = useSaveEmailConfig();
  const retryMutation = useRetrySync();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const grouped = {
    test: configs?.filter(c => c.config_group === 'test') || [],
    recipients: configs?.filter(c => c.config_group === 'recipients') || [],
    senders: configs?.filter(c => c.config_group === 'senders') || [],
  };

  const handleToggle = (row: any) => {
    if (row.config_key === 'IS_TEST_MODE') {
      const newVal = row.config_value === 'true' ? 'false' : 'true';
      saveMutation.mutate({ id: row.id, updates: { config_value: newVal } });
    }
  };

  const startEdit = (row: any) => { setEditingId(row.id); setEditValue(row.config_value); };
  const cancelEdit = () => { setEditingId(null); setEditValue(''); };
  const saveEdit = (id: string) => {
    saveMutation.mutate({ id, updates: { config_value: editValue } }, { onSuccess: cancelEdit });
  };

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([group, rows]) => (
        <div key={group}>
          <h3 className="text-lg font-semibold mb-3 capitalize flex items-center gap-2">
            <Mail className="h-4 w-4" />{group}
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Config Key</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Sync</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="font-medium text-sm">{row.config_key}</span>
                    <div className="text-xs text-muted-foreground">{row.description}</div>
                  </TableCell>
                  <TableCell>
                    {row.config_key === 'IS_TEST_MODE' ? (
                      <Switch checked={row.config_value === 'true'} onCheckedChange={() => handleToggle(row)} />
                    ) : editingId === row.id ? (
                      <Input className="h-8 w-64" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                    ) : (
                      <span className="font-mono text-sm">{row.config_value}</span>
                    )}
                  </TableCell>
                  <TableCell>{row.is_active ? <Badge className="bg-green-600 text-xs">Active</Badge> : <Badge variant="secondary" className="text-xs">Inactive</Badge>}</TableCell>
                  <TableCell><SyncBadge isSynced={row.is_synced} syncError={row.sync_error} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {row.config_key !== 'IS_TEST_MODE' && (
                        editingId === row.id ? (
                          <>
                            <Button size="sm" onClick={() => saveEdit(row.id)} disabled={saveMutation.isPending}><Save className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => startEdit(row)}>Edit</Button>
                        )
                      )}
                      {row.sync_error && (
                        <Button size="sm" variant="destructive" onClick={() => retryMutation.mutate({ table: 'email', id: row.id })}>
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}

// ─── System Tab ───

function SystemTab() {
  const { data: settings, isLoading } = useSiteSettings('SYSTEM');
  const saveMutation = useSaveSiteSetting();
  const { userCode } = useUserCode();

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const envRow = settings?.find(s => s.setting_key === 'ACTIVE_ENVIRONMENT');

  const handleChange = (val: string) => {
    if (!envRow) return;
    saveMutation.mutate({ id: envRow.id, updates: { setting_value: val }, userCode: userCode || 'system' });
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Active Environment</CardTitle>
        <CardDescription>Select which environment the C3 Wizard should use</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Environment</Label>
          <Select value={envRow?.setting_value || 'Production'} onValueChange={handleChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Dev">Dev</SelectItem>
              <SelectItem value="Production">Production</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {envRow && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sync Status:</span>
            <SyncBadge isSynced={envRow.is_synced} syncError={envRow.sync_error} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───

interface SettingsConfigurationProps {
  embedMode?: boolean;
}

const SettingsConfiguration: React.FC<SettingsConfigurationProps> = ({ embedMode = false }) => {
  const [activeTab, setActiveTab] = useState('payment-gateway');
  const pendingCount = usePendingCount();
  const publishMutation = usePublishAll();

  const content = (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {!embedMode && (
          <PageHeader
            title="Settings Configuration"
            subtitle="Manage C3 Wizard site settings, payment gateways, APIs, and email configuration"
            breadcrumbs={[
              { label: 'C3 Management', href: '/c3-management/dashboard' },
              { label: 'Settings Configuration' },
            ]}
          />
        )}
        <Button
          onClick={() => publishMutation.mutate()}
          disabled={publishMutation.isPending || pendingCount === 0}
          className="flex items-center gap-2"
        >
          {publishMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Publish All
          {pendingCount > 0 && (
            <Badge variant="secondary" className="ml-1 bg-amber-500 text-white">{pendingCount}</Badge>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="responsive-tabs">
          <TabsTrigger value="payment-gateway" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Payment Gateway</span>
            <span className="sm:hidden">Gateway</span>
          </TabsTrigger>
          <TabsTrigger value="payment-defaults" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Payment Defaults</span>
            <span className="sm:hidden">Defaults</span>
          </TabsTrigger>
          <TabsTrigger value="api-config" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">API Configuration</span>
            <span className="sm:hidden">APIs</span>
          </TabsTrigger>
          <TabsTrigger value="email-settings" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email Settings</span>
            <span className="sm:hidden">Email</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            <span className="hidden sm:inline">System</span>
            <span className="sm:hidden">System</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payment-gateway" className="mt-6"><PaymentGatewayTab /></TabsContent>
        <TabsContent value="payment-defaults" className="mt-6"><PaymentDefaultsTab /></TabsContent>
        <TabsContent value="api-config" className="mt-6"><ApiConfigTab /></TabsContent>
        <TabsContent value="email-settings" className="mt-6"><EmailSettingsTab /></TabsContent>
        <TabsContent value="system" className="mt-6"><SystemTab /></TabsContent>
      </Tabs>
    </div>
  );

  if (embedMode) return content;

  return <div className="container mx-auto py-6">{content}</div>;
};

export default SettingsConfiguration;
