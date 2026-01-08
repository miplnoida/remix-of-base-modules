import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, MessageSquare, Smartphone, Save, Search, User } from "lucide-react";
import { useUserProfiles } from "@/hooks/useAdminData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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

const UserNotificationPreferences = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [preferences, setPreferences] = useState<Record<string, NotificationPreference>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: loadingUsers } = useUserProfiles();

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch user's notification preferences
  const { data: savedPreferences = [], isLoading: loadingPrefs, refetch: refetchPrefs } = useQuery({
    queryKey: ['admin-user-notification-preferences', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', selectedUserId);
      if (error) throw error;
      return data as NotificationPreference[];
    },
    enabled: !!selectedUserId,
  });

  // Initialize preferences when user or saved data changes
  useEffect(() => {
    if (!selectedUserId) return;
    
    const prefMap: Record<string, NotificationPreference> = {};
    NOTIFICATION_TYPES.forEach(type => {
      const saved = savedPreferences?.find(p => p.notification_type === type.key);
      if (saved) {
        prefMap[type.key] = saved;
      } else {
        prefMap[type.key] = {
          id: '',
          user_id: selectedUserId,
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
  }, [savedPreferences, selectedUserId]);

  const savePreferences = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error('No user selected');
      
      const upserts = Object.values(preferences).map(pref => ({
        user_id: selectedUserId,
        channel: pref.preferred_channel as Channel,
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
      queryClient.invalidateQueries({ queryKey: ['admin-user-notification-preferences', selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-notification-preferences', selectedUserId] });
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

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setHasChanges(false);
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Notification Preferences</h1>
        <p className="text-muted-foreground mt-1">Manage notification settings for specific users</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Select User
            </CardTitle>
            <CardDescription>Search and select a user to manage their preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-1">
              {loadingUsers ? (
                <p className="text-muted-foreground text-center py-4">Loading users...</p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No users found</p>
              ) : (
                filteredUsers.slice(0, 50).map(user => (
                  <div
                    key={user.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedUserId === user.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => handleUserSelect(user.id)}
                  >
                    <p className="font-medium text-sm">{user.full_name || 'No name'}</p>
                    <p className={`text-xs ${selectedUserId === user.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {user.email}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preferences Editor - Same layout as NotificationPreferences */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  {selectedUser 
                    ? `Configure notifications for ${selectedUser.full_name || selectedUser.email}` 
                    : 'Select a user to manage their preferences'}
                </CardDescription>
              </div>
              {selectedUserId && (
                <Button 
                  onClick={() => savePreferences.mutate()} 
                  disabled={!hasChanges || savePreferences.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {savePreferences.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedUserId ? (
              <p className="text-muted-foreground text-center py-12">
                Select a user from the list to view and edit their notification preferences.
              </p>
            ) : loadingPrefs ? (
              <p className="text-center py-12">Loading preferences...</p>
            ) : (
              <div className="space-y-6">
                {selectedUser && (
                  <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {selectedUser.full_name?.charAt(0) || selectedUser.email?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{selectedUser.full_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    </div>
                    {savedPreferences.length === 0 && (
                      <Badge variant="outline" className="ml-auto">No preferences set</Badge>
                    )}
                  </div>
                )}

                {/* Channel Preferences Table - Same as user's NotificationPreferences */}
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

                {/* Quick Actions */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3">Quick Actions</h3>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => toggleAllForChannel('email', true)}>
                      Enable All Email
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleAllForChannel('email', false)}>
                      Disable All Email
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleAllForChannel('in_app', true)}>
                      Enable All In-App
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleAllForChannel('in_app', false)}>
                      Disable All In-App
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserNotificationPreferences;
