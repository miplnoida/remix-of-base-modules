import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, Send, FileText, Clock, Search, Filter, Plus, Eye, Download, Loader2, Mail } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNotices } from "@/services/complianceDataService";
import { fetchNoticeTemplates, NoticeTemplateRow } from "@/services/noticeTemplateService";
import { supabase } from "@/integrations/supabase/client";

const NOTICE_TYPE_COLORS: Record<string, string> = {
  LATE_C3: "bg-yellow-500/15 text-yellow-700 border-yellow-300",
  C3_NOT_SUBMITTED: "bg-orange-500/15 text-orange-700 border-orange-300",
  PAYMENT_NOT_RECEIVED: "bg-red-500/15 text-red-700 border-red-300",
  FINAL_WARNING: "bg-red-700/15 text-red-800 border-red-400",
  LEGAL_WARNING: "bg-purple-500/15 text-purple-700 border-purple-300",
};

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: "bg-green-500/15 text-green-700 border-green-300",
  SENT: "bg-green-500/15 text-green-700 border-green-300",
  PENDING: "bg-yellow-500/15 text-yellow-700 border-yellow-300",
  DRAFT: "bg-muted text-muted-foreground border-border",
};

function formatDate(val: string | null) {
  if (!val) return "-";
  try { return new Date(val).toLocaleDateString("en-GB"); } catch { return val; }
}

function resolveTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}

