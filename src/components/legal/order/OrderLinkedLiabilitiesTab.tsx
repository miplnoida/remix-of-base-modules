import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateForDisplay } from "@/lib/format-config";
import { LiabilityLinkDialog } from "@/components/legal/liability/LiabilityLinkDialog";
import { LG_ORDER_COMPLIANCE_LABEL } from "@/services/legal/lgOrderStateMachine";
import { useLgAccess } from "@/hooks/legal/useLgAccess";

const sb = supabase as any;

export function OrderLinkedLiabilitiesTab({ orderId, caseId }: { orderId: string; caseId: string }) {
  const qc = useQueryClient();
  const access = useLgAccess();
  const [linkOpen, setLinkOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["lg_order_liabilities", orderId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("lg_order_liability")
        .select("*, lg_recoverable_liability:liability_id(id, liability_no, liability_type, fund_type, principal_amount, outstanding_amount, paid_amount, recovery_status)")
        .eq("order_id", orderId);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Linked Liabilities</CardTitle>
        {access.can("linkOrderLiability") && (
          <Button size="sm" onClick={() => setLinkOpen(true)}>Link Liabilities</Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && data.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No liabilities linked. Use “Link Liabilities” to attach recoverable liabilities from this matter.
          </div>
        )}
        {data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Liability</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Fund</th>
                  <th className="py-2 pr-3 text-right">Principal</th>
                  <th className="py-2 pr-3 text-right">Ordered</th>
                  <th className="py-2 pr-3 text-right">Paid</th>
                  <th className="py-2 pr-3 text-right">Outstanding</th>
                  <th className="py-2 pr-3">Compliance</th>
                  <th className="py-2 pr-3">Recovery</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r: any) => {
                  const l = r.lg_recoverable_liability;
                  return (
                    <tr key={r.id ?? `${r.order_id}-${r.liability_id}`} className="border-b">
                      <td className="py-2 pr-3 font-mono text-xs">{l?.liability_no ?? "—"}</td>
                      <td className="py-2 pr-3">{l?.liability_type ?? "—"}</td>
                      <td className="py-2 pr-3">{l?.fund_type ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">{l?.principal_amount != null ? `EC$${Number(l.principal_amount).toLocaleString()}` : "—"}</td>
                      <td className="py-2 pr-3 text-right">{r.amount_ordered != null ? `EC$${Number(r.amount_ordered).toLocaleString()}` : "—"}</td>
                      <td className="py-2 pr-3 text-right">{l?.paid_amount != null ? `EC$${Number(l.paid_amount).toLocaleString()}` : "—"}</td>
                      <td className="py-2 pr-3 text-right">{l?.outstanding_amount != null ? `EC$${Number(l.outstanding_amount).toLocaleString()}` : "—"}</td>
                      <td className="py-2 pr-3"><Badge variant="outline">{LG_ORDER_COMPLIANCE_LABEL[(r.compliance_status ?? "NOT_STARTED") as keyof typeof LG_ORDER_COMPLIANCE_LABEL] ?? r.compliance_status ?? "—"}</Badge></td>
                      <td className="py-2 pr-3"><Badge variant="secondary">{l?.recovery_status ?? "—"}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <LiabilityLinkDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        caseId={caseId}
        entityType="ORDER"
        entityId={orderId}
        onLinked={() => qc.invalidateQueries({ queryKey: ["lg_order_liabilities", orderId] })}
      />
    </Card>
  );
}
