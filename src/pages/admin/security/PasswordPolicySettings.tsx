import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Shield, Save, Lock, Clock, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface PasswordPolicy {
  id: string;
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
  max_age_days: number;
  prevent_reuse_count: number;
  lockout_threshold: number;
  lockout_duration_minutes: number;
  session_timeout_minutes: number;
  idle_timeout_minutes: number;
  max_concurrent_sessions: number;
  auto_refresh_enabled: boolean;
  is_active: boolean;
}

const PasswordPolicySettings = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<PasswordPolicy>>({
    min_length: 8,
    require_uppercase: true,
    require_lowercase: true,
    require_numbers: true,
    require_special_chars: false,
    max_age_days: 90,
    prevent_reuse_count: 5,
    lockout_threshold: 5,
    lockout_duration_minutes: 30,
    session_timeout_minutes: 480,
    idle_timeout_minutes: 30,
    max_concurrent_sessions: 3,
    auto_refresh_enabled: true,
    is_active: true,
  });

  const { data: policy, isLoading } = useQuery({
    queryKey: ['password-policy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('password_policies')
        .select('*')
        .eq('is_active', true)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as PasswordPolicy | null;
    },
  });

  useEffect(() => {
    if (policy) {
      setFormData(policy);
    }
  }, [policy]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<PasswordPolicy>) => {
      if (policy?.id) {
        const { error } = await supabase
          .from('password_policies')
          .update(data)
          .eq('id', policy.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('password_policies')
          .insert({ ...data, is_active: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['password-policy'] });
      toast.success('Password policy saved successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading policy...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Password & Security Policy</h1>
        <p className="text-muted-foreground mt-1">Configure password requirements and security settings</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Password Complexity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Password Complexity
            </CardTitle>
            <CardDescription>Define password strength requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="min_length">Minimum Password Length</Label>
                <Input
                  id="min_length"
                  type="number"
                  min={6}
                  max={32}
                  value={formData.min_length}
                  onChange={(e) => setFormData({ ...formData, min_length: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prevent_reuse_count">Prevent Reuse (last N passwords)</Label>
                <Input
                  id="prevent_reuse_count"
                  type="number"
                  min={0}
                  max={24}
                  value={formData.prevent_reuse_count}
                  onChange={(e) => setFormData({ ...formData, prevent_reuse_count: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="require_uppercase">Uppercase</Label>
                <Switch
                  id="require_uppercase"
                  checked={formData.require_uppercase}
                  onCheckedChange={(checked) => setFormData({ ...formData, require_uppercase: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="require_lowercase">Lowercase</Label>
                <Switch
                  id="require_lowercase"
                  checked={formData.require_lowercase}
                  onCheckedChange={(checked) => setFormData({ ...formData, require_lowercase: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="require_numbers">Numbers</Label>
                <Switch
                  id="require_numbers"
                  checked={formData.require_numbers}
                  onCheckedChange={(checked) => setFormData({ ...formData, require_numbers: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="require_special_chars">Special Chars</Label>
                <Switch
                  id="require_special_chars"
                  checked={formData.require_special_chars}
                  onCheckedChange={(checked) => setFormData({ ...formData, require_special_chars: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Expiry */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Password Expiry
            </CardTitle>
            <CardDescription>Configure password aging settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="max_age_days">Maximum Password Age (days)</Label>
                <Input
                  id="max_age_days"
                  type="number"
                  min={0}
                  max={365}
                  value={formData.max_age_days}
                  onChange={(e) => setFormData({ ...formData, max_age_days: parseInt(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Set to 0 to disable password expiry</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Lockout */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Account Lockout
            </CardTitle>
            <CardDescription>Configure account lockout behavior</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="lockout_threshold">Failed Login Attempts Threshold</Label>
                <Input
                  id="lockout_threshold"
                  type="number"
                  min={1}
                  max={20}
                  value={formData.lockout_threshold}
                  onChange={(e) => setFormData({ ...formData, lockout_threshold: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lockout_duration_minutes">Lockout Duration (minutes)</Label>
                <Input
                  id="lockout_duration_minutes"
                  type="number"
                  min={1}
                  max={1440}
                  value={formData.lockout_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, lockout_duration_minutes: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Session Settings
            </CardTitle>
            <CardDescription>Configure session timeout and concurrency limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="session_timeout_minutes">Session Timeout (minutes)</Label>
                <Input
                  id="session_timeout_minutes"
                  type="number"
                  min={15}
                  max={1440}
                  value={formData.session_timeout_minutes}
                  onChange={(e) => setFormData({ ...formData, session_timeout_minutes: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="idle_timeout_minutes">Idle Timeout (minutes)</Label>
                <Input
                  id="idle_timeout_minutes"
                  type="number"
                  min={5}
                  max={120}
                  value={formData.idle_timeout_minutes}
                  onChange={(e) => setFormData({ ...formData, idle_timeout_minutes: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_concurrent_sessions">Max Concurrent Sessions</Label>
                <Input
                  id="max_concurrent_sessions"
                  type="number"
                  min={1}
                  max={10}
                  value={formData.max_concurrent_sessions}
                  onChange={(e) => setFormData({ ...formData, max_concurrent_sessions: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="auto_refresh_enabled">Auto-Refresh Token</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically refresh access tokens before expiry to prevent session interruptions
                </p>
              </div>
              <Switch
                id="auto_refresh_enabled"
                checked={formData.auto_refresh_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_refresh_enabled: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Policy'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PasswordPolicySettings;