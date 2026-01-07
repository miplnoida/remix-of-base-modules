import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, Mail, MessageSquare, Smartphone, Save } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

type Channel = 'email' | 'sms' | 'push' | 'in_app';

interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  preferred_channel: Channel;
}

const NOTIFICATION_TYPES = [
  { key: 'system_alerts', label: 'System Alerts', description: 'Critical system notifications and updates' },
  { key: 'security', label: 'Security', description: 'Login attempts, password changes, security events' },
  { key: 'account', label: 'Account Updates', description: 'Profile changes, role assignments' },
  { key: 'workflow', label: 'Workflow', description: 'Task assignments, approvals, reminders' },
  { key: 'reports', label: 'Reports', description: 'Report generation, scheduled reports' },
  { key: 'marketing', label: 'Marketing', description: 'News, announcements, feature updates' },
];

const CHANNEL_ICONS = {
  email: Mail,
  sms: MessageSquare,
  push: Smartphone,
  in_app: Bell,
};

const NotificationPreferences = () => {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<Record<string, NotificationPreference>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: savedPreferences = [], isLoading } = useQuery({
    queryKey: ['user-notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as NotificationPreference[];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    const prefMap: Record<string, NotificationPreference> = {};
    NOTIFICATION_TYPES.forEach(type => {
      const saved = savedPreferences.find(p => p.notification_type === type.key);
      if (saved) {
        prefMap[type.key] = saved;
      } else {
        prefMap[type.key] = {
          id: '',
          user_id: user?.id || '',
          notification_type: type.key,
          email_enabled: true,
          sms_enabled: false,
          push_enabled: false,
          in_app_enabled: true,
          preferred_channel: 'email',
        };
      }
    });
    setPreferences(prefMap);
    setHasChanges(false);
  }, [savedPreferences, user?.id]);

  const savePreferences = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const upserts = Object.values(preferences).map(pref => ({
        user_id: user.id,
        channel: 'email' as const,
        notification_type: pref.notification_type,
        email_enabled: pref.email_enabled,
        sms_enabled: pref.sms_enabled,
        push_enabled: pref.push_enabled,
        in_app_enabled: pref.in_app_enabled,
        preferred_channel: pref.preferred_channel,
      }));

      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert(upserts, { onConflict: 'user_id,notification_type' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notification-preferences', user?.id] });
      toast.success('Preferences saved successfully');
      setHasChanges(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updatePreference = (type: string, field: keyof NotificationPreference, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
    setHasChanges(true);
  };

  const toggleAllForChannel = (channel: Channel, enabled: boolean) => {
    const field = `${channel}_enabled` as keyof NotificationPreference;
    const updated = { ...preferences };
    Object.keys(updated).forEach(key => {
      (updated[key] as any)[field] = enabled;
    });
    setPreferences(updated);
    setHasChanges(true);
  };

  if (isLoading) {
    return <div className="container mx-auto p-6">Loading preferences...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notification Preferences</h1>
          <p className="text-muted-foreground mt-1">Manage how you receive notifications</p>
        </div>
        <Button onClick={() => savePreferences.mutate()} disabled={!hasChanges || savePreferences.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {savePreferences.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Channel Preferences</CardTitle>
          <CardDescription>Choose which channels to receive notifications on for each type</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-64">Notification Type</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Mail className="h-4 w-4" /> Email
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <MessageSquare className="h-4 w-4" /> SMS
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Smartphone className="h-4 w-4" /> Push
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Bell className="h-4 w-4" /> In-App
                  </div>
                </TableHead>
                <TableHead>Preferred</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {NOTIFICATION_TYPES.map((type) => {
                const pref = preferences[type.key];
                if (!pref) return null;
                return (
                  <TableRow key={type.key}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{type.label}</p>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={pref.email_enabled}
                        onCheckedChange={(v) => updatePreference(type.key, 'email_enabled', v)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={pref.sms_enabled}
                        onCheckedChange={(v) => updatePreference(type.key, 'sms_enabled', v)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={pref.push_enabled}
                        onCheckedChange={(v) => updatePreference(type.key, 'push_enabled', v)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={pref.in_app_enabled}
                        onCheckedChange={(v) => updatePreference(type.key, 'in_app_enabled', v)}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={pref.preferred_channel}
                        onValueChange={(v) => updatePreference(type.key, 'preferred_channel', v as Channel)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="push">Push</SelectItem>
                          <SelectItem value="in_app">In-App</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Quickly enable or disable all notifications for a channel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <Button variant="outline" onClick={() => toggleAllForChannel('email', true)}>
              Enable All Email
            </Button>
            <Button variant="outline" onClick={() => toggleAllForChannel('email', false)}>
              Disable All Email
            </Button>
            <Button variant="outline" onClick={() => toggleAllForChannel('in_app', true)}>
              Enable All In-App
            </Button>
            <Button variant="outline" onClick={() => toggleAllForChannel('in_app', false)}>
              Disable All In-App
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationPreferences;
