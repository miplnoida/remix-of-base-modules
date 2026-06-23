import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Save, Scale } from "lucide-react";
import { toast } from "sonner";
import { useLgCase, useUpdateLgCase, useLgReference } from "@/hooks/legal/useLgCases";
import { useUserCode } from "@/hooks/useUserCode";
import { logLgActivity } from "@/services/legal/lgAuditService";
import CourtSelector from "@/components/legal/lg/CourtSelector";


export default function LgCaseEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userCode } = useUserCode();
  const { data: caseRow, isLoading } = useLgCase(id);
  const update = useUpdateLgCase();

  const { data: caseTypes = [] } = useLgReference("LG_CASE_TYPE");
  const { data: caseCategories = [] } = useLgReference("LG_CASE_CATEGORY");
  const { data: priorities = [] } = useLgReference("LG_PRIORITY");
  const { data: stages = [] } = useLgReference("LG_CASE_STAGE");
  const { data: statuses = [] } = useLgReference("LG_CASE_STATUS");

  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (caseRow && !form) setForm({ ...caseRow });
  }, [caseRow, form]);

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form?.case_type_code || !form?.priority_code || !form?.current_stage_code || !form?.opened_date) {
      toast.error("Please check the form for valid information!", { description: "Type, priority, stage and opened date are required." });
      return;
    }
    try {
      const patch: any = {
        country_code: form.country_code,
        case_type_code: form.case_type_code,
        case_category_code: form.case_category_code,
        status_code: form.status_code,
        current_stage_code: form.current_stage_code,
        priority_code: form.priority_code,
        opened_date: form.opened_date,
        summary: form.summary,
        court_name: form.court_name,
        court_case_no: form.court_case_no,
        court_code: form.court_code,
        court_division_code: form.court_division_code,
        court_venue_code: form.court_venue_code,
        presiding_officer_code: form.presiding_officer_code,
        claim_amount: form.claim_amount,

        outstanding_amount_snapshot: form.outstanding_amount_snapshot,
        legacy_case_no: form.legacy_case_no,
        legacy_employer_name: form.legacy_employer_name,
        legacy_person_name: form.legacy_person_name,
        legacy_court_case_no: form.legacy_court_case_no,
        legacy_opened_date: form.legacy_opened_date,
        legacy_notes: form.legacy_notes,
        updated_by: userCode ?? null,
      };
      await update.mutateAsync({ id: id!, patch });
      await logLgActivity({
        lg_case_id: id!,
        activity_type: "CASE_UPDATED",
        description: `${caseRow?.lg_case_no} updated`,
        performed_by: userCode ?? null,
      });
      toast.success("Case updated");
      navigate(`/legal/lg/cases/${id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update case");
    }
  };

  if (isLoading || !form) {
    return <div className="p-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  const isLegacy = !!form.is_legacy || form.source_mode === "LEGACY";

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate(`/legal/lg/cases/${id}`)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Case
          </Button>
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Edit Case {caseRow?.lg_case_no}</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Case Details</CardTitle>
            <CardDescription>Update classification, dates, court and amounts.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Country</Label>
              <Input value={form.country_code ?? ""} onChange={(e) => set("country_code", e.target.value.toUpperCase())} maxLength={3} />
            </div>
            <div>
              <Label>Case Category</Label>
              <Select value={form.case_category_code ?? ""} onValueChange={(v) => set("case_category_code", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {caseCategories.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Case Type *</Label>
              <Select value={form.case_type_code} onValueChange={(v) => set("case_type_code", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-80">
                  {caseTypes.map((t) => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status_code} onValueChange={(v) => set("status_code", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority *</Label>
              <Select value={form.priority_code} onValueChange={(v) => set("priority_code", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(priorities.length ? priorities : [
                    { code: "LOW", label: "Low" }, { code: "MEDIUM", label: "Medium" },
                    { code: "HIGH", label: "High" }, { code: "URGENT", label: "Urgent" },
                  ]).map((p) => <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Current Stage *</Label>
              <Select value={form.current_stage_code} onValueChange={(v) => set("current_stage_code", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stages.map((s) => <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Opened Date *</Label>
              <Input type="date" value={form.opened_date} onChange={(e) => set("opened_date", e.target.value)} />
            </div>
            <div>
              <Label>Court Name</Label>
              <Input value={form.court_name ?? ""} onChange={(e) => set("court_name", e.target.value || null)} />
            </div>
            <div>
              <Label>Court Case No.</Label>
              <Input value={form.court_case_no ?? ""} onChange={(e) => set("court_case_no", e.target.value || null)} />
            </div>
            <div>
              <Label>Claim Amount</Label>
              <Input type="number" step="0.01" value={form.claim_amount ?? ""} onChange={(e) => set("claim_amount", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div>
              <Label>Outstanding Snapshot</Label>
              <Input type="number" step="0.01" value={form.outstanding_amount_snapshot ?? ""} onChange={(e) => set("outstanding_amount_snapshot", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div className="md:col-span-2">
              <Label>Summary</Label>
              <Textarea rows={3} value={form.summary ?? ""} onChange={(e) => set("summary", e.target.value)} />
            </div>

            {isLegacy && (
              <div className="md:col-span-2 border rounded-md p-3 bg-muted/30 space-y-3">
                <div className="text-sm font-medium">Legacy Case Information</div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div><Label>Legacy Case No.</Label><Input value={form.legacy_case_no ?? ""} onChange={(e) => set("legacy_case_no", e.target.value || null)} /></div>
                  <div><Label>Legacy Court Case No.</Label><Input value={form.legacy_court_case_no ?? ""} onChange={(e) => set("legacy_court_case_no", e.target.value || null)} /></div>
                  <div><Label>Legacy Employer Name</Label><Input value={form.legacy_employer_name ?? ""} onChange={(e) => set("legacy_employer_name", e.target.value || null)} /></div>
                  <div><Label>Legacy Person Name</Label><Input value={form.legacy_person_name ?? ""} onChange={(e) => set("legacy_person_name", e.target.value || null)} /></div>
                  <div><Label>Legacy Opened Date</Label><Input type="date" value={form.legacy_opened_date ?? ""} onChange={(e) => set("legacy_opened_date", e.target.value || null)} /></div>
                  <div className="md:col-span-2"><Label>Legacy Notes</Label><Textarea rows={2} value={form.legacy_notes ?? ""} onChange={(e) => set("legacy_notes", e.target.value || null)} /></div>
                </div>
              </div>
            )}
          </CardContent>
          <div className="flex justify-end gap-2 p-4 border-t">
            <Button variant="outline" onClick={() => navigate(`/legal/lg/cases/${id}`)}>Cancel</Button>
            <Button onClick={handleSave} disabled={update.isPending} className="gap-1">
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
