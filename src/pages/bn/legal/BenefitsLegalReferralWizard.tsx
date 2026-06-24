import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Scale, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listBenefitsCandidatesByClaim,
  type BenefitsCandidateItem,
  type ReferralItemType,
} from "@/services/legal/coreLegalReferralItemService";
import { forwardBenefitsClaimToLegal } from "@/services/legal/benefitsForwardingService";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

const sb = supabase as any;

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "XCD" }).format(n);

const MATTER_TYPES = [
  { code: "BENEFIT_OVERPAYMENT", label: "Benefit Overpayment" },
  { code: "PAYMENT_AFTER_DEATH", label: "Payment After Death" },
  { code: "BENEFIT_APPEAL", label: "Appeal / Review Dispute" },
  { code: "FRAUD_REVIEW", label: "Fraud / Misrepresentation" },
  { code: "ESTATE_RECOVERY", label: "Estate Recovery" },
  { code: "BENEFIT_DISPUTE", label: "Benefit Dispute (Generic)" },
];

export default function BenefitsLegalReferralWizard() {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const { profile } = useSupabaseAuth();
  const userCode = profile?.user_code ?? null;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [claim, setClaim] = useState<any>(null);
  const [candidates, setCandidates] = useState<BenefitsCandidateItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [matterType, setMatterType] = useState("BENEFIT_OVERPAYMENT");
  const [reasonCode, setReasonCode] = useState("OVERPAYMENT");
  const [priority, setPriority] = useState("MEDIUM");
  const [reason, setReason] = useState("");

  useEffect(() => {
    (async () => {
      if (!claimId) return;
      setLoading(true);
      try {
        const { data: c } = await sb.from("bn_claim").select("*").eq("id", claimId).maybeSingle();
        setClaim(c);
        const items = await listBenefitsCandidatesByClaim(claimId);
        setCandidates(items);
        // Default selection: overpayments
        const init: Record<string, boolean> = {};
        items.forEach((it) => {
          if (it.source_record_type === "OVERPAYMENT") init[it.key] = true;
        });
        setSelected(init);
      } catch (e: any) {
        toast.error("Failed to load claim", { description: e.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [claimId]);

  const totals = useMemo(() => {
    let referred = 0;
    let count = 0;
    for (const c of candidates) {
      if (selected[c.key]) {
        referred += overrides[c.key] ?? c.outstanding;
        count++;
      }
    }
    return { referred, count };
  }, [candidates, selected, overrides]);

  function itemTypeFor(rt: BenefitsCandidateItem["source_record_type"]): ReferralItemType {
    if (rt === "OVERPAYMENT") return "OVERPAYMENT";
    if (rt === "APPEAL") return "APPEAL";
    if (rt === "FRAUD") return "FRAUD";
    return "CLAIM";
  }

  async function submit() {
    if (!claimId) return;
    if (totals.count === 0) {
      toast.error("Select at least one item");
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
        .map((c) => {
          const amount = overrides[c.key] ?? c.outstanding;
          return {
            source_record_type: c.source_record_type,
            source_record_id: c.source_record_id,
            source_reference_no: c.source_reference_no,
            debtor_type: c.debtor_type,
            debtor_id: c.debtor_id,
            debtor_name: c.debtor_name,
            item_type: itemTypeFor(c.source_record_type),
            principal_amount: amount,
            penalty_amount: 0,
            interest_amount: 0,
            cost_amount: 0,
            total_amount: amount,
            amount_referred: amount,
            amount_retained_by_source: Math.max(0, c.outstanding - amount),
            period_from: c.period_from,
            period_to: c.period_to,
            referral_reason_code: reasonCode,
            source_payload: { raw: c.raw },
          };
        });

      const r = await forwardBenefitsClaimToLegal({
        bn_claim_id: claimId,
        matter_type_code: matterType,
        referral_reason: reason.trim(),
        referral_reason_code: reasonCode,
        priority_code: priority,
        exposure_amount: totals.referred,
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

  if (loading) return <div className="p-8 text-muted-foreground">Loading claim…</div>;
  if (!claim) return <div className="p-8">Claim not found.</div>;

  return (
    <div className="flex-1 p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Forward Benefit Matter to Legal</h1>
          <p className="text-sm text-muted-foreground">
            Claim <strong>{claim.claim_number ?? claim.id}</strong> · SSN{" "}
            <strong>{claim.ssn ?? "—"}</strong>
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referral Type</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Matter Type</Label>
            <Select value={matterType} onValueChange={setMatterType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MATTER_TYPES.map((m) => (
                  <SelectItem key={m.code} value={m.code}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reason Code</Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OVERPAYMENT">Overpayment</SelectItem>
                <SelectItem value="PAYMENT_AFTER_DEATH">Payment After Death</SelectItem>
                <SelectItem value="FRAUD">Fraud / Misrepresentation</SelectItem>
                <SelectItem value="APPEAL">Appeal</SelectItem>
                <SelectItem value="ESTATE_RECOVERY">Estate Recovery</SelectItem>
                <SelectItem value="RECOVERY_FAILURE">Recovery Failure</SelectItem>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Candidate Items ({candidates.length})</span>
            <span className="text-sm font-normal">
              Selected: <strong>{totals.count}</strong> · Refer{" "}
              <strong className="text-destructive">{fmtMoney(totals.referred)}</strong>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No referable items.</p>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr>
                    <th className="p-2 w-10"></th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Reference</th>
                    <th className="p-2 text-left">Debtor</th>
                    <th className="p-2 text-left">Period</th>
                    <th className="p-2 text-right">Outstanding</th>
                    <th className="p-2 text-right w-40">Refer Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.key} className={`border-t ${selected[c.key] ? "bg-primary/5" : ""}`}>
                      <td className="p-2">
                        <Checkbox
                          checked={!!selected[c.key]}
                          onCheckedChange={() =>
                            setSelected((s) => ({ ...s, [c.key]: !s[c.key] }))
                          }
                        />
                      </td>
                      <td className="p-2"><Badge variant="outline">{c.source_record_type}</Badge></td>
                      <td className="p-2 font-mono text-xs">{c.source_reference_no ?? c.source_record_id.slice(0, 8)}</td>
                      <td className="p-2">{c.debtor_name ?? c.debtor_id ?? "—"}</td>
                      <td className="p-2 text-xs">
                        {c.period_from ? new Date(c.period_from).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-2 text-right">{fmtMoney(c.outstanding)}</td>
                      <td className="p-2 text-right">
                        <Input
                          type="number"
                          className="text-right h-8"
                          value={overrides[c.key] ?? c.outstanding}
                          onChange={(e) =>
                            setOverrides((o) => ({ ...o, [c.key]: Number(e.target.value) || 0 }))
                          }
                          disabled={!selected[c.key]}
                        />
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
          <CardTitle className="text-base">Referral Reason</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain the legal action sought for the selected items"
          />
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(-1)} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={submitting || totals.count === 0}>
          {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Scale className="h-4 w-4 mr-2" />}
          Forward selected items to Legal
        </Button>
      </div>
    </div>
  );
}