export default function NoticesManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Create notice form state
  const [newNotice, setNewNotice] = useState({
    template_id: "",
    employer_id: "",
    employer_name: "",
    case_id: "",
    notice_type: "",
    delivery_method: "EMAIL",
    due_response_date: "",
    subject: "",
    body: "",
  });

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ["ce_notices", searchTerm],
    queryFn: () => fetchNotices({ search: searchTerm || undefined }),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["ce_notice_templates_active"],
    queryFn: async () => {
      const all = await fetchNoticeTemplates();
      return all.filter(t => t.is_active);
    },
  });

  const stats = useMemo(() => ({
    pending: notices.filter((n: any) => n.status === "PENDING" || n.status === "DRAFT").length,
    delivered: notices.filter((n: any) => n.status === "DELIVERED" || n.status === "SENT").length,
    finalWarning: notices.filter((n: any) => n.notice_type === "FINAL_WARNING" || n.notice_type === "FINAL_DEMAND").length,
    legal: notices.filter((n: any) => n.notice_type === "LEGAL_WARNING").length,
  }), [notices]);

  // Generate next notice number
  const generateNoticeNumber = () => {
    const year = new Date().getFullYear();
    const existing = notices.filter((n: any) => n.notice_number?.startsWith(`CN-${year}`));
    const next = existing.length + 1;
    return `CN-${year}-${String(next).padStart(4, "0")}`;
  };

  const handleTemplateSelect = (templateId: string) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    setNewNotice(prev => ({
      ...prev,
      template_id: templateId,
      notice_type: tpl.category,
      subject: tpl.subject || "",
      body: tpl.body,
    }));
  };

  const createNoticeMut = useMutation({
    mutationFn: async () => {
      const noticeNumber = generateNoticeNumber();
      const { error } = await supabase.from("ce_notices").insert({
        notice_number: noticeNumber,
        employer_id: newNotice.employer_id,
        employer_name: newNotice.employer_name,
        case_id: newNotice.case_id || null,
        notice_type: newNotice.notice_type,
        status: "DRAFT",
        subject: newNotice.subject,
        body: resolveTemplate(newNotice.body, {
          employer_name: newNotice.employer_name,
          current_date: new Date().toLocaleDateString("en-GB"),
        }),
        template_id: newNotice.template_id || null,
        delivery_method: newNotice.delivery_method,
        due_response_date: newNotice.due_response_date || null,
        created_by: "system",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ce_notices"] });
      toast.success("Notice created as Draft");
      setCreateDialogOpen(false);
      setNewNotice({ template_id: "", employer_id: "", employer_name: "", case_id: "", notice_type: "", delivery_method: "EMAIL", due_response_date: "", subject: "", body: "" });
    },
    onError: (err: any) => toast.error("Failed to create notice", { description: err.message }),
  });

  const handleCreateSave = () => {
    if (!newNotice.employer_name || !newNotice.notice_type || !newNotice.body) {
      toast.error("Please check the form for valid information!", {
        description: "Employer name, notice type, and body are required.",
        style: { backgroundColor: "hsl(var(--destructive))", color: "white", "--description-color": "white" } as React.CSSProperties,
        classNames: { toast: "!bg-destructive", title: "!text-white", description: "!text-white !opacity-100" },
      });
      return;
    }
    createNoticeMut.mutate();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notices & Communication</h1>
          <p className="text-muted-foreground">Manage compliance notices and employer communications</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />Create Notice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-foreground">{stats.pending}</div><p className="text-sm text-muted-foreground">Pending / Draft</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-foreground">{stats.delivered}</div><p className="text-sm text-muted-foreground">Delivered</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-foreground">{stats.finalWarning}</div><p className="text-sm text-muted-foreground">Final Warnings</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-foreground">{stats.legal}</div><p className="text-sm text-muted-foreground">Legal Escalations</p></CardContent></Card>
      </div>

      {/* Notices List */}
      <Card>
        <CardHeader><CardTitle>Recent Notices</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by employer or notice number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>
          </div>

          {notices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No notices found</p>
              <p className="text-sm mt-1">Create a new notice to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notices.map((notice: any) => (
                <div key={notice.id} className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{notice.employer_name}</h3>
                        <Badge variant="outline" className="text-xs font-mono">{notice.notice_number}</Badge>
                      </div>
                      {notice.case_id && <p className="text-sm text-muted-foreground">Case: {notice.case_id}</p>}
                    </div>
                    <Badge variant="outline" className={NOTICE_TYPE_COLORS[notice.notice_type] || ""}>{(notice.notice_type || "").replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
                    <div><p className="text-xs text-muted-foreground mb-1">Notice Type</p><p className="text-sm font-medium text-foreground">{(notice.notice_type || "").replace(/_/g, " ")}</p></div>
                    <div><p className="text-xs text-muted-foreground mb-1">Sent Date</p><p className="text-sm font-medium text-foreground">{formatDate(notice.sent_at)}</p></div>
                    <div><p className="text-xs text-muted-foreground mb-1">Delivery</p><p className="text-sm font-medium text-foreground">{(notice.delivery_method || "-").replace(/_/g, " ")}</p></div>
                    <div><p className="text-xs text-muted-foreground mb-1">Status</p><Badge variant="outline" className={STATUS_COLORS[notice.status] || ""}>{notice.status || "-"}</Badge></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedNotice(notice); setViewDialogOpen(true); }}><Eye className="h-4 w-4 mr-2" />View</Button>
                    <Button size="sm" variant="outline" onClick={() => toast.info("PDF download coming soon")}><Download className="h-4 w-4 mr-2" />PDF</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Notice Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Notice Details</DialogTitle>
            <DialogDescription>{selectedNotice?.notice_number} — {(selectedNotice?.notice_type || "").replace(/_/g, " ")}</DialogDescription>
          </DialogHeader>
          {selectedNotice && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground text-xs">Employer</Label><p className="font-medium text-foreground">{selectedNotice.employer_name}</p></div>
                <div><Label className="text-muted-foreground text-xs">Notice Number</Label><p className="font-medium text-foreground">{selectedNotice.notice_number}</p></div>
                <div><Label className="text-muted-foreground text-xs">Notice Type</Label><p className="font-medium text-foreground">{(selectedNotice.notice_type || "").replace(/_/g, " ")}</p></div>
                <div><Label className="text-muted-foreground text-xs">Sent Date</Label><p className="font-medium text-foreground">{formatDate(selectedNotice.sent_at)}</p></div>
                <div><Label className="text-muted-foreground text-xs">Delivery Method</Label><p className="font-medium text-foreground">{(selectedNotice.delivery_method || "-").replace(/_/g, " ")}</p></div>
                <div><Label className="text-muted-foreground text-xs">Status</Label><Badge variant="outline" className={STATUS_COLORS[selectedNotice.status] || ""}>{selectedNotice.status || "-"}</Badge></div>
                {selectedNotice.due_response_date && (
                  <div><Label className="text-muted-foreground text-xs">Response Due</Label><p className="font-medium text-foreground">{formatDate(selectedNotice.due_response_date)}</p></div>
                )}
                {selectedNotice.response_received && (
                  <div><Label className="text-muted-foreground text-xs">Response Date</Label><p className="font-medium text-foreground">{formatDate(selectedNotice.response_date)}</p></div>
                )}
              </div>
              {selectedNotice.subject && (
                <div>
                  <Label className="text-muted-foreground text-xs">Subject</Label>
                  <Card className="mt-1"><CardContent className="pt-3 pb-3"><p className="text-sm font-medium text-foreground">{selectedNotice.subject}</p></CardContent></Card>
                </div>
              )}
              {selectedNotice.body && (
                <div>
                  <Label className="text-muted-foreground text-xs">Notice Body</Label>
                  <Card className="mt-1"><CardContent className="pt-3 pb-3"><pre className="text-sm whitespace-pre-wrap text-foreground">{selectedNotice.body}</pre></CardContent></Card>
                </div>
              )}
              {selectedNotice.response_notes && (
                <div>
                  <Label className="text-muted-foreground text-xs">Response Notes</Label>
                  <p className="text-sm text-foreground mt-1">{selectedNotice.response_notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Notice Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Notice</DialogTitle>
            <DialogDescription>Compose a new compliance notice using a template or from scratch</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Template Selection */}
            <div className="space-y-1.5">
              <Label>Template <span className="text-xs text-muted-foreground">(optional — auto-fills subject & body)</span></Label>
              <Select value={newNotice.template_id || "__none__"} onValueChange={v => handleTemplateSelect(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— No template —</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <span>{t.template_name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">({t.channel})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Employer Name <span className="text-destructive">*</span></Label>
                <Input value={newNotice.employer_name} onChange={e => setNewNotice(p => ({ ...p, employer_name: e.target.value }))} placeholder="e.g. Caribbean Sugar Mills Ltd" />
              </div>
              <div className="space-y-1.5">
                <Label>Employer ID</Label>
                <Input value={newNotice.employer_id} onChange={e => setNewNotice(p => ({ ...p, employer_id: e.target.value }))} placeholder="e.g. 100001" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Notice Type <span className="text-destructive">*</span></Label>
                <Select value={newNotice.notice_type || "__pick__"} onValueChange={v => setNewNotice(p => ({ ...p, notice_type: v === "__pick__" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__pick__">Select...</SelectItem>
                    {["C3_NOT_SUBMITTED", "LATE_C3", "PAYMENT_NOT_RECEIVED", "FINAL_WARNING", "LEGAL_WARNING", "PENALTY_ASSESSMENT", "ARRANGEMENT_CONFIRMATION", "BREACH_WARNING"].map(t => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Delivery Method</Label>
                <Select value={newNotice.delivery_method} onValueChange={v => setNewNotice(p => ({ ...p, delivery_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="REGISTERED_MAIL">Registered Mail</SelectItem>
                    <SelectItem value="HAND_DELIVERED">Hand Delivered</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Case ID</Label>
                <Input value={newNotice.case_id} onChange={e => setNewNotice(p => ({ ...p, case_id: e.target.value }))} placeholder="Optional case reference" />
              </div>
              <div className="space-y-1.5">
                <Label>Response Due Date</Label>
                <Input type="date" value={newNotice.due_response_date} onChange={e => setNewNotice(p => ({ ...p, due_response_date: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input value={newNotice.subject} onChange={e => setNewNotice(p => ({ ...p, subject: e.target.value }))} placeholder="Notice subject line" />
            </div>
            <div className="space-y-1.5">
              <Label>Body <span className="text-destructive">*</span></Label>
              <Textarea value={newNotice.body} onChange={e => setNewNotice(p => ({ ...p, body: e.target.value }))} rows={8} placeholder="Notice body content..." />
              <p className="text-[11px] text-muted-foreground">Use {"{{employer_name}}"}, {"{{current_date}}"}, etc. for merge fields</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSave} disabled={createNoticeMut.isPending}>
              {createNoticeMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Notice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
