/**
 * Security Policy Settings
 * Admin-only page for configuring security thresholds:
 * - Rate limiting per IP
 * - IP block duration
 * - Global attack thresholds
 * - Lockdown enable/disable
 * - PII masking settings
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Shield, ShieldAlert, Lock, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { logAuditTrail } from '@/services/auditService';
import { invalidateSecurityConfigCache } from '@/services/securityPolicyService';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';

interface ConfigRow {
  id: string;
  config_key: string;
  config_value: string;
  display_name: string;
  description: string | null;
  category: string;
  data_type: string;
}

const SecurityPolicySettings: React.FC = () => {
  const { user, profile } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['security-policy-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_policy_config')
        .select('*')
        .order('category', { ascending: true });
      if (error) throw error;
      return data as ConfigRow[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(editedValues);
      if (updates.length === 0) return;

      for (const [key, value] of updates) {
        const original = configs.find(c => c.config_key === key);
        
        const { error } = await supabase
          .from('security_policy_config')
          .update({
            config_value: value,
            updated_at: new Date().toISOString(),
            updated_by: profile?.user_code || user?.id || 'unknown',
          })
          .eq('config_key', key);

        if (error) throw error;

        await logAuditTrail({
          action: 'update',
          entityType: 'security_policy_config',
          entityId: key,
          module: 'Security Settings',
          beforeValue: { [key]: original?.config_value },
          afterValue: { [key]: value },
          userCode: profile?.user_code || undefined,
          userId: user?.id,
        });
      }
    },
    onSuccess: () => {
      invalidateSecurityConfigCache();
      queryClient.invalidateQueries({ queryKey: ['security-policy-config'] });
      queryClient.invalidateQueries({ queryKey: ['security-config-pii'] });
      setEditedValues({});
      toast.success('Security settings saved successfully');
    },
    onError: (err: Error) => {
      toast.error('Failed to save settings', { description: err.message });
    },
  });

  const getValue = (key: string) => {
    if (key in editedValues) return editedValues[key];
    return configs.find(c => c.config_key === key)?.config_value || '';
  };

  const handleChange = (key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const hasChanges = Object.keys(editedValues).length > 0;

  const categories = [
    { key: 'rate_limiting', label: 'Rate Limiting & IP Blocking', icon: ShieldAlert },
    { key: 'lockdown', label: 'Application Lockdown', icon: Lock },
    { key: 'pii', label: 'PII Masking', icon: Eye },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PermissionWrapper moduleName="security_policy_settings">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Security Policy Settings
            </h1>
            <p className="text-muted-foreground">Configure application security thresholds and policies</p>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                Unsaved changes
              </Badge>
            )}
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        {categories.map(cat => {
          const Icon = cat.icon;
          const catConfigs = configs.filter(c => c.category === cat.key);
          if (catConfigs.length === 0) return null;

          return (
            <Card key={cat.key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5" />
                  {cat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {catConfigs.map(config => (
                    <div key={config.config_key} className="space-y-2">
                      <Label htmlFor={config.config_key}>{config.display_name}</Label>
                      {config.data_type === 'boolean' ? (
                        <div className="flex items-center gap-3">
                          <Switch
                            id={config.config_key}
                            checked={getValue(config.config_key) === 'true'}
                            onCheckedChange={(checked) => handleChange(config.config_key, String(checked))}
                          />
                          <span className="text-sm text-muted-foreground">
                            {getValue(config.config_key) === 'true' ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      ) : (
                        <Input
                          id={config.config_key}
                          type="number"
                          value={getValue(config.config_key)}
                          onChange={(e) => handleChange(config.config_key, e.target.value)}
                        />
                      )}
                      {config.description && (
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Emergency Recovery */}
        <EmergencyRecoveryCard />
      </div>
    </PermissionWrapper>
  );
};

const EmergencyRecoveryCard: React.FC = () => {
  const { user, profile } = useSupabaseAuth();
  const queryClient = useQueryClient();

  const { data: lockdownState, isLoading } = useQuery({
    queryKey: ['app-lockdown-state'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_lockdown_state')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const liftMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('app_lockdown_state')
        .update({
          is_locked: false,
          unlocked_at: new Date().toISOString(),
          unlocked_by: profile?.user_code || user?.id || 'admin',
          unlock_reason: 'Manual admin override',
          updated_at: new Date().toISOString(),
        })
        .eq('is_locked', true);
      if (error) throw error;

      await logAuditTrail({
        action: 'emergency_lockdown_lift',
        entityType: 'app_lockdown_state',
        module: 'Security',
        userCode: profile?.user_code || undefined,
        userId: user?.id,
        metadata: { reason: 'Manual admin override' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-lockdown-state'] });
      toast.success('Application lockdown has been lifted');
    },
    onError: (err: Error) => {
      toast.error('Failed to lift lockdown', { description: err.message });
    },
  });

  return (
    <Card className={lockdownState?.is_locked ? 'border-destructive' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldAlert className="h-5 w-5" />
          Emergency Recovery
        </CardTitle>
        <CardDescription>
          {lockdownState?.is_locked
            ? 'Application is currently in LOCKDOWN mode. Only admins can access the system.'
            : 'Application is operating normally.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Badge variant={lockdownState?.is_locked ? 'destructive' : 'default'}>
            {lockdownState?.is_locked ? 'LOCKED DOWN' : 'NORMAL'}
          </Badge>
          {lockdownState?.is_locked && (
            <>
              <span className="text-sm text-muted-foreground">
                {lockdownState.locked_reason}
              </span>
              <Button
                variant="destructive"
                onClick={() => liftMutation.mutate()}
                disabled={liftMutation.isPending}
              >
                {liftMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Lift Lockdown
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SecurityPolicySettings;
