import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { listAllocationRules } from "@/services/ledger";
import type { PaymentAllocationRule } from "@/types/ledger";

const sb = supabase as any;

export default function PaymentAllocationRules() {
  const [rules, setRules] = useState<PaymentAllocationRule[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const { data } = await sb
      .from("core_payment_allocation_rule")
      .select("*")
      .order("country_code")
      .order("debtor_type")
      .order("allocation_order");
    setRules((data ?? []) as PaymentAllocationRule[]);
  }

  async function update(rule_code: string, patch: Partial<PaymentAllocationRule>) {
    setBusy(true);
    const { error } = await sb
      .from("core_payment_allocation_rule")
      .update(patch)
      .eq("rule_code", rule_code);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Updated");
      await load();
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Payment Allocation Rules</h1>
      <Card>
        <CardHeader>
          <CardTitle>Active Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Code</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Debtor</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Head</TableHead>
                <TableHead>Oldest First</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r) => (
                <TableRow key={r.rule_code}>
                  <TableCell className="font-mono text-xs">{r.rule_code}</TableCell>
                  <TableCell>{r.country_code}</TableCell>
                  <TableCell>{r.debtor_type}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-20"
                      defaultValue={r.allocation_order}
                      disabled={busy}
                      onBlur={(e) =>
                        update(r.rule_code, { allocation_order: Number(e.target.value) })
                      }
                    />
                  </TableCell>
                  <TableCell>{r.head_code}</TableCell>
                  <TableCell>
                    <Switch
                      checked={r.oldest_period_first}
                      disabled={busy}
                      onCheckedChange={(v) => update(r.rule_code, { oldest_period_first: v })}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={r.is_active}
                      disabled={busy}
                      onCheckedChange={(v) => update(r.rule_code, { is_active: v })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
