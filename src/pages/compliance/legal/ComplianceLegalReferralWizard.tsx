import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Scale, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listComplianceCandidateItems,
  type ComplianceCandidateItem,
} from "@/services/legal/coreLegalReferralItemService";
import { forwardComplianceCaseToLegal } from "@/services/legal/complianceForwardingService";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

const sb = supabase as any;

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "XCD" }).format(n);

export default function ComplianceLegalReferralWizard() {
  const { ceCaseId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useSupabaseAuth();
  const userCode = profile?.user_code ?? null;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ceCase, setCeCase] = useState<any>(null);
  const [candidates, setCandidates] = useState<ComplianceCandidateItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [minAge, setMinAge] = useState<number>(150);
  const [includeCurrent, setIncludeCurrent] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonCode, setReasonCode] = useState("ARREARS_OVERDUE");
  const [priority, setPriority] = useState("MEDIUM");

  async function loadCandidates(employerId: string) {
    const items = await listComplianceCandidateItems({
      employerId,
      minAgeDays: minAge,
      includeCurrent,
    });
    setCandidates(items);
  }

  useEffect(() => {
    (async () => {
      if (!ceCaseId) return;
      setLoading(true);
      try {
        const { data: cc } = await sb.from("ce_cases").select("*").eq("id", ceCaseId).maybeSingle();
        setCeCase(cc);
        if (cc?.employer_id) await loadCandidates(cc.employer_id);
      } catch (e: any) {
        toast.error("Failed to load case", { description: e.message });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ceCaseId]);

  useEffect(() => {
    if (ceCase?.employer_id) loadCandidates(ceCase.employer_id).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minAge, includeCurrent]);

  const totals = useMemo(() => {
    let referred = 0;
    let retained = 0;
    let count = 0;
    for (const c of candidates) {
      if (selected[c.key]) {
        referred += c.outstanding;
        count++;
      } else {
        retained += c.outstanding;
      }
    }
    return { referred, retained, count, totalOutstanding: referred + retained };
  }, [candidates, selected]);

  function toggle(k: string) {
    setSelected((s) => ({ ...s, [k]: !s[k] }));
  }

  function selectAll(v: boolean) {
    const next: Record<string, boolean> = {};
    candidates.forEach((c) => (next[c.key] = v));
    setSelected(next);
  }

  async function submit() {
    if (!ceCaseId) return;
    if (totals.count === 0) {
      toast.error("Select at least one item to refer to Legal");
      return;
    }
    if (!reason.trim()) {
      toast.error("Provide a referral reason");
      return;
    }
    setSubmitting(true);
    try {
      const items = candidates
        .filter((c) => selected[c.key])
        .map((c) => ({
          source_record_type: c.source_record_type,
          source_record_id: c.source_record_id,
          source_reference_no: c.source_reference_no,
          debtor_type: "EMPLOYER" as const,
          debtor_id: c.debtor_id,
          debtor_name: c.debtor_name,
          item_type: "LIABILITY" as const,
          liability_head_code: c.liability_head_code,
          fund_code: c.fund_code,
          period_from: c.period_from,
          period_to: c.period_to,
          principal_amount: c.principal,
          penalty_amount: c.penalty,
          interest_amount: c.interest,
          cost_amount: 0,
          total_amount: c.outstanding,
          amount_referred: c.outstanding,
          amount_retained_by_source: 0,
          referral_reason_code: reasonCode,
          source_payload: { raw: c.raw, age_days: c.age_days },
        }));

      const r = await forwardComplianceCaseToLegal({
        ce_case_id: ceCaseId,
        referral_reason: reason.trim(),
        referral_reason_code: reasonCode,
        priority_code: priority,
        user_code: userCode,
        items,
      });
      toast.success(`Forwarded ${r.items_count} item(s) — ${fmtMoney(r.total_referred_amount)}`, {
        description: `${r.referral_no} → Legal Intake ${r.lg_intake_no}`,
        action: { label: "Open Intake", onClick: () => navigate(`/legal/cases/intake/${r.lg_intake_id}`) },
      });
      navigate(`/legal/cases/intake/${r.lg_intake_id}`);
    } catch (e: any) {
      toast.error("Referral failed", { description: e.message });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Loading case…</div>;
  if (!ceCase) return <div className="p-8">Case not found.</div>;

  return (
    <div className="flex-1 p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Forward to Legal — Select Items</h1>
          <p className="text-sm text-muted-foreground">
            Case <strong>{ceCase.case_number}</strong> · Employer{" "}
            <strong>{ceCase.employer_name ?? ceCase.employer_id}</strong>
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Minimum age (days)</Label>
            <Input
              type="number"
              value={minAge}
              onChange={(e) => setMinAge(Number(e.target.value) || 0)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Checkbox
              id="include-current"
              checked={includeCurrent}
              onCheckedChange={(v) => setIncludeCurrent(Boolean(v))}
            />
            <Label htmlFor="include-current">Include current/newer items</Label>
          </div>
          <div className="md:col-span-2 flex items-end justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => selectAll(true)}>
              Select all
            </Button>
            <Button variant="outline" size="sm" onClick={() => selectAll(false)}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Candidate Items ({candidates.length})</span>
            <div className="flex gap-4 text-sm font-normal">
              <span>
                Selected: <strong>{totals.count}</strong>
              </span>
              <span className="text-destructive">
                Refer: <strong>{fmtMoney(totals.referred)}</strong>
              </span>
              <span className="text-muted-foreground">
                Retain in Compliance: <strong>{fmtMoney(totals.retained)}</strong>
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No matching arrears found. Lower the minimum age or include current items.
            </p>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr>
                    <th className="p-2 w-10"></th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Reference</th>
                    <th className="p-2 text-left">Head</th>
                    <th className="p-2 text-left">Fund</th>
                    <th className="p-2 text-left">Period</th>
                    <th className="p-2 text-right">Age</th>
                    <th className="p-2 text-right">Principal</th>
                    <th className="p-2 text-right">Penalty</th>
                    <th className="p-2 text-right">Interest</th>
                    <th className="p-2 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr
                      key={c.key}
                      className={`border-t hover:bg-muted/30 ${selected[c.key] ? "bg-primary/5" : ""}`}
                    >
                      <td className="p-2">
                        <Checkbox
                          checked={!!selected[c.key]}
                          onCheckedChange={() => toggle(c.key)}
                        />
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">
                          {c.source_record_type}
                        </Badge>
                      </td>
                      <td className="p-2 font-mono text-xs">{c.source_reference_no ?? "—"}</td>
                      <td className="p-2 text-xs">{c.liability_head_code ?? "—"}</td>
                      <td className="p-2">{c.fund_code ?? "—"}</td>
                      <td className="p-2 text-xs">
                        {c.period_from
                          ? new Date(c.period_from).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="p-2 text-right">{c.age_days ?? "—"}</td>
                      <td className="p-2 text-right">{fmtMoney(c.principal)}</td>
                      <td className="p-2 text-right">{fmtMoney(c.penalty)}</td>
                      <td className="p-2 text-right">{fmtMoney(c.interest)}</td>
                      <td className="p-2 text-right font-semibold">
                        {fmtMoney(c.outstanding)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referral Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Reason Code</Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ARREARS_OVERDUE">Arrears Overdue</SelectItem>
                <SelectItem value="REPEATED_DEFAULT">Repeated Default</SelectItem>
                <SelectItem value="ARRANGEMENT_BREACH">Arrangement Breach</SelectItem>
                <SelectItem value="NON_COOPERATION">Non-Cooperation</SelectItem>
                <SelectItem value="FRAUD_SUSPECTED">Fraud Suspected</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Label>Referral Reason (free text) *</Label>
            <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Explain the legal recovery scope for the selected items only" />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center justify-between">
        <div className="text-sm">
          {totals.count} item(s) selected · Refer{" "}
          <strong className="text-destructive">{fmtMoney(totals.referred)}</strong> · Retain{" "}
          <strong>{fmtMoney(totals.retained)}</strong>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || totals.count === 0}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Scale className="h-4 w-4 mr-2" />}
            Forward selected items to Legal
          </Button>
        </div>
      </div>
    </div>
  );
}
