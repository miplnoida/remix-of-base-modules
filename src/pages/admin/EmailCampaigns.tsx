import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatAuditDateTime } from "@/lib/dateFormat";
import {
  Mail, Plus, Send, Eye, RefreshCw, BarChart3, Users,
  CheckCircle2, XCircle, Clock, AlertCircle, Loader2
} from "lucide-react";

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  plain_body: string | null;
  from_name: string;
  from_email: string;
  recipient_filter: string;
  recipient_emails: string[] | null;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  triggered_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

const defaultForm = {
  name: "",
  subject: "",
  html_body: "",
  plain_body: "",
  from_name: "SSBM Notifications",
  from_email: "noreply@notifications.ssbm.gov.kn",
  recipient_filter: "all",
  recipient_emails: "",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  draft:     { label: "Draft",     variant: "secondary",    icon: <Clock className="h-3 w-3" /> },
  sending:   { label: "Sending",   variant: "outline",      icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  completed: { label: "Completed", variant: "default",      icon: <CheckCircle2 className="h-3 w-3" /> },
  failed:    { label: "Failed",    variant: "destructive",  icon: <XCircle className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", variant: "secondary",    icon: <AlertCircle className="h-3 w-3" /> },
};

export default function EmailCampaigns() {
  const queryClient = useQueryClient();
  const [composeOpen, setComposeOpen] = useState(false);
  const [previewCampaign, setPreviewCampaign] = useState<EmailCampaign | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [sending, setSending] = useState<string | null>(null);

  // Fetch campaigns
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["email-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EmailCampaign[];
    },
    refetchInterval: 5000,
  });

  // Save draft
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        subject: form.subject,
        html_body: form.html_body,
        plain_body: form.plain_body || null,
        from_name: form.from_name,
        from_email: form.from_email,
        recipient_filter: form.recipient_filter,
        recipient_emails: form.recipient_filter === "custom"
          ? form.recipient_emails.split(",").map((e) => e.trim()).filter(Boolean)
          : null,
        status: "draft",
      };
      const { error } = await supabase.from("email_campaigns").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campaign saved as draft");
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      setComposeOpen(false);
      setForm(defaultForm);
    },
    onError: (e: Error) => toast.error("Failed to save draft: " + e.message),
  });

  // Send campaign
  const sendCampaign = async (campaignId?: string) => {
    const id = campaignId || "inline";
    setSending(id);
    try {
      const body = campaignId
        ? { campaign_id: campaignId }
        : {
            name: form.name,
            subject: form.subject,
            html_body: form.html_body,
            plain_body: form.plain_body || undefined,
            from_name: form.from_name,
            from_email: form.from_email,
            recipient_filter: form.recipient_filter,
            recipient_emails:
              form.recipient_filter === "custom"
                ? form.recipient_emails.split(",").map((e) => e.trim()).filter(Boolean)
                : undefined,
          };

      const { data, error } = await supabase.functions.invoke("send-email-campaign", { body });
      if (error) throw error;

      if (data?.success) {
        toast.success(
          `Campaign sent! ✉️ ${data.sent_count} delivered, ${data.failed_count} failed`
        );
        if (!campaignId) {
          setComposeOpen(false);
          setForm(defaultForm);
        }
        queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
        queryClient.invalidateQueries({ queryKey: ["email-logs"] });
      } else {
        toast.error("Campaign failed: " + (data?.error || "Unknown error"));
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSending(null);
    }
  };

  const handleChange = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const totalSent    = campaigns.reduce((s, c) => s + (c.sent_count || 0), 0);
  const totalFailed  = campaigns.reduce((s, c) => s + (c.failed_count || 0), 0);
  const totalCamps   = campaigns.length;
  const activeCamps  = campaigns.filter((c) => c.status === "sending").length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Email Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Send and manage bulk email campaigns via Resend
          </p>
        </div>
        <Button onClick={() => setComposeOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Campaigns", value: totalCamps, icon: <Mail className="h-5 w-5 text-primary" /> },
          { label: "Currently Sending", value: activeCamps, icon: <Loader2 className={`h-5 w-5 text-primary ${activeCamps > 0 ? "animate-spin" : ""}`} /> },
          { label: "Emails Delivered", value: totalSent, icon: <CheckCircle2 className="h-5 w-5 text-primary" /> },
          { label: "Failed Deliveries", value: totalFailed, icon: <XCircle className="h-5 w-5 text-destructive" /> },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value.toLocaleString()}</p>
                </div>
                {stat.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign History</CardTitle>
          <CardDescription>All email campaigns — click a row to preview</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No campaigns yet. Create your first one!</p>
            </div>
          ) : (
            <Table sticky>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => {
                  const cfg = statusConfig[c.status] || statusConfig.draft;
                  const isSendingThis = sending === c.id;
                  return (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => setPreviewCampaign(c)}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{c.subject}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{c.total_recipients || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-primary font-medium">{c.sent_count || 0}</TableCell>
                      <TableCell className="text-destructive font-medium">{c.failed_count || 0}</TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit">
                          {cfg.icon} {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatAuditDateTime(c.created_at, false)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {c.status === "draft" && (
                            <Button
                              size="sm"
                              variant="default"
                              disabled={isSendingThis}
                              onClick={() => sendCampaign(c.id)}
                            >
                              {isSendingThis ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                              <span className="ml-1">Send</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── COMPOSE DIALOG ── */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Compose Email Campaign
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="camp-name">Campaign Name *</Label>
                <Input
                  id="camp-name"
                  placeholder="e.g. April Newsletter"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="camp-subject">Subject Line *</Label>
                <Input
                  id="camp-subject"
                  placeholder="e.g. Important update from SSBM"
                  value={form.subject}
                  onChange={(e) => handleChange("subject", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="camp-from-name">From Name</Label>
                <Input
                  id="camp-from-name"
                  value={form.from_name}
                  onChange={(e) => handleChange("from_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="camp-from-email">From Email</Label>
                <Input
                  id="camp-from-email"
                  type="email"
                  value={form.from_email}
                  onChange={(e) => handleChange("from_email", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Recipients</Label>
              <Select
                value={form.recipient_filter}
                onValueChange={(v) => handleChange("recipient_filter", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="active">Active Users Only</SelectItem>
                  <SelectItem value="custom">Custom Email List</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.recipient_filter === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="custom-emails">Email Addresses (comma-separated)</Label>
                <Textarea
                  id="custom-emails"
                  placeholder="user@example.com, another@example.com"
                  value={form.recipient_emails}
                  onChange={(e) => handleChange("recipient_emails", e.target.value)}
                  rows={3}
                />
              </div>
            )}

            <Tabs defaultValue="html">
              <TabsList>
                <TabsTrigger value="html">HTML Body *</TabsTrigger>
                <TabsTrigger value="plain">Plain Text</TabsTrigger>
              </TabsList>
              <TabsContent value="html" className="space-y-2">
                <Textarea
                  placeholder="<h1>Hello</h1><p>Your message here...</p>"
                  value={form.html_body}
                  onChange={(e) => handleChange("html_body", e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
              </TabsContent>
              <TabsContent value="plain" className="space-y-2">
                <Textarea
                  placeholder="Plain text fallback for email clients that don't support HTML"
                  value={form.plain_body}
                  onChange={(e) => handleChange("plain_body", e.target.value)}
                  rows={10}
                />
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setComposeOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => saveDraftMutation.mutate()}
              disabled={!form.name || !form.subject || !form.html_body || saveDraftMutation.isPending}
            >
              {saveDraftMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save as Draft
            </Button>
            <Button
              onClick={() => sendCampaign()}
              disabled={!form.name || !form.subject || !form.html_body || sending === "inline"}
            >
              {sending === "inline" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PREVIEW DIALOG ── */}
      <Dialog open={!!previewCampaign} onOpenChange={() => setPreviewCampaign(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Campaign Details</DialogTitle>
          </DialogHeader>
          {previewCampaign && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{previewCampaign.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={statusConfig[previewCampaign.status]?.variant || "secondary"}>
                    {previewCampaign.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">From</p>
                  <p className="font-medium">{previewCampaign.from_name} &lt;{previewCampaign.from_email}&gt;</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Recipients</p>
                  <p className="font-medium">{previewCampaign.recipient_filter} ({previewCampaign.total_recipients})</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Delivered</p>
                  <p className="font-medium text-primary">{previewCampaign.sent_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Failed</p>
                  <p className="font-medium text-destructive">{previewCampaign.failed_count}</p>
                </div>
                {previewCampaign.triggered_at && (
                  <div>
                    <p className="text-muted-foreground">Sent At</p>
                    <p className="font-medium">{formatAuditDateTime(previewCampaign.triggered_at, true)}</p>
                  </div>
                )}
                {previewCampaign.completed_at && (
                  <div>
                    <p className="text-muted-foreground">Completed At</p>
                    <p className="font-medium">{formatAuditDateTime(previewCampaign.completed_at, true)}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Subject</p>
                <p className="font-medium">{previewCampaign.subject}</p>
              </div>

              {previewCampaign.error_message && (
                <div className="p-3 bg-destructive/10 rounded-md">
                  <p className="text-sm text-destructive font-medium">Error</p>
                  <p className="text-sm text-destructive">{previewCampaign.error_message}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">HTML Preview</p>
                <iframe
                  title="Email HTML Preview"
                  sandbox=""
                  srcDoc={previewCampaign.html_body || ""}
                  className="w-full h-64 border rounded-md bg-background"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {previewCampaign?.status === "draft" && (
              <Button
                onClick={() => {
                  sendCampaign(previewCampaign!.id);
                  setPreviewCampaign(null);
                }}
                disabled={sending === previewCampaign?.id}
              >
                <Send className="mr-2 h-4 w-4" />
                Send Campaign
              </Button>
            )}
            <Button variant="outline" onClick={() => setPreviewCampaign(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
