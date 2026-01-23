import React, { useState } from 'react';
import { useApiSettings, useUpdateApiSetting, useCreateApiSetting, useDeleteApiSetting, ApiSetting } from '@/hooks/useApiSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Plus, Pencil, Trash2, Eye, EyeOff, Save, AlertTriangle, Check, X, Globe, Key, Link2, LinkIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

// Predefined modules that can be linked to APIs
const LINKABLE_MODULES = [
  { value: 'insured-person-applications', label: 'Insured Person Applications' },
  { value: 'employer-applications', label: 'Employer Applications' },
  { value: 'doctor-applications', label: 'Doctor Applications' },
];

export default function ApiConfiguration() {
  const { user, hasPermission } = useAuth();
  const { data: settings, isLoading, error } = useApiSettings();
  const updateSetting = useUpdateApiSetting();
  const createSetting = useCreateApiSetting();
  const deleteSetting = useDeleteApiSetting();
  
  const [editingSetting, setEditingSetting] = useState<ApiSetting | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Partial<ApiSetting>>({});

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || hasPermission('system_administration');

  const handleEdit = (setting: ApiSetting) => {
    setEditingSetting(setting);
    setFormData(setting);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setEditingSetting(null);
    setFormData({
      setting_key: '',
      setting_name: '',
      base_url: '',
      api_key: '',
      header_name: 'x-api-key',
      is_active: true,
      description: '',
      linked_module: null,
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (isCreating) {
      await createSetting.mutateAsync(formData as Omit<ApiSetting, 'id' | 'created_at' | 'updated_at'>);
    } else if (editingSetting) {
      await updateSetting.mutateAsync({ id: editingSetting.id, ...formData });
    }
    setEditingSetting(null);
    setIsCreating(false);
    setFormData({});
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this API configuration?')) {
      await deleteSetting.mutateAsync(id);
    }
  };

  const toggleApiKeyVisibility = (id: string) => {
    setShowApiKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const maskApiKey = (key: string | null) => {
    if (!key) return '••••••••';
    if (key.length <= 8) return '••••••••';
    return key.slice(0, 4) + '••••••••' + key.slice(-4);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>Failed to load API settings: {(error as Error).message}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            API Configuration
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage external API integrations and connection settings
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isCreating || !!editingSetting} onOpenChange={(open) => {
            if (!open) {
              setIsCreating(false);
              setEditingSetting(null);
              setFormData({});
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Add API Configuration
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {isCreating ? <Plus className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
                  {isCreating ? 'Add New API Configuration' : 'Edit API Configuration'}
                </DialogTitle>
                <DialogDescription>
                  Configure the connection settings for external API integrations
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="setting_key">Setting Key *</Label>
                    <Input
                      id="setting_key"
                      value={formData.setting_key || ''}
                      onChange={(e) => setFormData({ ...formData, setting_key: e.target.value })}
                      placeholder="e.g., insured_person_api"
                      disabled={!isCreating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="setting_name">Display Name *</Label>
                    <Input
                      id="setting_name"
                      value={formData.setting_name || ''}
                      onChange={(e) => setFormData({ ...formData, setting_name: e.target.value })}
                      placeholder="e.g., Insured Person API"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="base_url" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Base URL
                  </Label>
                  <Input
                    id="base_url"
                    value={formData.base_url || ''}
                    onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                    placeholder="https://api.example.com"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="header_name" className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      Header Name
                    </Label>
                    <Input
                      id="header_name"
                      value={formData.header_name || ''}
                      onChange={(e) => setFormData({ ...formData, header_name: e.target.value })}
                      placeholder="x-api-key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api_key" className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      API Key
                    </Label>
                    <Input
                      id="api_key"
                      type="password"
                      value={formData.api_key || ''}
                      onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                      placeholder="Enter API key"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the purpose of this API configuration"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linked_module" className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Link to Module
                  </Label>
                  <Select
                    value={formData.linked_module || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, linked_module: value === 'none' ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a module to link" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No module linked</SelectItem>
                      {LINKABLE_MODULES.map((module) => (
                        <SelectItem key={module.value} value={module.value}>
                          {module.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Link this API to a specific application module for automatic data fetching
                  </p>
                </div>
                
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_active">Active Status</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable this API configuration
                    </p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingSetting(null);
                    setFormData({});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!formData.setting_key || !formData.setting_name}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isCreating ? 'Create' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Settings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Configured APIs</CardTitle>
          <CardDescription>
            List of all external API configurations for the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settings && settings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Base URL</TableHead>
                  <TableHead>Linked Module</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.map((setting) => {
                  const linkedModuleLabel = LINKABLE_MODULES.find(m => m.value === setting.linked_module)?.label;
                  return (
                    <TableRow key={setting.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{setting.setting_name}</div>
                          <div className="text-xs text-muted-foreground">{setting.setting_key}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate block">
                          {setting.base_url || '—'}
                        </code>
                      </TableCell>
                      <TableCell>
                        {linkedModuleLabel ? (
                          <Badge variant="outline" className="gap-1">
                            <LinkIcon className="h-3 w-3" />
                            {linkedModuleLabel}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {showApiKey[setting.id] ? setting.api_key : maskApiKey(setting.api_key)}
                          </code>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleApiKeyVisibility(setting.id)}
                            >
                              {showApiKey[setting.id] ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {setting.is_active ? (
                          <Badge variant="default" className="gap-1">
                            <Check className="h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <X className="h-3 w-3" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {setting.updated_at
                          ? format(new Date(setting.updated_at), 'MMM d, yyyy HH:mm')
                          : '—'}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(setting)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(setting.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No API configurations found</p>
              {isAdmin && (
                <Button variant="outline" className="mt-4" onClick={handleCreate}>
                  Add your first API configuration
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-accent/50 border-accent">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-2">
              <p className="font-medium">How to Link APIs to Modules</p>
              <p className="text-muted-foreground">
                Configure external APIs and link them to application modules (Insured Person, Employer, Doctor). 
                Each module will automatically use the linked API to fetch and manage online applications.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Click "Add API Configuration" to create a new API entry</li>
                <li>Enter the Base URL and API Key for the external service</li>
                <li>Select the module to link in the "Link to Module" dropdown</li>
                <li>Only one active API can be linked per module</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                <strong>Security:</strong> API keys are stored securely and only visible to administrators.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
