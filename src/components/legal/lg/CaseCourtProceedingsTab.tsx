import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Gavel } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLgCourtsAll } from "@/hooks/legal/useLgCourts";
import { useUserCode } from "@/hooks/useUserCode";
import { toast } from "sonner";

const PROCEEDING_TYPES = ["SUIT", "SUMMONS", "WARRANT", "JUDGMENT", "APPEAL", "OTHER"];
const PROCEEDING_STATUSES = ["FILED", "SCHEDULED", "IN_PROGRESS", "DECIDED", "DISMISSED", "WITHDRAWN", "ADJOURNED"];

interface Props {
  caseId: string;
  defaultCourtCode?: string | null;
  defaultDivisionCode?: string | null;
  defaultVenueCode?: string | null;
  defaultOfficerCode?: string | null;
}

export default function CaseCourtProceedingsTab({
  caseId,
  defaultCourtCode,
  defaultDivisionCode,
  defaultVenueCode,
  defaultOfficerCode,
}: Props) {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const { data: refs } = useLgCourtsAll();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    proceeding_type: "SUIT",
    court_code: defaultCourtCode ?? null,
    division_code: defaultDivisionCode ?? null,
    venue_code: defaultVenueCode ?? null,
    presiding_officer_code: defaultOfficerCode ?? null,
    court_reference_no: "",
    related_previous_court_reference_no: "",
    filing_date: new Date().toISOString().slice(0, 10),
    hearing_date: "",
    judgment_amount: "",
    cost_amount: "",
    installment_amount: "",
    default_consequence: "",
    outcome: "",
    notes: "",
    status: "FILED",
  });

  const list = useQuery({
    queryKey: ["lg_court_proceeding", caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lg_court_proceeding")
        .select("*")
        .eq("lg_case_id", caseId)
        .order("filing_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const divisions = useMemo(
    () => (refs?.divisions ?? []).filter((d) => !form.court_code || d.court_code === form.court_code),
    [refs, form.court_code],
  );
  const venues = useMemo(
    () => (refs?.venues ?? []).filter((v) => !form.court_code || v.court_code === form.court_code),
    [refs, form.court_code],
  );
  const officers = useMemo(
    () => (refs?.officers ?? []).filter((o) => !form.court_code || o.court_code === form.court_code),
    [refs, form.court_code],
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!form.court_code) throw new Error("Court is required");
      if (!form.court_reference_no?.trim()) throw new Error("Court reference number is required");
      const payload: any = {
        lg_case_id: caseId,
        proceeding_type: form.proceeding_type,
        court_code: form.court_code,
        division_code: form.division_code || null,
        venue_code: form.venue_code || null,
        presiding_officer_code: form.presiding_officer_code || null,
        court_reference_no: form.court_reference_no.trim(),
        related_previous_court_reference_no: form.related_previous_court_reference_no?.trim() || null,
        filing_date: form.filing_date || null,
        hearing_date: form.hearing_date || null,
        judgment_amount: form.judgment_amount ? Number(form.judgment_amount) : null,
        cost_amount: form.cost_amount ? Number(form.cost_amount) : null,
        installment_amount: form.installment_amount ? Number(form.installment_amount) : null,
        default_consequence: form.default_consequence || null,
        outcome: form.outcome || null,
        notes: form.notes || null,
        status: form.status,
        created_by: userCode ?? null,
        updated_by: userCode ?? null,
      };
      const { error } = await (supabase as any).from("lg_court_proceeding").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Court proceeding added");
      qc.invalidateQueries({ queryKey: ["lg_court_proceeding", caseId] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", caseId] });
      setOpen(false);
      setForm((f: any) => ({ ...f, court_reference_no: "", outcome: "", notes: "" }));
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to add proceeding"),
  });

  const courtName = (code?: string | null) =>
    refs?.courts.find((c) => c.court_code === code)?.court_name ?? code ?? "—";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Gavel className="h-4 w-4" /> Court Proceedings</CardTitle>
          <CardDescription>Suits, summons, warrants and judgments filed for this case.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Add Proceeding
        </Button>
      </CardHeader>
      <CardContent>
        {list.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (list.data?.length ?? 0) === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No proceedings recorded.</div>
        ) : (
          <div className="space-y-2">
            {list.data!.map((p) => (
              <div key={p.id} className="border rounded p-3 text-sm grid md:grid-cols-4 gap-2">
                <div>
                  <div className="text-xs text-muted-foreground">Type / Status</div>
                  <div className="font-medium">{p.proceeding_type}</div>
                  <Badge variant="outline" className="mt-1">{p.status}</Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Court</div>
                  <div>{courtName(p.court_code)}</div>
                  <div className="text-xs text-muted-foreground">Ref: <span className="font-mono">{p.court_reference_no}</span></div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Dates</div>
                  <div>Filed: {p.filing_date || "—"}</div>
                  <div>Hearing: {p.hearing_date || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Amounts</div>
                  <div>Judgment: {p.judgment_amount ?? "—"}</div>
                  <div>Costs: {p.cost_amount ?? "—"}</div>
                </div>
                {p.outcome && <div className="md:col-span-4 text-xs"><span className="text-muted-foreground">Outcome:</span> {p.outcome}</div>}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Court Proceeding</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Type *</Label>
              <Select value={form.proceeding_type} onValueChange={(v) => setForm((f: any) => ({ ...f, proceeding_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROCEEDING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f: any) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROCEEDING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Court *</Label>
              <Select
                value={form.court_code ?? ""}
                onValueChange={(v) => setForm((f: any) => ({ ...f, court_code: v, division_code: null, venue_code: null, presiding_officer_code: null }))}
              >
                <SelectTrigger><SelectValue placeholder="Select court…" /></SelectTrigger>
                <SelectContent className="max-h-80">
                  {(refs?.courts ?? []).map((c) => <SelectItem key={c.court_code} value={c.court_code}>{c.court_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Court Reference No. *</Label>
              <Input value={form.court_reference_no} onChange={(e) => setForm((f: any) => ({ ...f, court_reference_no: e.target.value }))} maxLength={50} placeholder="Manual entry from court" />
            </div>
            <div>
              <Label>Division</Label>
              <Select value={form.division_code ?? ""} onValueChange={(v) => setForm((f: any) => ({ ...f, division_code: v }))} disabled={!form.court_code}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{divisions.map((d) => <SelectItem key={d.division_code} value={d.division_code}>{d.division_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Venue</Label>
              <Select value={form.venue_code ?? ""} onValueChange={(v) => setForm((f: any) => ({ ...f, venue_code: v }))} disabled={!form.court_code}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{venues.map((v) => <SelectItem key={v.venue_code} value={v.venue_code}>{v.venue_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Presiding Officer</Label>
              <Select value={form.presiding_officer_code ?? ""} onValueChange={(v) => setForm((f: any) => ({ ...f, presiding_officer_code: v }))} disabled={!form.court_code}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{officers.map((o) => <SelectItem key={o.officer_code} value={o.officer_code}>{o.officer_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Related Previous Ref</Label>
              <Input value={form.related_previous_court_reference_no} onChange={(e) => setForm((f: any) => ({ ...f, related_previous_court_reference_no: e.target.value }))} maxLength={50} />
            </div>
            <div>
              <Label>Filing Date</Label>
              <Input type="date" value={form.filing_date} onChange={(e) => setForm((f: any) => ({ ...f, filing_date: e.target.value }))} />
            </div>
            <div>
              <Label>Hearing Date</Label>
              <Input type="date" value={form.hearing_date} onChange={(e) => setForm((f: any) => ({ ...f, hearing_date: e.target.value }))} />
            </div>
            <div>
              <Label>Judgment Amount</Label>
              <Input type="number" step="0.01" value={form.judgment_amount} onChange={(e) => setForm((f: any) => ({ ...f, judgment_amount: e.target.value }))} />
            </div>
            <div>
              <Label>Cost Amount</Label>
              <Input type="number" step="0.01" value={form.cost_amount} onChange={(e) => setForm((f: any) => ({ ...f, cost_amount: e.target.value }))} />
            </div>
            <div>
              <Label>Installment Amount</Label>
              <Input type="number" step="0.01" value={form.installment_amount} onChange={(e) => setForm((f: any) => ({ ...f, installment_amount: e.target.value }))} />
            </div>
            <div>
              <Label>Default Consequence</Label>
              <Input value={form.default_consequence} onChange={(e) => setForm((f: any) => ({ ...f, default_consequence: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Outcome</Label>
              <Textarea rows={2} value={form.outcome} onChange={(e) => setForm((f: any) => ({ ...f, outcome: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
