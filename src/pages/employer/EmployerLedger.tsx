import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getBalances,
  listTransactions,
  postMonthlyForEmployer,
} from "@/services/ledger";
import { importBemaForEmployer } from "@/services/ledger/bemaImportService";

const sb = supabase as any;

interface Employer {
  id: string;
  regno: string;
  emp_name?: string | null;
}

export default function EmployerLedger() {
  const { employerId } = useParams<{ employerId: string }>();
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!employerId) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employerId]);

  async function load() {
    const { data: er } = await sb
      .from("er_master")
      .select("id, regno, emp_name")
      .eq("id", employerId)
      .maybeSingle();
    setEmployer(er ?? null);
    const [bal, txns] = await Promise.all([
      getBalances({ employer_id: employerId! }),
      listTransactions({ employer_id: employerId!, limit: 100 }),
    ]);
    setBalances(bal);
    setTransactions(txns);
  }

  async function runImport() {
    if (!employer?.regno) return;
    setBusy(true);
    try {
      const s = await importBemaForEmployer(employer.regno);
      toast.success(`Imported: ${s.payments_inserted} payments, ${s.liabilities_inserted} liabilities`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function postCurrentMonth() {
    if (!employer) return;
    const now = new Date();
    const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
    setBusy(true);
    try {
      const r = await postMonthlyForEmployer({
        employer_id: employer.id,
        employer_no: employer.regno,
        employer_name: employer.emp_name,
        period,
      });
      toast.success(
        `Posted ${period}: contrib ${r.posted_contribution}, pay ${r.posted_payment}, penalty ${r.posted_penalty}`,
      );
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Posting failed");
    } finally {
      setBusy(false);
    }
  }

  // Group balances: latest closing per head
  const headTotals = new Map<string, number>();
  for (const b of balances) {
    const prev = headTotals.get(b.head_code);
    if (prev === undefined || b.posting_period > (prev as any).period) {
      headTotals.set(b.head_code, Number(b.closing_balance));
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Employer Ledger</h1>
          <p className="text-sm text-muted-foreground">
            {employer?.emp_name ?? "—"} · {employer?.regno ?? "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy} onClick={runImport}>
            Import from BEMA / Payments
          </Button>
          <Button disabled={busy} onClick={postCurrentMonth}>
            Post Current Month
          </Button>
          <Button variant="secondary" asChild>
            <Link to={`/ledger/recalc?employerId=${employerId}`}>Recalculate</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Balances by Head</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Head</TableHead>
                <TableHead className="text-right">Closing Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(headTotals.entries()).map(([head, amt]) => (
                <TableRow key={head}>
                  <TableCell>{head}</TableCell>
                  <TableCell className="text-right">{Number(amt).toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {headTotals.size === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No ledger balances yet. Try importing then posting the month.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Head</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.transaction_no}</TableCell>
                  <TableCell>{t.transaction_date}</TableCell>
                  <TableCell>{t.posting_period}</TableCell>
                  <TableCell>{t.head_code}</TableCell>
                  <TableCell className="text-right">{Number(t.debit_amount).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(t.credit_amount).toFixed(2)}</TableCell>
                  <TableCell>{t.source_module}</TableCell>
                  <TableCell>
                    <Badge variant={t.posting_status === "POSTED" ? "default" : "secondary"}>
                      {t.posting_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
