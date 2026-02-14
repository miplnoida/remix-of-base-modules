import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [allowedEndpoints, setAllowedEndpoints] = useState('');
  const [allowedIps, setAllowedIps] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleGenerate = async () => {
    if (!appName.trim()) {
      toast.error('Application name is required');
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await supabase.functions.invoke('manage-api-keys', {
        body: {
          action: 'generate',
          app_name: appName.trim(),
          rate_limit_per_minute: parseInt(rateLimit) || 60,
          allowed_endpoints: allowedEndpoints
            ? allowedEndpoints.split(',').map((e) => e.trim())
            : [],
          allowed_ip_addresses: allowedIps
            ? allowedIps.split(',').map((ip) => ip.trim())
            : [],
          expires_at: expiresAt || null,
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
    setAllowedEndpoints('');
    setAllowedIps('');
    setExpiresAt('');
    setGeneratedKey('');
    setShowKey(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate New API Key</DialogTitle>
          <DialogDescription>
            Create a new API key for external application access.
          </DialogDescription>
        </DialogHeader>

        {generatedKey ? (
          <div className="space-y-4">
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm font-medium text-destructive mb-2">
                ⚠️ Copy this key now — it won't be shown again!
              </p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={showKey ? generatedKey : '•'.repeat(generatedKey.length)}
                  className="font-mono text-xs"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setShowKey(!showKey)}
                >
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
              <Input
                id="app_name"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="e.g. Mobile App, Partner Portal"
              />
            </div>
            <div>
              <Label htmlFor="rate_limit">Rate Limit (requests/minute)</Label>
              <Input
                id="rate_limit"
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="allowed_endpoints">Allowed Endpoints (comma-separated, empty = all)</Label>
              <Input
                id="allowed_endpoints"
                value={allowedEndpoints}
                onChange={(e) => setAllowedEndpoints(e.target.value)}
                placeholder="/api/v1/ip-master/*, /api/v1/health"
              />
            </div>
            <div>
              <Label htmlFor="allowed_ips">Allowed IP Addresses (comma-separated, empty = all)</Label>
              <Input
                id="allowed_ips"
                value={allowedIps}
                onChange={(e) => setAllowedIps(e.target.value)}
                placeholder="192.168.1.1, 10.0.0.1"
              />
            </div>
            <div>
              <Label htmlFor="expires_at">Expiry Date (optional)</Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
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
