import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Eye, EyeOff, Search } from 'lucide-react';
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

interface GenerateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeyGenerated: () => void;
}

export const GenerateApiKeyDialog: React.FC<GenerateApiKeyDialogProps> = ({
  open,
  onOpenChange,
  onKeyGenerated,
}) => {
  const [appName, setAppName] = useState('');
  const [rateLimit, setRateLimit] = useState('60');
  const [allowedIps, setAllowedIps] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const [registryApis, setRegistryApis] = useState<RegistryEntry[]>([]);
  const [selectedApiIds, setSelectedApiIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (open) {
      fetchRegistryApis();
    }
  }, [open]);

  const fetchRegistryApis = async () => {
    const { data } = await supabase
      .from('api_registry')
      .select('id, api_name, api_version, http_method, endpoint_path, description, is_enabled')
      .order('sort_order');
    setRegistryApis(data || []);
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

  const handleGenerate = async () => {
    if (!appName.trim()) {
      toast.error('Application name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('manage-api-keys', {
        body: {
          action: 'generate',
          app_name: appName.trim(),
          rate_limit_per_minute: parseInt(rateLimit) || 60,
          allowed_endpoints: [],
          allowed_ip_addresses: allowedIps ? allowedIps.split(',').map(ip => ip.trim()) : [],
          expires_at: expiresAt || null,
          scope_api_registry_ids: selectedApiIds,
        },
      });

      if (response.error) throw response.error;
      const result = response.data;
      if (result.status === 'success') {
        setGeneratedKey(result.data.plain_key);
        toast.success('API key generated successfully');
        onKeyGenerated();
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate API key');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setAppName('');
    setRateLimit('60');
    setAllowedIps('');
    setExpiresAt('');
    setGeneratedKey('');
    setShowKey(false);
    setSelectedApiIds([]);
    setSearchTerm('');
    onOpenChange(false);
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate New API Key</DialogTitle>
          <DialogDescription>Create a new API key and assign endpoint access.</DialogDescription>
        </DialogHeader>

        {generatedKey ? (
          <div className="space-y-4">
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm font-medium text-destructive mb-2">
                ⚠️ Copy this key now — it won't be shown again!
              </p>
              <div className="flex items-center gap-2">
                <Input readOnly value={showKey ? generatedKey : '•'.repeat(generatedKey.length)} className="font-mono text-xs" />
                <Button size="icon" variant="outline" onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="app_name">Application Name *</Label>
              <Input id="app_name" value={appName} onChange={e => setAppName(e.target.value)} placeholder="e.g. Mobile App, Partner Portal" />
            </div>
            <div>
              <Label htmlFor="rate_limit">Rate Limit (requests/minute)</Label>
              <Input id="rate_limit" type="number" value={rateLimit} onChange={e => setRateLimit(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="allowed_ips">Allowed IP Addresses (comma-separated, empty = all)</Label>
              <Input id="allowed_ips" value={allowedIps} onChange={e => setAllowedIps(e.target.value)} placeholder="192.168.1.1, 10.0.0.1" />
            </div>
            <div>
              <Label htmlFor="expires_at">Expiry Date (optional)</Label>
              <Input id="expires_at" type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </div>

            {/* API Endpoint Permissions */}
            <div>
              <Label className="mb-2 block">Allowed API Endpoints ({selectedApiIds.length} selected)</Label>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search APIs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
              </div>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                {filteredApis.length === 0 ? (
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
                      {!api.is_enabled && <Badge variant="outline" className="text-xs">Disabled</Badge>}
                    </div>
                  ))
                )}
              </ScrollArea>
              <p className="text-xs text-muted-foreground mt-1">Leave empty to allow all endpoints. Disabled APIs cannot be selected.</p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Key'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
