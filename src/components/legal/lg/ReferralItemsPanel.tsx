import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, XCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listReferralItems,
  rejectReferralItem,
  returnReferralItem,
  type CoreLegalReferralItem,
} from "@/services/legal/coreLegalReferralItemService";
import type { LgCaseIntake } from "@/services/legal/lgIntakeService";

const sb = supabase as any;

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "XCD" }).format(n);

interface Props {
  intake: LgCaseIntake;
  actor: string;
  readonly?: boolean;
}

export default function ReferralItemsPanel({ intake, actor, readonly }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CoreLegalReferralItem[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [reasonMap, setReasonMap] = useState<Record<string, string>>({});

  async function load() {
    if (!intake.source_reference_no) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const refTable = intake.source_module === "BENEFITS" ? "bn_legal_referral" : "ce_legal_referrals";
      const { data: ref } = await sb
        .from(refTable)
        .select("id")
        .eq("referral_number", intake.source_reference_no)
        .maybeSingle();
      if (!ref?.id) {
        setItems([]);
        return;
      }
      const rows = await listReferralItems(ref.id);
      setItems(rows);
    } catch (e: any) {
      toast.error("Failed to load referral items", { description: e.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intake.id]);

  const totals = items.reduce(
    (acc, i) => {
      acc.referred += Number(i.amount_referred ?? 0);
      acc.retained += Number(i.amount_retained_by_source ?? 0);
      if (i.status === "ACCEPTED") acc.accepted++;
      if (i.status === "REJECTED" || i.status === "RETURNED") acc.declined++;
      return acc;
    },
    { referred: 0, retained: 0, accepted: 0, declined: 0 },
  );

  async function doReject(id: string) {
    const reason = reasonMap[id] ?? "";
    if (!reason.trim()) {
      toast.error("Provide a rejection reason");
      return;
    }
    setPendingId(id);
    try {
      await rejectReferralItem(id, reason.trim(), actor);
      toast.success("Item rejected");
      load();
    } catch (e: any) {
      toast.error("Reject failed", { description: e.message });
    } finally {
      setPendingId(null);
    }
  }

  async function doReturn(id: string) {
    const reason = reasonMap[id] ?? "";
    if (!reason.trim()) {
      toast.error("Provide return reason");
      return;
    }
    setPendingId(id);
    try {
      await returnReferralItem(id, reason.trim(), actor);
      toast.success("Item returned to source");
      load();
    } catch (e: any) {
      toast.error("Return failed", { description: e.message });
    } finally {
      setPendingId(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading referral items…</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Referral Items ({items.length})</span>
          <span className="text-sm font-normal flex gap-4">
            <span>Refer: <strong className="text-destructive">{fmtMoney(totals.referred)}</strong></span>
            <span className="text-muted-foreground">Retained by source: <strong>{fmtMoney(totals.retained)}</strong></span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No selected items — this referral covers the entire source record's balance.
          </p>
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Source Ref</th>
                  <th className="p-2 text-left">Head / Fund</th>
                  <th className="p-2 text-left">Period</th>
                  <th className="p-2 text-right">Principal</th>
                  <th className="p-2 text-right">Penalty</th>
                  <th className="p-2 text-right">Interest</th>
                  <th className="p-2 text-right">Referred</th>
                  <th className="p-2 text-left">Status</th>
                  {!readonly && <th className="p-2 text-left w-72">Decision</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const decisionDisabled = it.status !== "REFERRED" && it.status !== "PROPOSED" && it.status !== "SELECTED";
                  return (
                    <tr key={it.id} className="border-t">
                      <td className="p-2"><Badge variant="outline">{it.item_type}</Badge></td>
                      <td className="p-2 font-mono text-xs">{it.source_reference_no ?? it.source_record_id?.slice(0, 8) ?? "—"}</td>
                      <td className="p-2 text-xs">{[it.liability_head_code, it.fund_code].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="p-2 text-xs">
                        {it.period_from ? new Date(it.period_from).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-2 text-right">{fmtMoney(Number(it.principal_amount))}</td>
                      <td className="p-2 text-right">{fmtMoney(Number(it.penalty_amount))}</td>
                      <td className="p-2 text-right">{fmtMoney(Number(it.interest_amount))}</td>
                      <td className="p-2 text-right font-semibold">{fmtMoney(Number(it.amount_referred))}</td>
                      <td className="p-2">
                        <Badge
                          variant={
                            it.status === "ACCEPTED" ? "default"
                              : it.status === "REJECTED" || it.status === "RETURNED" ? "destructive"
                              : "secondary"
                          }
                        >
                          {it.status}
                        </Badge>
                      </td>
                      {!readonly && (
                        <td className="p-2">
                          {decisionDisabled ? (
                            <span className="text-xs text-muted-foreground">
                              {it.decision_reason ?? "—"}
                            </span>
                          ) : (
                            <div className="flex gap-1">
                              <Input
                                className="h-8 text-xs"
                                placeholder="Reason"
                                value={reasonMap[it.id] ?? ""}
                                onChange={(e) =>
                                  setReasonMap((m) => ({ ...m, [it.id]: e.target.value }))
                                }
                              />
                              <Button size="sm" variant="outline" disabled={pendingId === it.id}
                                onClick={() => doReturn(it.id)} title="Return to source">
                                {pendingId === it.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                              </Button>
                              <Button size="sm" variant="destructive" disabled={pendingId === it.id}
                                onClick={() => doReject(it.id)} title="Reject item">
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          On <strong>Accept &amp; Create Case</strong>, all items still in REFERRED status become Legal
          Case Actions (one action per item, linked back via <code>referral_item_id</code>). Items you
          reject or return here are excluded from the resulting Legal case and the source department
          retains them.
        </p>
      </CardContent>
    </Card>
  );
}
