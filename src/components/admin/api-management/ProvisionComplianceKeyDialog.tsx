import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Copy, Check, Eye, EyeOff, ShieldAlert, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onProvisioned: () => void;
}

const ProvisionComplianceKeyDialog: React.FC<Props> = ({ open, onOpenChange, onProvisioned }) => {
  const [appName, setAppName] = useState('Compliance Mobile App');
  const [rateLimit, setRateLimit] = useState('120');
  const [allowedIps, setAllowedIps] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setAppName('Compliance Mobile App');
    setRateLimit('120');
    setAllowedIps('');
    setGeneratedKey('');
    setShowKey(false);
    setCopied(false);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleProvision = async () => {
    if (!appName.trim()) {
      toast.error('Application name is required');
      return;
    }
    setLoading(true);
    try {
      // Get all compliance-mobile-* endpoint IDs
      const { data: registry, error: rErr } = await supabase
        .from('api_registry')
        .select('id')
        .like('category', 'compliance-mobile%');
      if (rErr) throw rErr;

      const scopeIds = (registry || []).map((r) => r.id);
      if (scopeIds.length === 0) {
        toast.error('No compliance-mobile endpoints registered. Cannot provision.');
        setLoading(false);
        return;
      }

      const ipList = allowedIps
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await supabase.functions.invoke('manage-api-keys', {
        body: {
          action: 'generate',
          app_name: appName.trim(),
          rate_limit_per_minute: parseInt(rateLimit, 10) || 120,
          allowed_endpoints: [],
          allowed_ip_addresses: ipList,
          scope_api_registry_ids: scopeIds,
        },
      });
      if (res.error) throw res.error;
      if (res.data?.status !== 'success') throw new Error(res.data?.message || 'Failed');

      setGeneratedKey(res.data.data.plain_key);
      toast.success(`Provisioned key with access to ${scopeIds.length} compliance endpoints`);
      onProvisioned();
    } catch (e: any) {
      toast.error(e.message || 'Failed to provision key');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Provision Compliance Mobile API Key
          </DialogTitle>
          <DialogDescription>
            One-click setup: generates an API key automatically scoped to all{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">compliance-mobile-*</code>{' '}
            endpoints for use in the field-officer mobile app.
          </DialogDescription>
        </DialogHeader>

        {!generatedKey ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="appName">Application Name *</Label>
              <Input
                id="appName"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Compliance Mobile App"
              />
            </div>

            <div>
              <Label htmlFor="rateLimit">Rate Limit (requests / minute)</Label>
              <Input
                id="rateLimit"
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(e.target.value)}
                min="10"
                max="600"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Recommended: 60–120 for mobile field use.
              </p>
            </div>

            <div>
              <Label htmlFor="ips">Allowed IPs (optional, comma-separated)</Label>
              <Input
                id="ips"
                value={allowedIps}
                onChange={(e) => setAllowedIps(e.target.value)}
                placeholder="e.g. 192.168.1.0/24, 203.0.113.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank to allow all IPs. Use CIDR or specific IPs to restrict access.
              </p>
            </div>

            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle className="text-sm">Security note</AlertTitle>
              <AlertDescription className="text-xs">
                The mobile app must send this as the <code>X-API-Key</code> header along with each
                officer's <code>Authorization: Bearer &lt;JWT&gt;</code>. The raw key is shown
                only once — store it securely (env var / secret store).
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Save this key now</AlertTitle>
              <AlertDescription className="text-xs">
                This is the only time the full key will be shown. After you close this dialog,
                only the prefix will be visible.
              </AlertDescription>
            </Alert>

            <div>
              <Label>Your API Key</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={showKey ? generatedKey : '•'.repeat(40)}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="text-xs space-y-1 bg-muted/50 p-3 rounded">
              <p className="font-semibold">Use it like this in your mobile app:</p>
              <pre className="text-[11px] overflow-x-auto">
{`headers: {
  "X-API-Key": "${showKey ? generatedKey : '••••••••'}",
  "Authorization": "Bearer <officer JWT>",
  "Content-Type": "application/json"
}`}
              </pre>
            </div>
          </div>
        )}

        <DialogFooter>
          {!generatedKey ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleProvision} disabled={loading}>
                {loading ? 'Provisioning…' : 'Generate Key'}
              </Button>
            </>
          ) : (
            <Button onClick={() => handleClose(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProvisionComplianceKeyDialog;
