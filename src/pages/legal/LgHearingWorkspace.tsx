import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Gavel, Calendar as CalIcon, User, Users, FileText, Files, Award, ListOrdered, ClipboardCheck, History, Shield, ExternalLink, Plus, AlertTriangle } from "lucide-react";
import {
  getHearing,
  listAttendees,
  listEvidence,
  listPrepChecklist,
  listAdjournments,
  listCommunications,
  listRelatedTasks,
  ensureDefaultChecklist,
  detectConflicts,
} from "@/services/legal/lgHearingWorkbenchService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDateForDisplay } from "@/lib/format-config";

const OUTCOMES = [
  "COMPLETED","ADJOURNED","ORDER_ISSUED","JUDGMENT_RESERVED","JUDGMENT_DELIVERED",
  "WITHDRAWN","DISMISSED","SETTLEMENT","TRANSFERRED","CANCELLED",
];

export default function LgHearingWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState("overview");

  const { data: h, isLoading } = useQuery({
    queryKey: ["lg-hearing", id],
    queryFn: () => getHearing(id!),
    enabled: !!id,
  });

  const { data: attendees = [] } = useQuery({ queryKey: ["lg-hearing-attendees", id], queryFn: () => listAttendees(id!), enabled: !!id });
  const { data: evidence = [] } = useQuery({ queryKey: ["lg-hearing-evidence", id], queryFn: () => listEvidence(id!), enabled: !!id });
  const { data: checklist = [] } = useQuery({ queryKey: ["lg-hearing-prep", id], queryFn: () => listPrepChecklist(id!), enabled: !!id });
  const { data: adjournments = [] } = useQuery({ queryKey: ["lg-hearing-adj", id], queryFn: () => listAdjournments(id!), enabled: !!id });
  const { data: comms = [] } = useQuery({ queryKey: ["lg-hearing-comms", id], queryFn: () => listCommunications(id!), enabled: !!id });
  const { data: tasks = [] } = useQuery({ queryKey: ["lg-hearing-tasks", id], queryFn: () => listRelatedTasks(id!), enabled: !!id });
  const { data: conflicts = [] } = useQuery({
    queryKey: ["lg-hearing-conflicts", id, h?.hearing_date, h?.hearing_time, h?.officer_code, h?.court_code],
    queryFn: () => detectConflicts({
      id: h?.id, lg_case_id: h?.lg_case_id, hearing_date: h?.hearing_date,
      hearing_time: h?.hearing_time, officer_code: h?.officer_code, court_code: h?.court_code,
    }),
    enabled: !!h?.hearing_date,
  });

  // Ensure default checklist exists once
  useEffect(() => {
    if (id && checklist.length === 0 && !isLoading) {
      ensureDefaultChecklist(id).then(() => qc.invalidateQueries({ queryKey: ["lg-hearing-prep", id] })).catch(() => {});
    }
  }, [id, checklist.length, isLoading, qc]);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading hearing…</div>;
  if (!h) return (
    <div className="p-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
      <p className="mt-4 text-sm text-muted-foreground">Hearing not found.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1600px] mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Gavel className="h-6 w-6" /> Hearing Workspace
              </h1>
              <p className="text-xs text-muted-foreground font-mono">{h.hearing_number ?? h.id}</p>
            </div>
            <Badge variant="outline">{h.status ?? "SCHEDULED"}</Badge>
            {h.outcome_code && <Badge className="bg-primary/10 text-primary border-primary/20">{h.outcome_code}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/legal/lg/cases/${h.lg_case_id}`)}>
              <ExternalLink className="h-4 w-4 mr-1" /> Matter {h.lg_case_no ?? ""}
            </Button>
            <Button variant="outline" onClick={() => navigate(`/legal/lg/cases/${h.lg_case_id}?tab=recovery`)}>Recovery</Button>
            <Button variant="outline" onClick={() => navigate(`/legal/lg/cases/${h.lg_case_id}?tab=documents`)}>Documents</Button>
          </div>
        </div>

        {conflicts.length > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-3 space-y-1 text-sm">
              <div className="font-medium flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" /> Conflict warnings
              </div>
              <ul className="list-disc pl-5">
                {conflicts.map((c, i) => <li key={i}>{c.message}</li>)}
              </ul>
            </CardContent>
          </Card>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview"><FileText className="h-4 w-4 mr-1" />Overview</TabsTrigger>
            <TabsTrigger value="court"><Gavel className="h-4 w-4 mr-1" />Court</TabsTrigger>
            <TabsTrigger value="participants"><Users className="h-4 w-4 mr-1" />Participants</TabsTrigger>
            <TabsTrigger value="evidence"><Files className="h-4 w-4 mr-1" />Evidence</TabsTrigger>
            <TabsTrigger value="prep"><ClipboardCheck className="h-4 w-4 mr-1" />Preparation</TabsTrigger>
            <TabsTrigger value="outcome"><Award className="h-4 w-4 mr-1" />Outcome</TabsTrigger>
            <TabsTrigger value="orders"><ListOrdered className="h-4 w-4 mr-1" />Orders</TabsTrigger>
            <TabsTrigger value="adjournments"><CalIcon className="h-4 w-4 mr-1" />Adjournments</TabsTrigger>
            <TabsTrigger value="comms"><User className="h-4 w-4 mr-1" />Comms</TabsTrigger>
            <TabsTrigger value="tasks"><History className="h-4 w-4 mr-1" />Tasks</TabsTrigger>
            <TabsTrigger value="audit"><Shield className="h-4 w-4 mr-1" />Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="pt-4">
            <OverviewTab h={h as any} />
          </TabsContent>
          <TabsContent value="court" className="pt-4">
            <CourtDetailsTab h={h as any} onSaved={() => qc.invalidateQueries({ queryKey: ["lg-hearing", id] })} />
          </TabsContent>
          <TabsContent value="participants" className="pt-4">
            <ParticipantsTab hearingId={id!} rows={attendees} onChange={() => qc.invalidateQueries({ queryKey: ["lg-hearing-attendees", id] })} />
          </TabsContent>
          <TabsContent value="evidence" className="pt-4">
            <EvidenceTab hearingId={id!} rows={evidence} onChange={() => qc.invalidateQueries({ queryKey: ["lg-hearing-evidence", id] })} />
          </TabsContent>
          <TabsContent value="prep" className="pt-4">
            <PrepTab hearingId={id!} rows={checklist} onChange={() => qc.invalidateQueries({ queryKey: ["lg-hearing-prep", id] })} />
          </TabsContent>
          <TabsContent value="outcome" className="pt-4">
            <OutcomeTab h={h as any} onSaved={() => qc.invalidateQueries({ queryKey: ["lg-hearing", id] })} />
          </TabsContent>
          <TabsContent value="orders" className="pt-4">
            <OrdersLinkTab h={h as any} />
          </TabsContent>
          <TabsContent value="adjournments" className="pt-4">
            <AdjournmentsTab hearingId={id!} rows={adjournments} onChange={() => {
              qc.invalidateQueries({ queryKey: ["lg-hearing-adj", id] });
              qc.invalidateQueries({ queryKey: ["lg-hearing", id] });
            }} />
          </TabsContent>
          <TabsContent value="comms" className="pt-4">
            <CommsTab hearingId={id!} rows={comms} onChange={() => qc.invalidateQueries({ queryKey: ["lg-hearing-comms", id] })} />
          </TabsContent>
          <TabsContent value="tasks" className="pt-4">
            <TasksTab rows={tasks} />
          </TabsContent>
          <TabsContent value="audit" className="pt-4">
            <AuditTab hearingId={id!} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ---------------- Tabs ----------------

function OverviewTab({ h }: { h: any }) {
  return (
    <Card><CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      <Info label="Hearing #" value={h.hearing_number} />
      <Info label="Matter" value={h.lg_case_no} />
      <Info label="Date" value={h.hearing_date ? formatDateForDisplay(h.hearing_date) : "—"} />
      <Info label="Time" value={h.hearing_time ?? "—"} />
      <Info label="Type" value={h.hearing_type_code} />
      <Info label="Stage" value={h.hearing_stage} />
      <Info label="Court" value={h.court_name_display} />
      <Info label="Court File #" value={h.court_file_number} />
      <Info label="Judge" value={h.judge_name || h.magistrate_name} />
      <Info label="Officer" value={h.officer_code} />
      <Info label="Lead Counsel" value={h.lead_counsel_code} />
      <Info label="Priority" value={h.priority} />
      <Info label="Adjournments" value={h.adjournment_count} />
      <Info label="Outcome" value={h.outcome_code} />
      <Info label="Order Status" value={h.order_status} />
      <Info label="Recovery Impact" value={h.recovery_impact_amount ? `XCD ${Number(h.recovery_impact_amount).toLocaleString()}` : "—"} />
    </CardContent></Card>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}

function CourtDetailsTab({ h, onSaved }: { h: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    court_code: h.court_code ?? "",
    court_file_number: h.court_file_number ?? "",
    division_code: h.division_code ?? "",
    judge_name: h.judge_name ?? "",
    magistrate_name: h.magistrate_name ?? "",
    court_clerk_name: h.court_clerk_name ?? "",
    venue_code: h.venue_code ?? "",
    jurisdiction: h.jurisdiction ?? "",
    hearing_type_code: h.hearing_type_code ?? "",
    session_number: h.session_number ?? "",
  });
  const save = async () => {
    const { error } = await (supabase.from("lg_hearing") as any).update(form).eq("id", h.id);
    if (error) return toast.error(error.message);
    toast.success("Court details saved.");
    onSaved();
  };
  return (
    <Card><CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
      {Object.entries(form).map(([k, v]) => (
        <div key={k}>
          <Label className="text-xs">{k.replaceAll("_", " ")}</Label>
          <Input value={v as string} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        </div>
      ))}
      <div className="md:col-span-3 flex justify-end"><Button onClick={save}>Save Court Details</Button></div>
    </CardContent></Card>
  );
}

function ParticipantsTab({ hearingId, rows, onChange }: { hearingId: string; rows: any[]; onChange: () => void }) {
  const [role, setRole] = useState("WITNESS");
  const [name, setName] = useState("");
  const add = async () => {
    if (!name.trim()) return;
    const { error } = await (supabase.from("lg_hearing_attendee") as any).insert({ lg_hearing_id: hearingId, attendee_role: role, attendee_name: name });
    if (error) return toast.error(error.message);
    setName("");
    onChange();
  };
  const toggle = async (r: any) => {
    const { error } = await (supabase.from("lg_hearing_attendee") as any).update({ attended: !r.attended }).eq("id", r.id);
    if (error) return toast.error(error.message);
    onChange();
  };
  const roles = ["LEGAL_OFFICER","LEAD_COUNSEL","CO_COUNSEL","EMPLOYER_REP","INSURED_PERSON","WITNESS","EXPERT","COURT_OFFICER"];
  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="flex flex-wrap gap-2 items-end">
        <div><Label className="text-xs">Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{roles.map((r) => <SelectItem key={r} value={r}>{r.replaceAll("_"," ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]"><Label className="text-xs">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Add</Button>
      </div>
      <div className="space-y-1">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No participants yet.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 border rounded px-3 py-2 text-sm">
            <Badge variant="outline">{(r.attendee_role || "").replaceAll("_"," ")}</Badge>
            <div className="flex-1">{r.attendee_name}</div>
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={!!r.attended} onCheckedChange={() => toggle(r)} /> Attended
            </label>
          </div>
        ))}
      </div>
    </CardContent></Card>
  );
}

function EvidenceTab({ hearingId, rows, onChange }: { hearingId: string; rows: any[]; onChange: () => void }) {
  const [form, setForm] = useState({ evidence_type: "DOCUMENT", title: "", exhibit_number: "", witness_name: "" });
  const add = async () => {
    if (!form.title.trim()) return;
    const { error } = await (supabase.from("lg_hearing_evidence") as any).insert({ lg_hearing_id: hearingId, ...form });
    if (error) return toast.error(error.message);
    setForm({ evidence_type: "DOCUMENT", title: "", exhibit_number: "", witness_name: "" });
    onChange();
  };
  const setStatus = async (r: any, patch: any) => {
    const { error } = await (supabase.from("lg_hearing_evidence") as any).update(patch).eq("id", r.id);
    if (error) return toast.error(error.message);
    onChange();
  };
  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
        <div><Label className="text-xs">Type</Label>
          <Select value={form.evidence_type} onValueChange={(v) => setForm({ ...form, evidence_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["DOCUMENT","EXHIBIT","WITNESS_STATEMENT","EXPERT_REPORT","OTHER"].map((v) => <SelectItem key={v} value={v}>{v.replaceAll("_"," ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label className="text-xs">Exhibit #</Label><Input value={form.exhibit_number} onChange={(e) => setForm({ ...form, exhibit_number: e.target.value })} /></div>
        <div><Label className="text-xs">Witness</Label><Input value={form.witness_name} onChange={(e) => setForm({ ...form, witness_name: e.target.value })} /></div>
        <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Add Evidence</Button>
      </div>
      <div className="space-y-1">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No evidence recorded.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 border rounded px-3 py-2 text-sm">
            <Badge variant="outline">{r.evidence_type}</Badge>
            <div className="flex-1 truncate">
              <span className="font-medium">{r.title}</span>
              {r.exhibit_number && <span className="ml-2 text-xs text-muted-foreground">#{r.exhibit_number}</span>}
            </div>
            <label className="flex items-center gap-1 text-xs"><Checkbox checked={!!r.submitted} onCheckedChange={(v) => setStatus(r, { submitted: !!v })} /> Submitted</label>
            <label className="flex items-center gap-1 text-xs"><Checkbox checked={!!r.accepted} onCheckedChange={(v) => setStatus(r, { accepted: !!v, rejected: v ? false : r.rejected })} /> Accepted</label>
            <label className="flex items-center gap-1 text-xs"><Checkbox checked={!!r.rejected} onCheckedChange={(v) => setStatus(r, { rejected: !!v, accepted: v ? false : r.accepted })} /> Rejected</label>
          </div>
        ))}
      </div>
    </CardContent></Card>
  );
}

function PrepTab({ hearingId, rows, onChange }: { hearingId: string; rows: any[]; onChange: () => void }) {
  const toggle = async (r: any) => {
    const { error } = await (supabase.from("lg_hearing_prep_checklist") as any).update({
      completed: !r.completed,
      completed_at: !r.completed ? new Date().toISOString() : null,
    }).eq("id", r.id);
    if (error) return toast.error(error.message);
    onChange();
    // If all mandatory items complete, mark hearing prep_completed
    const remaining = rows.filter((x) => x.mandatory && !x.completed && x.id !== r.id).length;
    if (!r.completed && remaining === 0) {
      await (supabase.from("lg_hearing") as any).update({ prep_completed: true, documents_ready: true }).eq("id", hearingId);
      toast.success("Preparation checklist complete.");
    }
  };
  const total = rows.length;
  const done = rows.filter((r) => r.completed).length;
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Preparation Checklist ({done}/{total})</CardTitle></CardHeader>
      <CardContent className="space-y-1">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Loading checklist…</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 border rounded px-3 py-2 text-sm">
            <Checkbox checked={!!r.completed} onCheckedChange={() => toggle(r)} />
            <div className="flex-1">
              <span className="font-medium">{r.item_label}</span>
              {r.mandatory && <Badge variant="outline" className="ml-2 text-[10px]">Mandatory</Badge>}
            </div>
            {r.completed_at && <span className="text-[10px] text-muted-foreground">Completed {new Date(r.completed_at).toLocaleString()}</span>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function OutcomeTab({ h, onSaved }: { h: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    outcome_code: h.outcome_code ?? "",
    outcome_notes: h.outcome_notes ?? "",
    next_hearing_date: h.next_hearing_date ?? "",
    minutes: h.minutes ?? "",
    status: h.status ?? "SCHEDULED",
  });
  const save = async () => {
    const patch: any = { ...form };
    if (form.outcome_code === "COMPLETED") patch.status = "COMPLETED";
    if (form.outcome_code === "ADJOURNED") patch.status = "ADJOURNED";
    if (form.outcome_code === "CANCELLED") patch.status = "CANCELLED";
    if (form.outcome_code === "JUDGMENT_RESERVED") patch.judgment_reserved_at = new Date().toISOString();
    if (form.outcome_code === "JUDGMENT_DELIVERED") patch.judgment_delivered_at = new Date().toISOString();
    const { error } = await (supabase.from("lg_hearing") as any).update(patch).eq("id", h.id);
    if (error) return toast.error(error.message);
    toast.success("Outcome recorded.");
    onSaved();
  };
  return (
    <Card><CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
      <div><Label className="text-xs">Outcome</Label>
        <Select value={form.outcome_code} onValueChange={(v) => setForm({ ...form, outcome_code: v })}>
          <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
          <SelectContent>{OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o.replaceAll("_"," ")}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label className="text-xs">Next Hearing Date</Label><Input type="date" value={form.next_hearing_date} onChange={(e) => setForm({ ...form, next_hearing_date: e.target.value })} /></div>
      <div className="md:col-span-2"><Label className="text-xs">Outcome Notes</Label><Textarea value={form.outcome_notes} onChange={(e) => setForm({ ...form, outcome_notes: e.target.value })} /></div>
      <div className="md:col-span-2"><Label className="text-xs">Minutes</Label><Textarea value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} /></div>
      <div className="md:col-span-2 flex justify-end"><Button onClick={save}>Record Outcome</Button></div>
    </CardContent></Card>
  );
}

function OrdersLinkTab({ h }: { h: any }) {
  const navigate = useNavigate();
  return (
    <Card><CardContent className="p-4 space-y-2 text-sm">
      <p>Orders and judgments are managed at the Matter level.</p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate(`/legal/lg/cases/${h.lg_case_id}?tab=orders`)}>Open Matter Orders tab</Button>
        <Button variant="outline" onClick={() => navigate(`/legal/court-orders?case=${h.lg_case_id}`)}>Orders Management</Button>
      </div>
    </CardContent></Card>
  );
}

function AdjournmentsTab({ hearingId, rows, onChange }: { hearingId: string; rows: any[]; onChange: () => void }) {
  const [form, setForm] = useState({ reason_code: "", reason_notes: "", next_hearing_date: "", recovery_delay_days: "" });
  const add = async () => {
    const number = (rows[rows.length - 1]?.adjournment_number ?? 0) + 1;
    const payload: any = {
      lg_hearing_id: hearingId,
      adjournment_number: number,
      reason_code: form.reason_code || null,
      reason_notes: form.reason_notes || null,
      next_hearing_date: form.next_hearing_date || null,
      recovery_delay_days: form.recovery_delay_days ? Number(form.recovery_delay_days) : null,
    };
    const { error } = await (supabase.from("lg_hearing_adjournment") as any).insert(payload);
    if (error) return toast.error(error.message);
    // Also patch the hearing itself: mark ADJOURNED and set next date
    await (supabase.from("lg_hearing") as any).update({
      status: "ADJOURNED",
      adjournment_reason: form.reason_notes || form.reason_code || null,
      next_hearing_date: form.next_hearing_date || null,
    }).eq("id", hearingId);
    setForm({ reason_code: "", reason_notes: "", next_hearing_date: "", recovery_delay_days: "" });
    onChange();
    toast.success("Adjournment recorded.");
  };
  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        <div><Label className="text-xs">Reason Code</Label><Input value={form.reason_code} onChange={(e) => setForm({ ...form, reason_code: e.target.value })} /></div>
        <div className="md:col-span-2"><Label className="text-xs">Reason Notes</Label><Input value={form.reason_notes} onChange={(e) => setForm({ ...form, reason_notes: e.target.value })} /></div>
        <div><Label className="text-xs">Next Date</Label><Input type="date" value={form.next_hearing_date} onChange={(e) => setForm({ ...form, next_hearing_date: e.target.value })} /></div>
        <div><Label className="text-xs">Recovery Delay (days)</Label><Input type="number" value={form.recovery_delay_days} onChange={(e) => setForm({ ...form, recovery_delay_days: e.target.value })} /></div>
        <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Record Adjournment</Button>
      </div>
      <div className="space-y-1">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No adjournments recorded.</p>}
        {rows.map((r) => (
          <div key={r.id} className="border rounded px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge>#{r.adjournment_number}</Badge>
              <span className="font-medium">{r.reason_code || "—"}</span>
              {r.next_hearing_date && <span className="text-xs text-muted-foreground">→ {formatDateForDisplay(r.next_hearing_date)}</span>}
              {r.recovery_delay_days != null && <span className="text-xs text-amber-600">Recovery delay: {r.recovery_delay_days}d</span>}
            </div>
            {r.reason_notes && <p className="text-xs text-muted-foreground mt-1">{r.reason_notes}</p>}
          </div>
        ))}
      </div>
    </CardContent></Card>
  );
}

function CommsTab({ hearingId, rows, onChange }: { hearingId: string; rows: any[]; onChange: () => void }) {
  const [form, setForm] = useState({ comm_type: "HEARING_NOTICE", channel: "EMAIL", recipient: "", subject: "", body: "" });
  const add = async () => {
    if (!form.recipient.trim()) return;
    const { error } = await (supabase.from("lg_hearing_communication") as any).insert({ lg_hearing_id: hearingId, ...form });
    if (error) return toast.error(error.message);
    setForm({ ...form, recipient: "", subject: "", body: "" });
    onChange();
  };
  const dispatch = async (r: any) => {
    const { error } = await (supabase.from("lg_hearing_communication") as any).update({
      dispatch_status: "DISPATCHED", dispatched_at: new Date().toISOString(),
    }).eq("id", r.id);
    if (error) return toast.error(error.message);
    onChange();
  };
  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        <div><Label className="text-xs">Type</Label>
          <Select value={form.comm_type} onValueChange={(v) => setForm({ ...form, comm_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["COURT_NOTICE","HEARING_NOTICE","REMINDER","ATTENDANCE_CONFIRMATION","INTERNAL"].map((v) => <SelectItem key={v} value={v}>{v.replaceAll("_"," ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Channel</Label>
          <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["EMAIL","SMS","LETTER","PORTAL"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2"><Label className="text-xs">Recipient</Label><Input value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} /></div>
        <div className="md:col-span-2"><Label className="text-xs">Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
        <div className="md:col-span-2"><Label className="text-xs">Body</Label><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
        <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Add Communication</Button>
      </div>
      <div className="space-y-1">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No communications yet.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 border rounded px-3 py-2 text-sm">
            <Badge variant="outline">{r.comm_type}</Badge>
            <div className="flex-1 truncate">
              <span className="font-medium">{r.subject || "(no subject)"}</span>
              <span className="ml-2 text-xs text-muted-foreground">{r.recipient}</span>
            </div>
            <Badge className={r.dispatch_status === "DISPATCHED" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : ""} variant="outline">{r.dispatch_status}</Badge>
            {r.dispatch_status !== "DISPATCHED" && <Button size="sm" variant="outline" onClick={() => dispatch(r)}>Dispatch</Button>}
          </div>
        ))}
      </div>
    </CardContent></Card>
  );
}

function TasksTab({ rows }: { rows: any[] }) {
  return (
    <Card><CardContent className="p-4 space-y-1">
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No tasks linked to this hearing.</p>}
      {rows.map((r) => (
        <div key={r.id} className="border rounded px-3 py-2 text-sm flex items-center gap-3">
          <Badge variant="outline">{r.status}</Badge>
          <div className="flex-1"><div className="font-medium">{r.title}</div>{r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}</div>
          {r.due_date && <span className="text-xs text-muted-foreground">Due {formatDateForDisplay(r.due_date)}</span>}
        </div>
      ))}
    </CardContent></Card>
  );
}

function AuditTab({ hearingId }: { hearingId: string }) {
  const { data: rows = [] } = useQuery({
    queryKey: ["lg-hearing-audit", hearingId],
    queryFn: async () => {
      const { data } = await (supabase.from("lg_case_activity") as any)
        .select("*").eq("entity_type", "HEARING").eq("entity_id", hearingId).order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });
  return (
    <Card><CardContent className="p-4 space-y-1">
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No audit events yet. Audit entries are written by the case activity service when hearing state changes.</p>}
      {rows.map((r: any) => (
        <div key={r.id} className="border rounded px-3 py-2 text-sm">
          <div className="flex items-center gap-2"><Badge variant="outline">{r.event_type}</Badge><span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span></div>
          {r.description && <p className="text-xs mt-1">{r.description}</p>}
        </div>
      ))}
    </CardContent></Card>
  );
}
