import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Eye, Mail, MessageSquare, Bell, Search, Send, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

interface NotificationTemplate {
  id: string;
  name: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  subject: string | null;
  title: string | null;
  body: string;
  placeholders: Record<string, string>[];
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  module_id: string | null;
  module?: { id: string; display_name: string } | null;
}

const CHANNELS = ['email', 'sms', 'push', 'in_app'] as const;

const NotificationTemplates = () => {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [testRecipient, setTestRecipient] = useState("");
  const [formData, setFormData] = useState({
    name: '',
    channel: 'email' as typeof CHANNELS[number],
    subject: '',
    title: '',
    body: '',
    is_enabled: true,
    module_id: '',
  });

  // Fetch parent modules only (where parent_id is null)
  const { data: parentModules = [] } = useQuery({
    queryKey: ['parent-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_modules')
        .select('id, display_name')
        .is('parent_id', null)
        .eq('is_enabled', true)
        .order('display_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*, module:app_modules(id, display_name)')
        .order('name');
      if (error) throw error;
      return data as NotificationTemplate[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async () => {
      const placeholders = extractPlaceholders(formData.body);
      const { error } = await supabase.from('notification_templates').insert({
        name: formData.name,
        channel: formData.channel,
        subject: formData.subject || null,
        title: formData.title || null,
        body: formData.body,
        placeholders: placeholders.map(p => ({ key: p })),
        is_enabled: formData.is_enabled,
        module_id: formData.module_id || null,
        created_by: user?.id,
        updated_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template created successfully');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateTemplate = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) return;
      const placeholders = extractPlaceholders(formData.body);
      const { error } = await supabase
        .from('notification_templates')
        .update({
          name: formData.name,
          channel: formData.channel,
          subject: formData.subject || null,
          title: formData.title || null,
          body: formData.body,
          placeholders: placeholders.map(p => ({ key: p })),
          is_enabled: formData.is_enabled,
          module_id: formData.module_id || null,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTemplate.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template updated successfully');
      setIsEditOpen(false);
      setSelectedTemplate(null);
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notification_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const sendTestNotification = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate || !testRecipient) return;
      // Log the test notification
      const { error } = await supabase.from('notification_logs').insert({
        template_id: selectedTemplate.id,
        channel: selectedTemplate.channel,
        recipient_address: testRecipient,
        subject: selectedTemplate.subject,
        title: selectedTemplate.title,
        body: selectedTemplate.body,
        status: 'sent',
        trigger_source: 'manual_test',
        triggered_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Test notification sent to ${testRecipient}`);
      setIsTestOpen(false);
      setTestRecipient("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const extractPlaceholders = (content: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = content.match(regex);
    return matches ? [...new Set(matches)] : [];
  };

  const resetForm = () => {
    setFormData({ name: '', channel: 'email', subject: '', title: '', body: '', is_enabled: true, module_id: '' });
  };

  const openEdit = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      channel: template.channel,
      subject: template.subject || '',
      title: template.title || '',
      body: template.body,
      is_enabled: template.is_enabled,
      module_id: template.module_id || '',
    });
    setIsEditOpen(true);
  };

  const openTest = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setTestRecipient("");
    setIsTestOpen(true);
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getTestPlaceholder = (channel: string) => {
    switch (channel) {
      case 'email': return 'Enter email address';
      case 'sms': return 'Enter phone number';
      default: return 'Enter user ID or email';
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.body.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesChannel = selectedChannel === 'all' || t.channel === selectedChannel;
    const matchesModule = selectedModuleFilter === 'all' || t.module_id === selectedModuleFilter;
    return matchesSearch && matchesChannel && matchesModule;
  });

  // Group templates by module for display
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const moduleName = template.module?.display_name || 'Unassigned';
    if (!acc[moduleName]) acc[moduleName] = [];
    acc[moduleName].push(template);
    return acc;
  }, {} as Record<string, NotificationTemplate[]>);

  if (isLoading) {
    return <div className="container mx-auto p-6">Loading templates...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notification Templates</h1>
          <p className="text-muted-foreground mt-1">Manage notification message templates</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedModuleFilter} onValueChange={setSelectedModuleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {parentModules.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {CHANNELS.map(c => (
                  <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredTemplates.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-4">
              {templates.length === 0
                ? "Create your first notification template to get started."
                : "No templates match your filters."}
            </p>
            {templates.length === 0 && (
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTemplates).sort(([a], [b]) => a === 'Unassigned' ? 1 : b === 'Unassigned' ? -1 : a.localeCompare(b)).map(([moduleName, moduleTemplates]) => (
            <div key={moduleName}>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Badge variant="outline">{moduleName}</Badge>
                <span className="text-sm text-muted-foreground font-normal">({moduleTemplates.length} template{moduleTemplates.length !== 1 ? 's' : ''})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {moduleTemplates.map((template) => (
                  <Card key={template.id} className="group hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {getChannelIcon(template.channel)}
                          {template.name}
                        </CardTitle>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedTemplate(template); setIsPreviewOpen(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openTest(template)}>
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(template)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteTemplate.mutate(template.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={template.is_enabled ? "default" : "secondary"}>
                          {template.is_enabled ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline" className="capitalize">{template.channel}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">{template.body}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Placeholders: {template.placeholders?.length || 0}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) { setIsCreateOpen(false); setIsEditOpen(false); resetForm(); }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isCreateOpen ? 'Create Template' : 'Edit Template'}</DialogTitle>
            <DialogDescription>
              {isCreateOpen ? 'Create a new notification template' : 'Update template details'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Module *</Label>
                <Select value={formData.module_id} onValueChange={(v) => setFormData({ ...formData, module_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                  <SelectContent>
                    {parentModules.map(m => <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={formData.channel} onValueChange={(v: any) => setFormData({ ...formData, channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map(c => <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(formData.channel === 'email' || formData.channel === 'push') && (
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                rows={6}
                placeholder="Use {{placeholder}} for dynamic values"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.is_enabled} onCheckedChange={(v) => setFormData({ ...formData, is_enabled: v })} />
              <Label>Active</Label>
            </div>
            {formData.body && extractPlaceholders(formData.body).length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Detected Placeholders:</p>
                <div className="flex flex-wrap gap-1">
                  {extractPlaceholders(formData.body).map((p, i) => (
                    <Badge key={i} variant="secondary">{p}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={() => isCreateOpen ? createTemplate.mutate() : updateTemplate.mutate()}
              disabled={!formData.name || !formData.body || !formData.module_id}
            >
              {isCreateOpen ? 'Create' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate && getChannelIcon(selectedTemplate.channel)}
              Template Preview
            </DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge variant={selectedTemplate.is_enabled ? "default" : "secondary"}>
                  {selectedTemplate.is_enabled ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant="outline" className="capitalize">{selectedTemplate.channel}</Badge>
              </div>
              {selectedTemplate.subject && (
                <div>
                  <Label className="text-sm">Subject</Label>
                  <div className="p-3 bg-muted rounded-md mt-1">{selectedTemplate.subject}</div>
                </div>
              )}
              <div>
                <Label className="text-sm">Body</Label>
                <div className="p-3 bg-muted rounded-md mt-1 whitespace-pre-wrap">{selectedTemplate.body}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Test Dialog */}
      <Dialog open={isTestOpen} onOpenChange={setIsTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Test Notification
            </DialogTitle>
            <DialogDescription>
              Send a test notification using this template
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">{selectedTemplate.name}</p>
                <p className="text-sm text-muted-foreground capitalize">{selectedTemplate.channel}</p>
              </div>
              <div className="space-y-2">
                <Label>Recipient *</Label>
                <Input
                  placeholder={getTestPlaceholder(selectedTemplate.channel)}
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Test will be sent with sample placeholder values
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestOpen(false)}>Cancel</Button>
            <Button onClick={() => sendTestNotification.mutate()} disabled={!testRecipient}>
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationTemplates;
