import { useState } from "react";
import { dmsApiTestService, type DmsTestResult } from "@/services/core/dmsApiTestService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, MinusCircle, PlayCircle } from "lucide-react";

const STATUS_BADGE: Record<string, { label: string; cls: string; Icon: any }> = {
  pending: { label: "PENDING", cls: "bg-muted text-muted-foreground", Icon: MinusCircle },
  running: { label: "RUNNING", cls: "bg-blue-500/15 text-blue-600", Icon: Loader2 },
  pass:    { label: "PASS",    cls: "bg-emerald-500/15 text-emerald-600", Icon: CheckCircle2 },
  fail:    { label: "FAIL",    cls: "bg-destructive/15 text-destructive", Icon: XCircle },
  skip:    { label: "SKIP",    cls: "bg-muted text-muted-foreground", Icon: MinusCircle },
};

export default function DmsApiTest() {
  const [results, setResults] = useState<DmsTestResult[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setResults([]);
    setRunning(true);
    try {
      await dmsApiTestService.runAll((r) => {
        setResults((prev) => {
          const idx = prev.findIndex((p) => p.id === r.id);
          if (idx >= 0) {
            const copy = prev.slice(); copy[idx] = r; return copy;
          }
          return [...prev, r];
        });
      });
    } finally {
      setRunning(false);
    }
  };

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skip").length;
  const allPass = results.length > 0 && failed === 0 && !running;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">DMS API Test Harness</h1>
          <p className="text-sm text-muted-foreground">
            Runs 15 end-to-end probes against the central DMS service. A temporary test case is created and cleaned up.
          </p>
        </div>
        <Button onClick={run} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
          {running ? "Running…" : "Run all tests"}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Passed: {passed}</Badge>
          <Badge variant="destructive" className={failed ? "" : "opacity-40"}>Failed: {failed}</Badge>
          <Badge variant="outline">Skipped: {skipped}</Badge>
          {allPass && <Badge className="bg-emerald-600 text-white">All DMS APIs healthy ✓</Badge>}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Probes</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Probe</th>
                <th className="py-2 pr-3">API / Method</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3 text-right">ms</th>
                <th className="py-2 pr-3">Error / Fix</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => {
                const meta = STATUS_BADGE[r.status];
                const Icon = meta.Icon;
                return (
                  <tr key={r.id} className="border-t align-top">
                    <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 pr-3 font-medium">{r.name}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{r.api}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${meta.cls}`}>
                        <Icon className={`h-3 w-3 ${r.status === "running" ? "animate-spin" : ""}`} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{r.ms ?? ""}</td>
                    <td className="py-2 pr-3 text-xs">
                      {r.error && <div className="text-destructive">{r.error}</div>}
                      {r.fix && <div className="text-muted-foreground mt-1">Fix: {r.fix}</div>}
                    </td>
                  </tr>
                );
              })}
              {results.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No results yet — click <b>Run all tests</b>.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
