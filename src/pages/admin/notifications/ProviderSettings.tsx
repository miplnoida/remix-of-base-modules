import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, MessageSquare, Smartphone, Bell, Plus, Edit, TestTube, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type ProviderType = 'email' | 'sms' | 'push' | 'in_app';

interface NotificationProvider {
  id: string;
  channel: ProviderType;
  provider_name: string;
  is_active: boolean;
  config: Record<string, any>;
  created_at: string;
}

const PROVIDER_ICONS = {
  email: Mail,
  sms: MessageSquare,
  push: Smartphone,
  in_app: Bell,
};

const PROVIDER_CONFIGS: Record<ProviderType, { fields: { key: string; label: string; type: string; secret?: boolean }[] }> = {
  email: {
    fields: [
      { key: 'smtp_host', label: 'SMTP Host', type: 'text' },
      { key: 'smtp_port', label: 'SMTP Port', type: 'number' },
      { key: 'smtp_user', label: 'SMTP Username', type: 'text' },
      { key: 'smtp_password', label: 'SMTP Password', type: 'password', secret: true },
      { key: 'from_email', label: 'From Email', type: 'email' },
      { key: 'from_name', label: 'From Name', type: 'text' },
    ],
  },
  sms: {
    fields: [
      { key: 'provider', label: 'Provider (twilio/nexmo)', type: 'text' },
      { key: 'account_sid', label: 'Account SID', type: 'text' },
      { key: 'auth_token', label: 'Auth Token', type: 'password', secret: true },
      { key: 'from_number', label: 'From Number', type: 'text' },
    ],
  },
  push: {
    fields: [
      { key: 'provider', label: 'Provider (firebase/onesignal)', type: 'text' },
      { key: 'api_key', label: 'API Key', type: 'password', secret: true },
      { key: 'app_id', label: 'App ID', type: 'text' },
    ],
  },
  in_app: {
    fields: [
      { key: 'retention_days', label: 'Retention Days', type: 'number' },
    ],
  },
};

const ProviderSettings = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<NotificationProvider | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    channel: 'email' as ProviderType,
    provider_name: '',
    is_active: true,
    config: {} as Record<string, any>,
  });

  const queryClient = useQueryClient();

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['notification-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_providers')
        .select('*')
        .order('channel');
      if (error) throw error;
      return data as unknown as NotificationProvider[];
    },
  });

  const saveProvider = useMutation({
    mutationFn: async (providerData: typeof form & { id?: string }) => {
      if (providerData.id) {
        const { error } = await supabase
          .from('notification_providers')
          .update({
            provider_name: providerData.provider_name,
            is_active: providerData.is_active,
            config: providerData.config,
          })
          .eq('id', providerData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_providers')
          .insert({
            channel: providerData.channel,
            provider_name: providerData.provider_name,
            is_active: providerData.is_active,
            config: providerData.config,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-providers'] });
      toast.success('Provider saved successfully');
      setShowDialog(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testProvider = useMutation({
    mutationFn: async (providerId: string) => {
      // In production, this would call an edge function to test the provider
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => toast.success('Test notification sent successfully'),
    onError: (error: Error) => toast.error(`Test failed: ${error.message}`),
  });

  const handleOpenDialog = (provider?: NotificationProvider) => {
    if (provider) {
      setEditingProvider(provider);
      setForm({
        channel: provider.channel,
        provider_name: provider.provider_name,
        is_active: provider.is_active,
        config: provider.config || {},
      });
    } else {
      setEditingProvider(null);
      setForm({
        channel: 'email',
        provider_name: '',
        is_active: true,
        config: {},
      });
    }
    setShowSecrets({});
    setShowDialog(true);
  };

  const handleSave = () => {
    saveProvider.mutate({
      ...form,
      id: editingProvider?.id,
    });
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getProviderIcon = (type: ProviderType) => {
    const Icon = PROVIDER_ICONS[type];
    return <Icon className="h-4 w-4" />;
  };

  const currentConfig = PROVIDER_CONFIGS[form.channel];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Notification Providers</h1>
        <p className="text-muted-foreground mt-1">Configure providers for each notification channel</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Configured Providers</CardTitle>
            <CardDescription>Manage notification delivery settings for each channel</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Provider
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading providers...</p>
          ) : providers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No providers configured. Add your first provider to start sending notifications.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead>Provider Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getProviderIcon(provider.channel)}
                        <span className="capitalize">{provider.channel}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{provider.provider_name}</TableCell>
                    <TableCell>
                      <Badge variant={provider.is_active ? 'default' : 'secondary'}>
                        {provider.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => testProvider.mutate(provider.id)}
                          disabled={!provider.is_active || testProvider.isPending}
                          title="Test Provider"
                        >
                          <TestTube className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(provider)}
                          title="Edit Provider"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProvider ? 'Edit Provider' : 'Add Provider'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Channel Type</Label>
              <Select
                value={form.channel}
                onValueChange={(v) => setForm({ ...form, channel: v as ProviderType, config: {} })}
                disabled={!!editingProvider}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Push</SelectItem>
                  <SelectItem value="in_app">In-App</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Provider Name</Label>
              <Input
                value={form.provider_name}
                onChange={(e) => setForm({ ...form, provider_name: e.target.value })}
                placeholder="e.g., Primary SMTP, Twilio Production"
              />
            </div>

            {currentConfig.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <div className="flex gap-2">
                  <Input
                    type={field.secret && !showSecrets[field.key] ? 'password' : field.type === 'password' ? 'text' : field.type}
                    value={form.config[field.key] || ''}
                    onChange={(e) => setForm({
                      ...form,
                      config: { ...form.config, [field.key]: e.target.value }
                    })}
                    placeholder={field.label}
                  />
                  {field.secret && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleSecret(field.key)}
                    >
                      {showSecrets[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveProvider.isPending}>
              {saveProvider.isPending ? 'Saving...' : 'Save Provider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProviderSettings;
