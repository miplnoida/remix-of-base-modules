import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, Mail, MessageSquare, Smartphone, Plus, Edit, Trash2, RotateCcw, X, Search } from "lucide-react";
import { toast } from "sonner";
import { useNotificationTemplates, useCreateNotificationTemplate, useUpdateNotificationTemplate, useDeleteNotificationTemplate, useNotificationLogs, NotificationTemplate, NotificationLog } from "@/hooks/useAdminData";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const CHANNELS = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'push', label: 'Push', icon: Smartphone },
  { value: 'in_app', label: 'In-App', icon: Bell },
] as const;

const NotificationManagement = () => {
  const [activeTab, setActiveTab] = useState("templates");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [templateForm, setTemplateForm] = useState({
    name: "",
    channel: "email" as 'email' | 'sms' | 'push' | 'in_app',
    subject: "",
    title: "",
    body: "",
    is_enabled: true,
  });

  const queryClient = useQueryClient();
  const { data: templates = [], isLoading: templatesLoading } = useNotificationTemplates();
  const { data: logs = [], isLoading: logsLoading } = useNotificationLogs({ 
    status: statusFilter as any || undefined 
  });
  const createTemplate = useCreateNotificationTemplate();
  const updateTemplate = useUpdateNotificationTemplate();
  const deleteTemplate = useDeleteNotificationTemplate();

  const resendNotification = useMutation({
    mutationFn: async (logId: string) => {
      // In a real implementation, this would trigger resending via edge function
      const { error } = await supabase
        .from('notification_logs')
        .update({ status: 'queued' })
        .eq('id', logId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
      toast.success('Notification queued for resend');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cancelNotification = useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await supabase
        .from('notification_logs')
        .update({ status: 'cancelled' })
        .eq('id', logId)
        .eq('status', 'queued');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
      toast.success('Notification cancelled');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleOpenTemplateDialog = (template?: NotificationTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        name: template.name,
        channel: template.channel,
        subject: template.subject || "",
        title: template.title || "",
        body: template.body,
        is_enabled: template.is_enabled,
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({ name: "", channel: "email", subject: "", title: "", body: "", is_enabled: true });
    }
    setShowTemplateDialog(true);
  };

  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({ id: editingTemplate.id, ...templateForm });
      } else {
        await createTemplate.mutateAsync(templateForm);
      }
      setShowTemplateDialog(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleToggleTemplate = async (template: NotificationTemplate) => {
    await updateTemplate.mutateAsync({ id: template.id, is_enabled: !template.is_enabled });
  };

  const getChannelIcon = (channel: string) => {
    const ch = CHANNELS.find(c => c.value === channel);
    return ch ? <ch.icon className="h-4 w-4" /> : null;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      sent: 'default',
      queued: 'secondary',
      sending: 'outline',
      failed: 'destructive',
      cancelled: 'secondary',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const filteredLogs = logs.filter(log =>
    searchQuery === "" ||
    log.recipient_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Notification Management</h1>
        <p className="text-muted-foreground mt-1">Manage templates, providers, and notification logs</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">Notification Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Notification Templates</CardTitle>
                <CardDescription>Create and manage notification templates for all channels</CardDescription>
              </div>
              <Button onClick={() => handleOpenTemplateDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <p>Loading templates...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Subject/Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getChannelIcon(template.channel)}
                            {template.channel}
                          </div>
                        </TableCell>
                        <TableCell>{template.subject || template.title || '-'}</TableCell>
                        <TableCell>
                          <Switch 
                            checked={template.is_enabled} 
                            onCheckedChange={() => handleToggleTemplate(template)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenTemplateDialog(template)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => deleteTemplate.mutate(template.id)}
                              disabled={deleteTemplate.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
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
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Logs</CardTitle>
              <CardDescription>View all sent notifications and their status</CardDescription>
              <div className="flex gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by recipient or subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="queued">Queued</SelectItem>
                    <SelectItem value="sending">Sending</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <p>Loading logs...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject/Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getChannelIcon(log.channel)}
                            {log.channel}
                          </div>
                        </TableCell>
                        <TableCell>{log.recipient_address}</TableCell>
                        <TableCell>{log.subject || log.title || '-'}</TableCell>
                        <TableCell>
                          {getStatusBadge(log.status)}
                          {log.failure_reason && (
                            <p className="text-xs text-destructive mt-1">{log.failure_reason}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {(log.status === 'failed' || log.status === 'sent') && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => resendNotification.mutate(log.id)}
                                title="Resend"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                            {log.status === 'queued' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => cancelNotification.mutate(log.id)}
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input 
                  value={templateForm.name} 
                  onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                  placeholder="e.g., Welcome Email"
                />
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select 
                  value={templateForm.channel} 
                  onValueChange={(v) => setTemplateForm({...templateForm, channel: v as any})}
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
            {templateForm.channel === 'email' && (
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input 
                  value={templateForm.subject} 
                  onChange={(e) => setTemplateForm({...templateForm, subject: e.target.value})}
                  placeholder="Email subject line"
                />
              </div>
            )}
            {(templateForm.channel === 'sms' || templateForm.channel === 'push' || templateForm.channel === 'in_app') && (
              <div className="space-y-2">
                <Label>Title</Label>
                <Input 
                  value={templateForm.title} 
                  onChange={(e) => setTemplateForm({...templateForm, title: e.target.value})}
                  placeholder="Notification title"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea 
                value={templateForm.body} 
                onChange={(e) => setTemplateForm({...templateForm, body: e.target.value})}
                placeholder="Use {{placeholder}} for dynamic content"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Use placeholders like {'{{user_name}}'}, {'{{amount}}'}, etc.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={templateForm.is_enabled}
                onCheckedChange={(v) => setTemplateForm({...templateForm, is_enabled: v})}
              />
              <Label>Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveTemplate} 
              disabled={createTemplate.isPending || updateTemplate.isPending}
            >
              {createTemplate.isPending || updateTemplate.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationManagement;
