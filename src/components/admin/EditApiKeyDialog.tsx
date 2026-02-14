import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RegistryEntry {
  id: string;
  api_name: string;
  api_version: string;
  http_method: string;
  endpoint_path: string;
  description: string | null;
  is_enabled: boolean;
}

interface EditApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeyUpdated: () => void;
  apiKey: {
    id: string;
    app_name: string;
    rate_limit_per_minute: number;
    allowed_ip_addresses?: string[];
    expires_at: string | null;
  } | null;
}

export const EditApiKeyDialog: React.FC<EditApiKeyDialogProps> = ({
  open,
  onOpenChange,
  onKeyUpdated,
  apiKey,
}) => {
  const [rateLimit, setRateLimit] = useState('60');
  const [allowedIps, setAllowedIps] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);

  const [registryApis, setRegistryApis] = useState<RegistryEntry[]>([]);
  const [selectedApiIds, setSelectedApiIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingScopes, setLoadingScopes] = useState(false);

  useEffect(() => {
    if (open && apiKey) {
      setRateLimit(String(apiKey.rate_limit_per_minute));
      setAllowedIps(apiKey.allowed_ip_addresses?.join(', ') || '');
      setExpiresAt(apiKey.expires_at ? apiKey.expires_at.slice(0, 16) : '');
      fetchRegistryApis();
      fetchExistingScopes(apiKey.id);
    }
  }, [open, apiKey]);

  const fetchRegistryApis = async () => {
    const { data } = await supabase
      .from('api_registry')
      .select('id, api_name, api_version, http_method, endpoint_path, description, is_enabled')
      .order('sort_order');
    setRegistryApis(data || []);
  };

  const fetchExistingScopes = async (keyId: string) => {
    setLoadingScopes(true);
    const { data } = await supabase
      .from('api_key_scope_assignments')
      .select('api_registry_id')
      .eq('api_key_id', keyId)
      .eq('is_allowed', true);
    setSelectedApiIds((data || []).map(d => d.api_registry_id));
    setLoadingScopes(false);
  };

  const toggleApi = (id: string, isEnabled: boolean) => {
    if (!isEnabled) return;
    setSelectedApiIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredApis = registryApis.filter(api =>
    `${api.api_name} ${api.endpoint_path} ${api.http_method}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async () => {
    if (!apiKey) return;
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('manage-api-keys', {
        body: {
          action: 'update',
          key_id: apiKey.id,
          rate_limit_per_minute: parseInt(rateLimit) || 60,
          allowed_ip_addresses: allowedIps ? allowedIps.split(',').map(ip => ip.trim()) : [],
          expires_at: expiresAt || null,
          scope_api_registry_ids: selectedApiIds,
        },
      });

      if (response.error) throw response.error;
      toast.success('API key updated successfully');
      onKeyUpdated();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update API key');
    } finally {
      setLoading(false);
    }
  };

  const methodColor = (m: string) => {
    switch (m) {
      case 'GET': return 'default';
      case 'POST': return 'secondary';
      case 'PUT': return 'outline';
      case 'DELETE': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit API Key — {apiKey?.app_name}</DialogTitle>
          <DialogDescription>Update settings and endpoint permissions for this API key.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="edit_rate_limit">Rate Limit (requests/minute)</Label>
            <Input id="edit_rate_limit" type="number" value={rateLimit} onChange={e => setRateLimit(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit_allowed_ips">Allowed IP Addresses (comma-separated, empty = all)</Label>
            <Input id="edit_allowed_ips" value={allowedIps} onChange={e => setAllowedIps(e.target.value)} placeholder="192.168.1.1, 10.0.0.1" />
          </div>
          <div>
            <Label htmlFor="edit_expires_at">Expiry Date (optional)</Label>
            <Input id="edit_expires_at" type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </div>

          <div>
            <Label className="mb-2 block">Allowed API Endpoints ({selectedApiIds.length} selected)</Label>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search APIs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
            </div>
            <ScrollArea className="h-[200px] rounded-md border p-2">
              {loadingScopes ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : filteredApis.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No APIs found.</p>
              ) : (
                filteredApis.map(api => (
                  <div
                    key={api.id}
                    className={`flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 ${!api.is_enabled ? 'opacity-50' : ''}`}
                  >
                    <Checkbox
                      checked={selectedApiIds.includes(api.id)}
                      onCheckedChange={() => toggleApi(api.id, api.is_enabled)}
                      disabled={!api.is_enabled}
                    />
                    <Badge variant={methodColor(api.http_method)} className="text-xs min-w-[50px] justify-center">
                      {api.http_method}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{api.api_name} <span className="text-muted-foreground text-xs">v{api.api_version}</span></p>
                      <p className="text-xs text-muted-foreground truncate">{api.endpoint_path}</p>
                    </div>
                    {!api.is_enabled && (
                      <Badge variant="outline" className="text-xs">Disabled</Badge>
                    )}
                    {!api.is_enabled && selectedApiIds.includes(api.id) && (
                      <Badge variant="destructive" className="text-xs">Assigned but disabled</Badge>
                    )}
                  </div>
                ))
              )}
            </ScrollArea>
            <p className="text-xs text-muted-foreground mt-1">Leave empty to allow all endpoints.</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
