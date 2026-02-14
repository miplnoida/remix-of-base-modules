import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Ban, BarChart3, RefreshCw, Pencil, RotateCw, Copy, Check, Eye, EyeOff, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GenerateApiKeyDialog } from '@/components/admin/GenerateApiKeyDialog';
import { EditApiKeyDialog } from '@/components/admin/EditApiKeyDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';

interface ApiKeyRow {
  id: string;
  key_prefix: string;
  app_name: string;
  status: string;
  rate_limit_per_minute: number;
  allowed_endpoints: string[];
  allowed_ip_addresses: string[];
  expires_at: string | null;
  created_at: string;
  last_used: string | null;
  scope_count?: number | null;
}

const ApiKeysTab: React.FC = () => {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [editKey, setEditKey] = useState<ApiKeyRow | null>(null);
  const [revokeKey, setRevokeKey] = useState<ApiKeyRow | null>(null);
  const [regenerateKey, setRegenerateKey] = useState<ApiKeyRow | null>(null);
  const [regeneratedPlainKey, setRegeneratedPlainKey] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenKey, setShowRegenKey] = useState(false);
  const [regenCopied, setRegenCopied] = useState(false);
  const [usageKeyId, setUsageKeyId] = useState<string | null>(null);
  const [usageLogs, setUsageLogs] = useState<any[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);

  // Reveal key state
  const [revealKey, setRevealKey] = useState<ApiKeyRow | null>(null);
  const [revealedPlainKey, setRevealedPlainKey] = useState('');
  const [revealLoading, setRevealLoading] = useState(false);
  const [showRevealedKey, setShowRevealedKey] = useState(false);
  const [revealCopied, setRevealCopied] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('manage-api-keys', { body: { action: 'list' } });
      if (response.error) throw response.error;
      if (response.data?.status === 'success') setKeys(response.data.data || []);
    } catch { toast.error('Failed to load API keys'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleRevoke = async () => {
    if (!revokeKey) return;
    try {
      const response = await supabase.functions.invoke('manage-api-keys', { body: { action: 'revoke', key_id: revokeKey.id } });
      if (response.error) throw response.error;
      toast.success(`API key for "${revokeKey.app_name}" has been revoked`);
      setRevokeKey(null);
      fetchKeys();
    } catch { toast.error('Failed to revoke key'); }
  };

  const handleRegenerate = async () => {
    if (!regenerateKey) return;
    setRegenerating(true);
    try {
      const response = await supabase.functions.invoke('manage-api-keys', { body: { action: 'regenerate', key_id: regenerateKey.id } });
      if (response.error) throw response.error;
      if (response.data?.status === 'success') {
        setRegeneratedPlainKey(response.data.data.plain_key);
        toast.success('API key regenerated successfully');
        fetchKeys();
      } else {
        throw new Error(response.data?.message || 'Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to regenerate key');
      setRegenerateKey(null);
    } finally {
      setRegenerating(false);
    }
  };

  const handleCloseRegenDialog = () => {
    setRegenerateKey(null);
    setRegeneratedPlainKey('');
    setShowRegenKey(false);
    setRegenCopied(false);
  };

  const handleCopyRegen = () => {
    navigator.clipboard.writeText(regeneratedPlainKey);
    setRegenCopied(true);
    setTimeout(() => setRegenCopied(false), 2000);
  };

  // Reveal key handlers
  const handleRevealKey = async (key: ApiKeyRow) => {
    setRevealKey(key);
    setRevealLoading(true);
    setRevealedPlainKey('');
    setShowRevealedKey(false);
    setRevealCopied(false);
    try {
      const response = await supabase.functions.invoke('manage-api-keys', { body: { action: 'reveal', key_id: key.id } });
      if (response.error) {
        // Try to extract message from response data
        const msg = response.data?.message || response.error.message || 'Failed to reveal API key';
        throw new Error(msg);
      }
      if (response.data?.status === 'success') {
        setRevealedPlainKey(response.data.data.plain_key);
      } else {
        throw new Error(response.data?.message || 'Failed to reveal key');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reveal API key');
      setRevealKey(null);
    } finally {
      setRevealLoading(false);
    }
  };

  const handleCloseRevealDialog = () => {
    setRevealKey(null);
    setRevealedPlainKey('');
    setShowRevealedKey(false);
    setRevealCopied(false);
  };

  const handleCopyRevealed = () => {
    navigator.clipboard.writeText(revealedPlainKey);
    setRevealCopied(true);
    setTimeout(() => setRevealCopied(false), 2000);
  };

  const fetchUsage = async (keyId: string) => {
    setUsageKeyId(keyId);
    setUsageLoading(true);
    try {
      const response = await supabase.functions.invoke('manage-api-keys', { body: { action: 'usage', key_id: keyId, limit: 50 } });
      if (response.error) throw response.error;
      setUsageLogs(response.data?.data || []);
    } catch { toast.error('Failed to load usage logs'); }
    finally { setUsageLoading(false); }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="default">Active</Badge>;
      case 'revoked': return <Badge variant="destructive">Revoked</Badge>;
      case 'expired': return <Badge variant="secondary">Expired</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="icon" onClick={fetchKeys}><RefreshCw className="h-4 w-4" /></Button>
        <Button onClick={() => setShowGenerate(true)}><Plus className="h-4 w-4 mr-2" /> Generate New Key</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>API Keys</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : keys.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No API keys yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rate Limit</TableHead>
                  <TableHead>Scoped Endpoints</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map(key => (
                  <TableRow key={key.id}>
                    <TableCell className="font-mono text-xs">{key.key_prefix}...</TableCell>
                    <TableCell className="font-medium">{key.app_name}</TableCell>
                    <TableCell>{statusBadge(key.status)}</TableCell>
                    <TableCell>{key.rate_limit_per_minute}/min</TableCell>
                    <TableCell className="text-xs">
                      {(key as any).scope_count != null ? `${(key as any).scope_count} endpoints` : 'All'}
                    </TableCell>
                    <TableCell className="text-xs">{key.created_at ? format(new Date(key.created_at), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell className="text-xs">{key.last_used ? format(new Date(key.last_used), 'dd/MM/yyyy') : 'Never'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleRevealKey(key)} title="Reveal Key"><KeyRound className="h-4 w-4" /></Button>
                        {key.status === 'active' && (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => setEditKey(key)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => setRegenerateKey(key)} title="Regenerate Key"><RotateCw className="h-4 w-4" /></Button>
                          </>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => fetchUsage(key.id)} title="View Usage"><BarChart3 className="h-4 w-4" /></Button>
                        {key.status === 'active' && (
                          <Button size="icon" variant="ghost" onClick={() => setRevokeKey(key)} title="Revoke" className="text-destructive hover:text-destructive"><Ban className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {usageKeyId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Access Logs — {keys.find(k => k.id === usageKeyId)?.app_name}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setUsageKeyId(null)}>Close</Button>
            </div>
          </CardHeader>
          <CardContent>
            {usageLoading ? (
              <p className="text-center py-4 text-muted-foreground">Loading...</p>
            ) : usageLogs.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No access logs yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline">{log.http_method}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{log.endpoint}</TableCell>
                      <TableCell><Badge variant={log.response_status < 400 ? 'default' : 'destructive'}>{log.response_status}</Badge></TableCell>
                      <TableCell>{log.response_time_ms}ms</TableCell>
                      <TableCell className="text-xs">{log.request_ip}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px] truncate">{log.error_message || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <GenerateApiKeyDialog open={showGenerate} onOpenChange={setShowGenerate} onKeyGenerated={fetchKeys} />
      <EditApiKeyDialog open={!!editKey} onOpenChange={(v) => { if (!v) setEditKey(null); }} onKeyUpdated={fetchKeys} apiKey={editKey} />

      {/* Reveal Key Dialog */}
      <Dialog open={!!revealKey} onOpenChange={(v) => { if (!v) handleCloseRevealDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>API Key — {revealKey?.app_name}</DialogTitle>
            <DialogDescription>
              This is the full API key. Keep it secure and do not share publicly.
            </DialogDescription>
          </DialogHeader>
          {revealLoading ? (
            <p className="text-center py-6 text-muted-foreground">Decrypting key...</p>
          ) : revealedPlainKey ? (
            <div className="space-y-4">
              <div className="rounded-md border p-4">
                <div className="flex items-center gap-2">
                  <Input readOnly value={showRevealedKey ? revealedPlainKey : '•'.repeat(revealedPlainKey.length)} className="font-mono text-xs" />
                  <Button size="icon" variant="outline" onClick={() => setShowRevealedKey(!showRevealedKey)}>
                    {showRevealedKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="outline" onClick={handleCopyRevealed}>
                    {revealCopied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseRevealDialog}>Close</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">This key was created before encrypted storage was enabled and cannot be revealed. You can regenerate it instead.</p>
              <DialogFooter className="mt-4">
                <Button onClick={handleCloseRevealDialog}>Close</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Regenerate Key Dialog */}
      <Dialog open={!!regenerateKey} onOpenChange={(v) => { if (!v) handleCloseRegenDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Regenerate API Key</DialogTitle>
            <DialogDescription>
              {regeneratedPlainKey
                ? 'A new key has been generated. Copy it now — the old key is no longer valid.'
                : `This will invalidate the current key for "${regenerateKey?.app_name}" and generate a new one. All existing integrations using the old key will stop working immediately.`
              }
            </DialogDescription>
          </DialogHeader>

          {regeneratedPlainKey ? (
            <div className="space-y-4">
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive mb-2">
                  ⚠️ Copy this key now — it won't be shown again!
                </p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={showRegenKey ? regeneratedPlainKey : '•'.repeat(regeneratedPlainKey.length)} className="font-mono text-xs" />
                  <Button size="icon" variant="outline" onClick={() => setShowRegenKey(!showRegenKey)}>
                    {showRegenKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="outline" onClick={handleCopyRegen}>
                    {regenCopied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseRegenDialog}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseRegenDialog}>Cancel</Button>
              <Button variant="destructive" onClick={handleRegenerate} disabled={regenerating}>
                {regenerating ? 'Regenerating...' : 'Regenerate Key'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revokeKey} onOpenChange={() => setRevokeKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently revoke the API key for "{revokeKey?.app_name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Revoke Key</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ApiKeysTab;
