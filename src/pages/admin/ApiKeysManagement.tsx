import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Ban, BarChart3, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GenerateApiKeyDialog } from '@/components/admin/GenerateApiKeyDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

interface ApiKeyRow {
  id: string;
  key_prefix: string;
  app_name: string;
  status: string;
  rate_limit_per_minute: number;
  allowed_endpoints: string[];
  expires_at: string | null;
  created_at: string;
  last_used: string | null;
}

const ApiKeysManagement: React.FC = () => {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [revokeKey, setRevokeKey] = useState<ApiKeyRow | null>(null);
  const [usageKeyId, setUsageKeyId] = useState<string | null>(null);
  const [usageLogs, setUsageLogs] = useState<any[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('manage-api-keys', {
        body: { action: 'list' },
      });

      if (response.error) throw response.error;
      if (response.data?.status === 'success') {
        setKeys(response.data.data || []);
      }
    } catch (err: any) {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleRevoke = async () => {
    if (!revokeKey) return;
    try {
      const response = await supabase.functions.invoke('manage-api-keys', {
        body: { action: 'revoke', key_id: revokeKey.id },
      });
      if (response.error) throw response.error;
      toast.success(`API key for "${revokeKey.app_name}" has been revoked`);
      setRevokeKey(null);
      fetchKeys();
    } catch (err: any) {
      toast.error('Failed to revoke key');
    }
  };

  const fetchUsage = async (keyId: string) => {
    setUsageKeyId(keyId);
    setUsageLoading(true);
    try {
      const response = await supabase.functions.invoke('manage-api-keys', {
        body: { action: 'usage', key_id: keyId, limit: 50 },
      });
      if (response.error) throw response.error;
      setUsageLogs(response.data?.data || []);
    } catch {
      toast.error('Failed to load usage logs');
    } finally {
      setUsageLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'revoked':
        return <Badge variant="destructive">Revoked</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Key Management</h1>
          <p className="text-muted-foreground">
            Manage API keys for external application access to the Public API Gateway
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchKeys}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowGenerate(true)}>
            <Plus className="h-4 w-4 mr-2" /> Generate New Key
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : keys.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No API keys yet. Click "Generate New Key" to create one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rate Limit</TableHead>
                  <TableHead>Endpoints</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-mono text-xs">{key.key_prefix}...</TableCell>
                    <TableCell className="font-medium">{key.app_name}</TableCell>
                    <TableCell>{statusBadge(key.status)}</TableCell>
                    <TableCell>{key.rate_limit_per_minute}/min</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">
                      {key.allowed_endpoints?.length > 0
                        ? key.allowed_endpoints.join(', ')
                        : 'All'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {key.created_at ? format(new Date(key.created_at), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {key.last_used ? format(new Date(key.last_used), 'dd/MM/yyyy') : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => fetchUsage(key.id)}
                          title="View Usage"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        {key.status === 'active' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setRevokeKey(key)}
                            title="Revoke Key"
                            className="text-destructive hover:text-destructive"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
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

      {/* Usage Logs Panel */}
      {usageKeyId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Access Logs — {keys.find((k) => k.id === usageKeyId)?.app_name}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setUsageKeyId(null)}>
                Close
              </Button>
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
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.http_method}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.endpoint}</TableCell>
                      <TableCell>
                        <Badge
                          variant={log.response_status < 400 ? 'default' : 'destructive'}
                        >
                          {log.response_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.response_time_ms}ms</TableCell>
                      <TableCell className="text-xs">{log.request_ip}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                        {log.error_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <GenerateApiKeyDialog
        open={showGenerate}
        onOpenChange={setShowGenerate}
        onKeyGenerated={fetchKeys}
      />

      <AlertDialog open={!!revokeKey} onOpenChange={() => setRevokeKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently revoke the API key for "{revokeKey?.app_name}".
              Any applications using this key will lose access immediately. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ApiKeysManagement;
