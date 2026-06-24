import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bell, Send, FileText, Clock, Search, Filter, Plus, Eye, Download, Loader2, Mail, CheckCircle, XCircle, MessageSquare, Truck, ChevronDown } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNotices } from "@/services/complianceDataService";
import { fetchNoticeTemplates, NoticeTemplateRow } from "@/services/noticeTemplateService";
import { sendNotice, markDelivered, recordAcknowledgment, recordResponse, cancelNotice, fetchDeliveryLog } from "@/services/noticeService";
import { supabase } from "@/integrations/supabase/client";
import { useRegnoParam } from "@/hooks/useRegnoParam";
import { EmployerLinkChip, RegnoFilterBanner } from "@/components/compliance/EmployerLinkChip";

const NOTICE_TYPE_COLORS: Record<string, string> = {
  LATE_C3: "bg-yellow-500/15 text-yellow-700 border-yellow-300",
  C3_NOT_SUBMITTED: "bg-orange-500/15 text-orange-700 border-orange-300",
  PAYMENT_NOT_RECEIVED: "bg-red-500/15 text-red-700 border-red-300",
  FINAL_WARNING: "bg-red-700/15 text-red-800 border-red-400",
  LEGAL_WARNING: "bg-purple-500/15 text-purple-700 border-purple-300",
};

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: "bg-green-500/15 text-green-700 border-green-300",
  SENT: "bg-blue-500/15 text-blue-700 border-blue-300",
  ACKNOWLEDGED: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
  PENDING: "bg-yellow-500/15 text-yellow-700 border-yellow-300",
  DRAFT: "bg-muted text-muted-foreground border-border",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/30",
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
  const location = useLocation();
  const { regno } = useRegnoParam();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseNotes, setResponseNotes] = useState("");
  const [responseDate, setResponseDate] = useState("");
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const userCode = "system";

  const [newNotice, setNewNotice] = useState({
    template_id: "", employer_id: "", employer_name: "", case_id: "",
    notice_type: "", delivery_method: "EMAIL", due_response_date: "", subject: "", body: "",
  });

  // Auto-open create dialog with prefilled data when navigated from Case Detail
  useEffect(() => {
    const prefill = (location.state as any)?.prefill;
    if (prefill) {
      setNewNotice(prev => ({
        ...prev,
        case_id: prefill.case_id || "",
        employer_id: prefill.employer_id || "",
        employer_name: prefill.employer_name || "",
      }));
      setCreateDialogOpen(true);
      // Clear navigation state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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

  // Fetch delivery logs for visible notices
  const { data: deliveryLogs = {} } = useQuery({
    queryKey: ["ce_delivery_logs_all", notices.map((n: any) => n.id).join(",")],
    queryFn: async () => {
      const logMap: Record<string, any[]> = {};
      for (const n of notices) {
        logMap[n.id] = await fetchDeliveryLog(n.id);
      }
      return logMap;
    },
    enabled: notices.length > 0,
  });

  const filteredNotices = useMemo(() => {
    let rows = notices;
    if (statusFilter !== "ALL") rows = rows.filter((n: any) => n.status === statusFilter);
    if (regno) rows = rows.filter((n: any) => n.employer_id === regno);
    return rows;
  }, [notices, statusFilter, regno]);

  const stats = useMemo(() => ({
    draft: notices.filter((n: any) => n.status === "DRAFT").length,
    sent: notices.filter((n: any) => n.status === "SENT").length,
    delivered: notices.filter((n: any) => n.status === "DELIVERED" || n.status === "ACKNOWLEDGED").length,
    responded: notices.filter((n: any) => n.response_received).length,
  }), [notices]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["ce_notices"] });
    queryClient.invalidateQueries({ queryKey: ["ce_delivery_logs_all"] });
  };

  // ── Lifecycle Mutations ──
  const sendMut = useMutation({
    mutationFn: (id: string) => sendNotice(id, userCode),
    onSuccess: () => { invalidate(); toast.success("Notice sent"); },
    onError: (e: any) => toast.error("Failed", { description: e.message }),
  });

  const deliverMut = useMutation({
    mutationFn: (id: string) => markDelivered(id, userCode),
    onSuccess: () => { invalidate(); toast.success("Marked as delivered"); },
    onError: (e: any) => toast.error("Failed", { description: e.message }),
  });

  const ackMut = useMutation({
    mutationFn: (id: string) => recordAcknowledgment(id, userCode),
    onSuccess: () => { invalidate(); toast.success("Acknowledgment recorded"); },
    onError: (e: any) => toast.error("Failed", { description: e.message }),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelNotice(id, "Cancelled from management", userCode),
    onSuccess: () => { invalidate(); toast.success("Notice cancelled"); },
    onError: (e: any) => toast.error("Failed", { description: e.message }),
  });

  const responseMut = useMutation({
    mutationFn: () => recordResponse(selectedNotice.id, responseNotes, responseDate, userCode),
    onSuccess: () => {
      invalidate();
      toast.success("Response recorded");
      setResponseDialogOpen(false);
      setResponseNotes("");
      setResponseDate("");
    },
    onError: (e: any) => toast.error("Failed", { description: e.message }),
  });

  const isMutating = sendMut.isPending || deliverMut.isPending || ackMut.isPending || cancelMut.isPending;

  const generateNoticeNumber = () => {
    const year = new Date().getFullYear();
    const existing = notices.filter((n: any) => n.notice_number?.startsWith(`CN-${year}`));
    const next = existing.length + 1;
    return `CN-${year}-${String(next).padStart(4, "0")}`;
  };

  const handleTemplateSelect = (templateId: string) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    setNewNotice(prev => ({ ...prev, template_id: templateId, notice_type: tpl.category, subject: tpl.subject || "", body: tpl.body }));
  };

  const createNoticeMut = useMutation({
    mutationFn: async () => {
      const noticeNumber = generateNoticeNumber();
      const { error } = await supabase.from("ce_notices").insert({
        notice_number: noticeNumber, employer_id: newNotice.employer_id, employer_name: newNotice.employer_name,
        case_id: newNotice.case_id || null, notice_type: newNotice.notice_type, status: "DRAFT",
        subject: newNotice.subject, body: resolveTemplate(newNotice.body, { employer_name: newNotice.employer_name, current_date: new Date().toLocaleDateString("en-GB") }),
        template_id: newNotice.template_id || null, delivery_method: newNotice.delivery_method,
        due_response_date: newNotice.due_response_date || null, created_by: userCode,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
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
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter("DRAFT")}>
          <CardContent className="pt-6"><div className="text-2xl font-bold text-foreground">{stats.draft}</div><p className="text-sm text-muted-foreground">Drafts</p></CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter("SENT")}>
          <CardContent className="pt-6"><div className="text-2xl font-bold text-foreground">{stats.sent}</div><p className="text-sm text-muted-foreground">Sent</p></CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter("DELIVERED")}>
          <CardContent className="pt-6"><div className="text-2xl font-bold text-foreground">{stats.delivered}</div><p className="text-sm text-muted-foreground">Delivered / Acknowledged</p></CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter("ALL")}>
          <CardContent className="pt-6"><div className="text-2xl font-bold text-foreground">{stats.responded}</div><p className="text-sm text-muted-foreground">Responses Received</p></CardContent>
        </Card>
      </div>

      {/* Notices List */}
      <Card>
        <CardHeader><CardTitle>Notices {statusFilter !== "ALL" && <Badge variant="outline" className="ml-2">{statusFilter}</Badge>}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by employer or notice number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredNotices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No notices found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotices.map((notice: any) => (
                <div key={notice.id} className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{notice.employer_name}</h3>
                        <Badge variant="outline" className="text-xs font-mono">{notice.notice_number}</Badge>
                        {notice.response_received && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300 text-[10px]">Response</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={NOTICE_TYPE_COLORS[notice.notice_type] || ""}>{(notice.notice_type || "").replace(/_/g, " ")}</Badge>
                      <Badge variant="outline" className={STATUS_COLORS[notice.status] || ""}>{notice.status}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
                    <div><p className="text-xs text-muted-foreground mb-1">Delivery</p><p className="text-sm font-medium text-foreground">{(notice.delivery_method || "-").replace(/_/g, " ")}</p></div>
                    <div><p className="text-xs text-muted-foreground mb-1">Sent</p><p className="text-sm font-medium text-foreground">{formatDate(notice.sent_at)}</p></div>
                    <div><p className="text-xs text-muted-foreground mb-1">Delivered</p><p className="text-sm font-medium text-foreground">{formatDate(notice.delivered_at)}</p></div>
                    <div><p className="text-xs text-muted-foreground mb-1">Response Due</p><p className="text-sm font-medium text-foreground">{formatDate(notice.due_response_date)}</p></div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedNotice(notice); setViewDialogOpen(true); }}><Eye className="h-3.5 w-3.5 mr-1" />View</Button>

                    {notice.status === "DRAFT" && (
                      <Button size="sm" variant="outline" onClick={() => sendMut.mutate(notice.id)} disabled={isMutating}>
                        <Send className="h-3.5 w-3.5 mr-1" />Send
                      </Button>
                    )}
                    {notice.status === "SENT" && (
                      <Button size="sm" variant="outline" onClick={() => deliverMut.mutate(notice.id)} disabled={isMutating}>
                        <Truck className="h-3.5 w-3.5 mr-1" />Mark Delivered
                      </Button>
                    )}
                    {notice.status === "DELIVERED" && (
                      <Button size="sm" variant="outline" onClick={() => ackMut.mutate(notice.id)} disabled={isMutating}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />Acknowledge
                      </Button>
                    )}
                    {["DELIVERED", "ACKNOWLEDGED"].includes(notice.status) && !notice.response_received && (
                      <Button size="sm" variant="outline" onClick={() => { setSelectedNotice(notice); setResponseDialogOpen(true); }}>
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />Record Response
                      </Button>
                    )}
                    {!["CANCELLED", "ACKNOWLEDGED"].includes(notice.status) && (
                      <Button size="sm" variant="destructive" onClick={() => cancelMut.mutate(notice.id)} disabled={isMutating}>
                        <XCircle className="h-3.5 w-3.5 mr-1" />Cancel
                      </Button>
                    )}
                  </div>

                  {/* Delivery Log (collapsible) */}
                  {(deliveryLogs[notice.id]?.length ?? 0) > 0 && (
                    <Collapsible open={expandedLogs[notice.id]} onOpenChange={(open) => setExpandedLogs(p => ({ ...p, [notice.id]: open }))}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs mt-2 p-0 h-auto text-muted-foreground">
                          <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${expandedLogs[notice.id] ? 'rotate-180' : ''}`} />
                          Delivery Log ({deliveryLogs[notice.id]?.length})
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="text-xs space-y-1 p-2 bg-muted/30 rounded">
                          {deliveryLogs[notice.id]?.map((log: any) => (
                            <div key={log.id} className="flex items-center gap-3">
                              <Badge variant="outline" className="text-[10px]">{log.status}</Badge>
                              <span>{log.channel}</span>
                              <span className="text-muted-foreground">{formatDate(log.created_at)}</span>
                              <span className="text-muted-foreground">{log.created_by || ''}</span>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Notice Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notice Details</DialogTitle>
            <DialogDescription>{selectedNotice?.notice_number} — {(selectedNotice?.notice_type || "").replace(/_/g, " ")}</DialogDescription>
          </DialogHeader>
          {selectedNotice && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground text-xs">Employer</Label><p className="font-medium text-foreground">{selectedNotice.employer_name}</p></div>
                <div><Label className="text-muted-foreground text-xs">Status</Label><div><Badge variant="outline" className={STATUS_COLORS[selectedNotice.status] || ""}>{selectedNotice.status}</Badge></div></div>
                <div><Label className="text-muted-foreground text-xs">Delivery Method</Label><p className="font-medium text-foreground">{(selectedNotice.delivery_method || "-").replace(/_/g, " ")}</p></div>
                <div><Label className="text-muted-foreground text-xs">Sent</Label><p className="font-medium text-foreground">{formatDate(selectedNotice.sent_at)}</p></div>
                <div><Label className="text-muted-foreground text-xs">Delivered</Label><p className="font-medium text-foreground">{formatDate(selectedNotice.delivered_at)}</p></div>
                <div><Label className="text-muted-foreground text-xs">Acknowledged</Label><p className="font-medium text-foreground">{formatDate(selectedNotice.acknowledged_at)}</p></div>
                {selectedNotice.due_response_date && (
                  <div><Label className="text-muted-foreground text-xs">Response Due</Label><p className="font-medium text-foreground">{formatDate(selectedNotice.due_response_date)}</p></div>
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
              {selectedNotice.response_received && (
                <div className="p-3 bg-emerald-500/5 border border-emerald-300 rounded-lg">
                  <Label className="text-xs font-semibold" style={{ color: 'hsl(var(--primary))' }}>Employer Response</Label>
                  <p className="text-sm mt-1 text-foreground">{selectedNotice.response_notes || 'No notes'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Received: {formatDate(selectedNotice.response_date)}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Employer Response</DialogTitle>
            <DialogDescription>Notice: {selectedNotice?.notice_number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Response Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={responseDate} onChange={e => setResponseDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Response Notes <span className="text-destructive">*</span></Label>
              <Textarea value={responseNotes} onChange={e => setResponseNotes(e.target.value)} rows={4} placeholder="Summary of employer's response..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => responseMut.mutate()} disabled={!responseDate || !responseNotes || responseMut.isPending}>
              {responseMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Response
            </Button>
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
            <div className="space-y-1.5">
              <Label>Template <span className="text-xs text-muted-foreground">(optional)</span></Label>
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
              {createNoticeMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Notice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
