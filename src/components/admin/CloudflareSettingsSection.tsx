import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ShieldCheck, AlertTriangle, Save, RefreshCw, Monitor } from 'lucide-react';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { useUserCode } from '@/hooks/useUserCode';
import { logAuditTrail } from '@/services/auditService';
import { toast } from 'sonner';

const CloudflareSettingsSection: React.FC = () => {
  const { data: enabledValue, isLoading: loadingEnabled } = useSystemSetting('cloudflare_enabled');
  const { data: riskValue, isLoading: loadingRisk } = useSystemSetting('cloudflare_allowed_risk_level');
  const updateSetting = useUpdateSystemSetting();
  const { userCode } = useUserCode();

  const [isEnabled, setIsEnabled] = useState(true);
  const [riskLevel, setRiskLevel] = useState('LOW');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (enabledValue !== undefined) setIsEnabled(enabledValue === 'true');
  }, [enabledValue]);

  useEffect(() => {
    if (riskValue !== undefined) setRiskLevel(riskValue);
  }, [riskValue]);

  const isPreview = window.location.hostname.includes('preview') || window.location.hostname.includes('localhost');

  const handleToggle = (checked: boolean) => {
    setIsEnabled(checked);
    setHasChanges(true);
  };

  const handleRiskChange = (value: string) => {
    setRiskLevel(value);
    setHasChanges(true);
  };

  const logCloudflareAudit = async (action: string, oldValue: string, newValue: string) => {
    await logAuditTrail({
      action,
      entityType: 'cloudflare',
      entityId: 'cloudflare_settings',
      module: 'Global Settings',
      beforeValue: { value: oldValue },
      afterValue: { value: newValue },
      userCode: userCode || 'SYSTEM',
      metadata: { setting: 'cloudflare_verification', source: '/admin/global-settings' },
    });
  };

  const handleSave = async () => {
    try {
      const currentEnabled = enabledValue === 'true';
      const currentRisk = riskValue || 'LOW';

      if (isEnabled !== currentEnabled) {
        await updateSetting.mutateAsync({
          settingKey: 'cloudflare_enabled',
          settingValue: String(isEnabled),
          userCode: userCode || undefined,
        });
        await logCloudflareAudit(
          isEnabled ? 'enable' : 'disable',
          String(currentEnabled),
          String(isEnabled)
        );
      }

      if (riskLevel !== currentRisk) {
        await updateSetting.mutateAsync({
          settingKey: 'cloudflare_allowed_risk_level',
          settingValue: riskLevel,
          userCode: userCode || undefined,
        });
        await logCloudflareAudit('update', currentRisk, riskLevel);
      }

      setHasChanges(false);
      toast.success('Cloudflare settings saved successfully');
    } catch (err) {
      console.error('Failed to save Cloudflare settings:', err);
      toast.error('Failed to save settings');
    }
  };

  if (loadingEnabled || loadingRisk) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Loading Cloudflare settings...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Cloudflare Human Verification
        </CardTitle>
        <CardDescription>
          Control Cloudflare Turnstile human verification behavior for login security
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Environment indicator */}
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Current Environment:</span>
          <Badge variant={isPreview ? 'secondary' : 'default'}>
            {isPreview ? 'Preview' : 'Production'}
          </Badge>
        </div>

        {/* Enable/Disable toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-1">
            <Label className="text-base font-medium">Enable Cloudflare Verification</Label>
            <p className="text-sm text-muted-foreground">
              Enforce human verification during login to prevent automated attacks
            </p>
          </div>
          <Switch checked={isEnabled} onCheckedChange={handleToggle} />
        </div>

        {/* Warning when disabled */}
        {!isEnabled && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Warning:</strong> Disabling Cloudflare human verification weakens login security
              in Production. Automated attacks and bots will not be blocked. Enable this setting unless
              troubleshooting is required.
            </AlertDescription>
          </Alert>
        )}

        {/* Risk level selector */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Allowed Risk Level</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Determines which risk levels are permitted to proceed with login
          </p>
          <Select value={riskLevel} onValueChange={handleRiskChange} disabled={!isEnabled}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low risk only (most restrictive)</SelectItem>
              <SelectItem value="MEDIUM">Low + Medium risk</SelectItem>
              <SelectItem value="HIGH">All risks — Low, Medium, High (least restrictive)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Save button */}
        {hasChanges && (
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={updateSetting.isPending}>
              {updateSetting.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CloudflareSettingsSection;
