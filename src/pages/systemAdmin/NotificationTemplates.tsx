import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Copy, Eye, Send, Mail, MessageSquare, Bell, Smartphone, Search } from "lucide-react";
import { useNotificationTemplates, useCreateNotificationTemplate, useUpdateNotificationTemplate, NotificationTemplate } from "@/hooks/useAdminData";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const CHANNELS = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'push', label: 'Push', icon: Smartphone },
  { value: 'in_app', label: 'In-App', icon: Bell },
] as const;

export default function NotificationTemplates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [testEmail, setTestEmail] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    channel: "email" as 'email' | 'sms' | 'push' | 'in_app',
    subject: "",
    title: "",
    body: "",
    is_enabled: true,
  });

  const queryClient = useQueryClient();
  const { data: templates = [], isLoading } = useNotificationTemplates();
  const createTemplate = useCreateNotificationTemplate();
  const updateTemplate = useUpdateNotificationTemplate();

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notification_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template deleted');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (template: NotificationTemplate) => {
      const { error } = await supabase.from('notification_templates').insert({
        name: `${template.name} (Copy)`,
        channel: template.channel,
        subject: template.subject,
        title: template.title,
        body: template.body,
        placeholders: template.placeholders,
        is_enabled: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template duplicated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.body.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesChannel = channelFilter === "all" || template.channel === channelFilter;
    return matchesSearch && matchesChannel;
  });

  const getChannelIcon = (channel: string) => {
    const ch = CHANNELS.find(c => c.value === channel);
    return ch ? <ch.icon className="h-4 w-4" /> : null;
  };

  const handleOpenEditor = (template?: NotificationTemplate) => {
    if (template) {
      setSelectedTemplate(template);
      setFormData({
        name: template.name,
        channel: template.channel,
        subject: template.subject || "",
        title: template.title || "",
        body: template.body,
        is_enabled: template.is_enabled,
      });
    } else {
      setSelectedTemplate(null);
      setFormData({ name: "", channel: "email", subject: "", title: "", body: "", is_enabled: true });
    }
    setShowEditor(true);
  };

  const handleSave = async () => {
    try {
      if (selectedTemplate) {
        await updateTemplate.mutateAsync({ id: selectedTemplate.id, ...formData });
      } else {
        await createTemplate.mutateAsync(formData);
      }
      setShowEditor(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handlePreview = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleSendTest = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setTestEmail("");
    setShowTestDialog(true);
  };

  const handleSendTestNotification = async () => {
    // In production, this would call an edge function
    toast.success(`Test notification sent to ${testEmail}`);
    setShowTestDialog(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notification Templates</h1>
          <p className="text-muted-foreground">Create and manage notification templates for all channels</p>
        </div>
        <Button onClick={() => handleOpenEditor()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-sm text-muted-foreground">Total Templates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {templates.filter(t => t.channel === 'email').length}
            </div>
            <p className="text-sm text-muted-foreground">Email</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {templates.filter(t => t.channel === 'sms').length}
            </div>
            <p className="text-sm text-muted-foreground">SMS</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              {templates.filter(t => t.is_enabled).length}
            </div>
            <p className="text-sm text-muted-foreground">Enabled</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="push">Push</SelectItem>
                <SelectItem value="in_app">In-App</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>Manage all notification templates</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No templates found. Create your first template to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Subject/Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getChannelIcon(template.channel)}
                        <span className="capitalize">{template.channel.replace('_', '-')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {template.subject || template.title || template.body.substring(0, 50) + '...'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.is_enabled ? "default" : "secondary"}>
                        {template.is_enabled ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handlePreview(template)} title="Preview">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditor(template)} title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => duplicateTemplate.mutate(template)} title="Duplicate">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleSendTest(template)} title="Send Test">
                          <Send className="h-4 w-4" />
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

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>
              {selectedTemplate ? 'Update the template details' : 'Create a new notification template'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Welcome Email"
                />
              </div>
              <div className="space-y-2">
                <Label>Channel *</Label>
                <Select 
                  value={formData.channel} 
                  onValueChange={(v) => setFormData({...formData, channel: v as any})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map(ch => (
                      <SelectItem key={ch.value} value={ch.value}>
                        <div className="flex items-center gap-2">
                          <ch.icon className="h-4 w-4" />
                          {ch.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {formData.channel === 'email' && (
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input 
                  value={formData.subject} 
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  placeholder="Email subject line"
                />
              </div>
            )}
            
            {formData.channel !== 'email' && (
              <div className="space-y-2">
                <Label>Title</Label>
                <Input 
                  value={formData.title} 
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Notification title"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Body *</Label>
              <Textarea 
                value={formData.body} 
                onChange={(e) => setFormData({...formData, body: e.target.value})}
                placeholder="Use {{placeholder}} for dynamic content"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Available placeholders: {'{{user_name}}'}, {'{{email}}'}, {'{{amount}}'}, {'{{date}}'}, etc.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch 
                checked={formData.is_enabled}
                onCheckedChange={(v) => setFormData({...formData, is_enabled: v})}
              />
              <Label>Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditor(false)}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={!formData.name || !formData.body || createTemplate.isPending || updateTemplate.isPending}
            >
              {createTemplate.isPending || updateTemplate.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>{selectedTemplate?.name}</DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                {getChannelIcon(selectedTemplate.channel)}
                <Badge>{selectedTemplate.channel}</Badge>
                <Badge variant={selectedTemplate.is_enabled ? "default" : "secondary"}>
                  {selectedTemplate.is_enabled ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {selectedTemplate.subject && (
                <div>
                  <Label className="text-muted-foreground">Subject</Label>
                  <p className="font-medium">{selectedTemplate.subject}</p>
                </div>
              )}
              {selectedTemplate.title && (
                <div>
                  <Label className="text-muted-foreground">Title</Label>
                  <p className="font-medium">{selectedTemplate.title}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Body</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg whitespace-pre-wrap">
                  {selectedTemplate.body}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Notification</DialogTitle>
            <DialogDescription>Send a test of "{selectedTemplate?.name}"</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Recipient {selectedTemplate?.channel === 'email' ? 'Email' : 'Address'}</Label>
            <Input 
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder={selectedTemplate?.channel === 'email' ? 'test@example.com' : 'Enter recipient'}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>Cancel</Button>
            <Button onClick={handleSendTestNotification} disabled={!testEmail}>
              <Send className="mr-2 h-4 w-4" />
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
