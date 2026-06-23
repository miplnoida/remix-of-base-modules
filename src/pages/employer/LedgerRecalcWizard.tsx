import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { previewRecalculation } from "@/services/ledger";

const sb = supabase as any;

export default function LedgerRecalcWizard() {
  const [params] = useSearchParams();
  // Accept either ?regno=... or ?employerId=... (legacy)
  const initialRegno = params.get("regno") ?? params.get("employerId") ?? "";
  const [regno, setRegno] = useState(initialRegno);
  const [employerName, setEmployerName] = useState<string>("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [diff, setDiff] = useState<any>(null);

  async function lookupEmployer(value: string) {
    if (!value) {
      setEmployerName("");
      return;
    }
    setLookupBusy(true);
    try {
      const { data } = await sb
        .from("er_master")
        .select("regno, name, trade_name")
        .eq("regno", value.trim())
        .maybeSingle();
      if (!data) {
        setEmployerName("");
        toast.error(`No employer found for regno ${value}`);
      } else {
        setEmployerName(data.name ?? data.trade_name ?? "");
      }
    } finally {
      setLookupBusy(false);
    }
  }

  useEffect(() => {
    if (initialRegno) void lookupEmployer(initialRegno);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runPreview() {
    if (!regno) {
      toast.error("Employer registration number is required");
      return;
    }
    if (!employerName) {
      toast.error("Employer not found. Confirm the registration number.");
      return;
    }
    if (!from || !to) {
      toast.error("Period From and Period To are required");
      return;
    }
    setBusy(true);
    try {
      const { diff: d } = await previewRecalculation({
        employer_id: regno,
        employer_name: employerName,
        period_from: from,
        period_to: to,
      });
      setDiff(d);
      toast.success(`Recalc preview: ${d.change_count} changes`);
    } catch (e: any) {
      toast.error(e?.message ?? "Recalc failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Ledger Recalculation</h1>
      <Card>
        <CardHeader>
          <CardTitle>Run Preview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Employer Reg No</Label>
            <Input
              value={regno}
              onChange={(e) => setRegno(e.target.value)}
              onBlur={(e) => lookupEmployer(e.target.value)}
              placeholder="e.g. 663363"
            />
          </div>
          <div className="md:col-span-3">
            <Label>Employer</Label>
            <Input
              value={lookupBusy ? "Looking up…" : employerName || "—"}
              disabled
              className="bg-muted"
            />
          </div>
          <div>
            <Label>Period From</Label>
            <Input
              type="month"
              value={from.slice(0, 7)}
              onChange={(e) => setFrom(e.target.value ? `${e.target.value}-01` : "")}
            />
          </div>
          <div>
            <Label>Period To</Label>
            <Input
              type="month"
              value={to.slice(0, 7)}
              onChange={(e) => setTo(e.target.value ? `${e.target.value}-01` : "")}
            />
          </div>
          <div className="md:col-span-4">
            <Button onClick={runPreview} disabled={busy || lookupBusy}>
              {busy ? "Running…" : "Preview Recalculation"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {diff && (
        <Card>
          <CardHeader>
            <CardTitle>Differences ({diff.change_count})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Head</TableHead>
                  <TableHead className="text-right">Before</TableHead>
                  <TableHead className="text-right">After</TableHead>
                  <TableHead className="text-right">Delta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diff.changes.map((c: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{c.posting_period}</TableCell>
                    <TableCell>{c.head_code}</TableCell>
                    <TableCell className="text-right">{Number(c.before).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(c.after).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(c.delta).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {diff.changes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No differences detected.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
