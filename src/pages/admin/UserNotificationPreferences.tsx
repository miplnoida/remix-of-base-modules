import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Search, Save, User } from "lucide-react";
import { useUserProfiles } from "@/hooks/useAdminData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface UserNotificationPreference {
  id: string;
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  preferred_channel: string | null;
}

const UserNotificationPreferences = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: loadingUsers } = useUserProfiles();

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { data: preferences, isLoading: loadingPrefs } = useQuery({
    queryKey: ['user-notification-preferences', selectedUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', selectedUserId)
        .maybeSingle();
      if (error) throw error;
      return data as UserNotificationPreference | null;
    },
    enabled: !!selectedUserId,
  });

  const [form, setForm] = useState({
    email_enabled: true,
    sms_enabled: false,
    push_enabled: true,
    in_app_enabled: true,
    preferred_channel: 'email',
  });

  // Update form when preferences load
  useState(() => {
    if (preferences) {
      setForm({
        email_enabled: preferences.email_enabled,
        sms_enabled: preferences.sms_enabled,
        push_enabled: preferences.push_enabled,
        in_app_enabled: preferences.in_app_enabled,
        preferred_channel: preferences.preferred_channel || 'email',
      });
    }
  });

  const savePreferences = useMutation({
    mutationFn: async () => {
      if (preferences) {
        // Update existing
        const { error } = await supabase
          .from('user_notification_preferences')
          .update({
            email_enabled: form.email_enabled,
            sms_enabled: form.sms_enabled,
            push_enabled: form.push_enabled,
            in_app_enabled: form.in_app_enabled,
            preferred_channel: form.preferred_channel,
            updated_at: new Date().toISOString(),
          })
          .eq('id', preferences.id);
        if (error) throw error;
      } else {
        // Create new - use upsert with channel to satisfy required field
        const { error } = await supabase
          .from('user_notification_preferences')
          .insert({
            user_id: selectedUserId,
            channel: 'email' as const,
            email_enabled: form.email_enabled,
            sms_enabled: form.sms_enabled,
            push_enabled: form.push_enabled,
            in_app_enabled: form.in_app_enabled,
            preferred_channel: form.preferred_channel,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notification-preferences', selectedUserId] });
      toast.success('Preferences saved successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const selectedUser = users.find(u => u.id === selectedUserId);

  // Reset form when user changes or preferences load
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    // Reset form to defaults - will be updated by query
    setForm({
      email_enabled: true,
      sms_enabled: false,
      push_enabled: true,
      in_app_enabled: true,
      preferred_channel: 'email',
    });
  };

  // Update form when preferences data changes
  if (preferences && form.email_enabled !== preferences.email_enabled) {
    setForm({
      email_enabled: preferences.email_enabled,
      sms_enabled: preferences.sms_enabled,
      push_enabled: preferences.push_enabled,
      in_app_enabled: preferences.in_app_enabled,
      preferred_channel: preferences.preferred_channel || 'email',
    });
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Notification Preferences</h1>
        <p className="text-muted-foreground mt-1">Manage notification settings for specific users</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
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

        {/* Preferences Editor */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              {selectedUser 
                ? `Configure notifications for ${selectedUser.full_name || selectedUser.email}` 
                : 'Select a user to manage their preferences'}
            </CardDescription>
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
                    {!preferences && (
                      <Badge variant="outline" className="ml-auto">No preferences set</Badge>
                    )}
                  </div>
                )}

                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={form.email_enabled}
                      onCheckedChange={(checked) => setForm({ ...form, email_enabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                    </div>
                    <Switch
                      checked={form.sms_enabled}
                      onCheckedChange={(checked) => setForm({ ...form, sms_enabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive push notifications in browser</p>
                    </div>
                    <Switch
                      checked={form.push_enabled}
                      onCheckedChange={(checked) => setForm({ ...form, push_enabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">In-App Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications within the app</p>
                    </div>
                    <Switch
                      checked={form.in_app_enabled}
                      onCheckedChange={(checked) => setForm({ ...form, in_app_enabled: checked })}
                    />
                  </div>

                  <div className="p-4 border rounded-lg">
                    <Label className="text-base">Preferred Channel</Label>
                    <p className="text-sm text-muted-foreground mb-3">Primary channel for urgent notifications</p>
                    <Select value={form.preferred_channel} onValueChange={(v) => setForm({ ...form, preferred_channel: v })}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="push">Push</SelectItem>
                        <SelectItem value="in_app">In-App</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => savePreferences.mutate()} disabled={savePreferences.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {savePreferences.isPending ? 'Saving...' : 'Save Preferences'}
                  </Button>
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
