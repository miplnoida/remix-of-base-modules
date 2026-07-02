/**
 * EPIC-06A.2 — Proposed Recoverable Liabilities panel for Intake.
 * Stores proposals in `lg_case_intake.payload.proposed_liabilities` (no new table).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  addProposedLiability,
  listProposedLiabilities,
  removeProposedLiability,
  summarize,
  updateProposedLiability,
  type ProposedLiability,
} from "@/services/legal/lgIntakeLiabilityService";

interface Props {
  intakeId: string;
  disabled?: boolean;
  onChange?: (items: ProposedLiability[]) => void;
}

const LIABILITY_TYPES = ["ARREARS", "OVERPAYMENT", "PENALTY", "INTEREST", "COURT_ORDER", "FEE", "OTHER"] as const;

const num = (n?: number | null) =>
  n == null ? "—" : new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export function IntakeProposedLiabilitiesCard({ intakeId, disabled, onChange }: Props) {
  const [items, setItems] = useState<ProposedLiability[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Partial<ProposedLiability>>({
    liability_type: "ARREARS",
    currency: "XCD",
    principal: 0,
    interest: 0,
    penalty: 0,
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await listProposedLiabilities(intakeId);
      setItems(next);
      onChange?.(next);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load proposals");
    } finally {
      setLoading(false);
    }
  }, [intakeId, onChange]);

  useEffect(() => { void refresh(); }, [refresh]);

  const summary = useMemo(() => summarize(items), [items]);

  const handleAdd = async () => {
    if (!draft.liability_type) return;
    setBusy(true);
    try {
      await addProposedLiability(intakeId, {
        liability_type: draft.liability_type!,
        fund_type: draft.fund_type ?? null,
        assessment_number: draft.assessment_number ?? null,
        assessment_date: draft.assessment_date ?? null,
        principal: Number(draft.principal ?? 0),
        interest: Number(draft.interest ?? 0),
        penalty: Number(draft.penalty ?? 0),
        court_cost: Number(draft.court_cost ?? 0),
        legal_cost: Number(draft.legal_cost ?? 0),
        currency: draft.currency ?? "XCD",
        limitation_date: draft.limitation_date ?? null,
        remarks: draft.remarks ?? null,
        verified: false,
      });
      setDraft({ liability_type: "ARREARS", currency: "XCD", principal: 0, interest: 0, penalty: 0 });
      await refresh();
      toast.success("Proposed liability added");
    } catch (e: any) {
      toast.error(e?.message ?? "Add failed");
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (id: string, verified: boolean) => {
    setBusy(true);
    try { await updateProposedLiability(intakeId, id, { verified }); await refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Update failed"); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    try { await removeProposedLiability(intakeId, id); await refresh(); toast.success("Removed"); }
    catch (e: any) { toast.error(e?.message ?? "Remove failed"); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Proposed Recoverable Liabilities
        </CardTitle>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline">{summary.count} proposed</Badge>
          <Badge variant={summary.verified === summary.count && summary.count > 0 ? "default" : "secondary"}>
            {summary.verified}/{summary.count} verified
          </Badge>
          <span className="text-muted-foreground">Total: {num(summary.total)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-xs text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-muted-foreground border rounded p-3">
            No proposed liabilities yet. Capture arrears, overpayments, or penalty exposure before case creation.
            They will be materialized into <code>lg_recoverable_liability</code> once the case is created.
          </div>
        ) : (
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-2">Type</th>
                  <th className="p-2">Fund</th>
                  <th className="p-2">Assessment</th>
                  <th className="p-2 text-right">Principal</th>
                  <th className="p-2 text-right">Interest</th>
                  <th className="p-2 text-right">Penalty</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2">Limitation</th>
                  <th className="p-2">Verified</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const total = Number(it.principal ?? 0) + Number(it.interest ?? 0) + Number(it.penalty ?? 0) + Number(it.court_cost ?? 0) + Number(it.legal_cost ?? 0);
                  return (
                    <tr key={it.id} className="border-t">
                      <td className="p-2">{it.liability_type}</td>
                      <td className="p-2">{it.fund_type ?? "—"}</td>
                      <td className="p-2">{it.assessment_number ?? "—"}</td>
                      <td className="p-2 text-right tabular-nums">{num(it.principal)}</td>
                      <td className="p-2 text-right tabular-nums">{num(it.interest)}</td>
                      <td className="p-2 text-right tabular-nums">{num(it.penalty)}</td>
                      <td className="p-2 text-right tabular-nums font-medium">{num(total)}</td>
                      <td className="p-2">{it.limitation_date ?? "—"}</td>
                      <td className="p-2">
                        <Checkbox
                          checked={!!it.verified}
                          disabled={disabled || busy}
                          onCheckedChange={(v) => handleVerify(it.id, !!v)}
                        />
                      </td>
                      <td className="p-2">
                        <Button size="icon" variant="ghost" disabled={disabled || busy} onClick={() => handleDelete(it.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!disabled && (
          <div className="border rounded p-3 space-y-2 bg-muted/20">
            <div className="text-xs font-medium">Add proposed liability</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <Label className="text-[10px]">Type</Label>
                <Select value={draft.liability_type} onValueChange={(v) => setDraft((d) => ({ ...d, liability_type: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LIABILITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">Fund</Label>
                <Input className="h-8 text-xs" value={draft.fund_type ?? ""} onChange={(e) => setDraft((d) => ({ ...d, fund_type: e.target.value }))} placeholder="SSF / EIF" />
              </div>
              <div>
                <Label className="text-[10px]">Assessment #</Label>
                <Input className="h-8 text-xs" value={draft.assessment_number ?? ""} onChange={(e) => setDraft((d) => ({ ...d, assessment_number: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px]">Currency</Label>
                <Input className="h-8 text-xs" value={draft.currency ?? "XCD"} onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px]">Principal</Label>
                <Input type="number" className="h-8 text-xs" value={draft.principal ?? 0} onChange={(e) => setDraft((d) => ({ ...d, principal: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-[10px]">Interest</Label>
                <Input type="number" className="h-8 text-xs" value={draft.interest ?? 0} onChange={(e) => setDraft((d) => ({ ...d, interest: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-[10px]">Penalty</Label>
                <Input type="number" className="h-8 text-xs" value={draft.penalty ?? 0} onChange={(e) => setDraft((d) => ({ ...d, penalty: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-[10px]">Limitation Date</Label>
                <Input type="date" className="h-8 text-xs" value={draft.limitation_date ?? ""} onChange={(e) => setDraft((d) => ({ ...d, limitation_date: e.target.value || null }))} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleAdd} disabled={busy}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default IntakeProposedLiabilitiesCard;
