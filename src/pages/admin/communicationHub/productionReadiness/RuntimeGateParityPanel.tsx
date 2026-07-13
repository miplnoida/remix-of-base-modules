/**
 * EPIC PROD-2A — Read-only Runtime Gate Parity panel.
 *
 * Renders the structured result from `evaluate_comm_hub_runtime_gate_status`.
 * Never sends email, never enables live, never mutates any gate.
 */
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle, MinusCircle, RefreshCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  evaluateRuntimeGateStatus,
  type RuntimeGateStatusInput,
  type RuntimeGateStatusResult,
  type RuntimeGateStatus,
} from "./runtimeGateStatusService";

interface Props {
  input: RuntimeGateStatusInput | null;
  autoLoad?: boolean;
  /** frontend readiness verdict, if any, so we can flag mismatches */
  frontendVerdict?: "pass" | "warning" | "blocked" | "unknown" | null;
  title?: string;
}

function StatusIcon({ status }: { status: RuntimeGateStatus }) {
  if (status === "pass") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
  if (status === "blocked") return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  if (status === "warning") return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
  if (status === "skipped") return <MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />;
  return <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function RuntimeGateParityPanel({ input, autoLoad = true, frontendVerdict, title }: Props) {
  const [result, setResult] = useState<RuntimeGateStatusResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!input) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await evaluateRuntimeGateStatus(input));
    } catch (e: any) {
      setError(e?.message ?? "Failed to evaluate runtime gate status");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (autoLoad && input) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input?.moduleCode, input?.eventCode, input?.channel, input?.sendMode, input?.recipientEmail]);

  const mismatch = useMemo(() => {
    if (!result || !frontendVerdict) return false;
    if (frontendVerdict === "pass" && !result.allowed) return true;
    if (frontendVerdict === "blocked" && result.allowed) return true;
    return false;
  }, [result, frontendVerdict]);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{title ?? "Runtime Gate Parity"}</div>
          <div className="text-[11px] text-muted-foreground">
            Source RPC:{" "}
            <code className="font-mono">
              {result?.source ?? "evaluate_comm_hub_runtime_gate_status"}
            </code>
            {result?.evaluated_at && (
              <> · Evaluated {new Date(result.evaluated_at).toLocaleString()}</>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void run()} disabled={!input || loading}>
          <RefreshCcw className="h-3.5 w-3.5 mr-1" />
          {result ? "Re-evaluate" : "Evaluate"}
        </Button>
      </div>

      {!input && (
        <Alert>
          <AlertTitle>Pick a module / event first</AlertTitle>
          <AlertDescription className="text-xs">
            Runtime Gate Parity needs a module_code + event_code to call the server RPC.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Failed to evaluate runtime gate status</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {loading && !result && (
        <div className="grid gap-2 md:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      )}

      {result && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant={result.allowed ? "default" : "destructive"}>
              Server: {result.allowed ? "allowed" : "blocked"}
            </Badge>
            <Badge variant={result.legacy_authorization_allowed ? "default" : "secondary"}>
              Legacy auth: {result.legacy_authorization_allowed ? "allowed" : "blocked"}
            </Badge>
            <Badge variant="outline">send_mode: {result.send_mode}</Badge>
            <Badge variant="outline">recipients: {result.recipient_count}</Badge>
            {result.trace_context.blocked_stage && (
              <Badge variant="destructive">blocked at: {result.trace_context.blocked_stage}</Badge>
            )}
          </div>

          {mismatch && (
            <Alert variant="destructive">
              <AlertTitle>Frontend vs server mismatch</AlertTitle>
              <AlertDescription className="text-xs">
                Frontend readiness verdict is <strong>{frontendVerdict}</strong> but the server-side
                runtime gate says <strong>{result.allowed ? "allowed" : "blocked"}</strong>. Trust
                the server verdict.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium">Gate</th>
                  <th className="text-left px-2 py-1.5 font-medium">Status</th>
                  <th className="text-left px-2 py-1.5 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {result.gate_results.map((g) => (
                  <tr key={g.gate} className="border-t">
                    <td className="px-2 py-1.5 font-mono">{g.gate}</td>
                    <td className="px-2 py-1.5">
                      <span className="inline-flex items-center gap-1">
                        <StatusIcon status={g.status} /> {g.status}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">{g.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.blockers.length > 0 && (
            <div className="rounded-md border">
              <div className="px-2 py-1.5 text-xs font-medium bg-muted/40">
                Blockers ({result.blockers.length})
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left px-2 py-1 font-medium">Code</th>
                    <th className="text-left px-2 py-1 font-medium">Severity</th>
                    <th className="text-left px-2 py-1 font-medium">Stage</th>
                    <th className="text-left px-2 py-1 font-medium">Message</th>
                    <th className="text-left px-2 py-1 font-medium">Fix hint</th>
                  </tr>
                </thead>
                <tbody>
                  {result.blockers.map((b, i) => (
                    <tr key={`${b.code}-${i}`} className="border-t">
                      <td className="px-2 py-1 font-mono">{b.code}</td>
                      <td className="px-2 py-1">
                        <Badge variant={b.severity === "critical" ? "destructive" : "outline"}>
                          {b.severity}
                        </Badge>
                      </td>
                      <td className="px-2 py-1 text-muted-foreground">{b.stage}</td>
                      <td className="px-2 py-1">{b.message}</td>
                      <td className="px-2 py-1 text-muted-foreground">{b.fix_hint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <div className="font-medium mb-1">Warnings</div>
              <ul className="list-disc pl-5 space-y-0.5">
                {result.warnings.map((w, i) => (
                  <li key={i}>
                    <code className="font-mono">{w.code}</code> — {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.needs_review && result.needs_review.length > 0 && (
            <Alert>
              <AlertTitle>Needs review</AlertTitle>
              <AlertDescription className="text-xs">
                <ul className="list-disc pl-5 space-y-0.5">
                  {result.needs_review.map((n, i) => (
                    <li key={i}>
                      <code className="font-mono">{n.gate}</code>: {n.reason}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}

export default RuntimeGateParityPanel;
