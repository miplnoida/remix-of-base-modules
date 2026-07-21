/**
 * CH-SIMPLE-P3F-UX.2 — Operator readiness summary.
 *
 * Presents send-decision readiness as an operator would consume it:
 *   - a single Ready / Needs attention / Blocked headline;
 *   - one recommended next action;
 *   - grouped Platform / Event / Current-Test blockers;
 *   - one Fix now + Re-check button per blocker;
 *   - passed checks collapsed under "View completed checks";
 *   - raw codes and gate JSON hidden in Technical Details.
 *
 * This component is presentation-only — it does not evaluate rules.
 * Every rule remains on the server (evaluate_comm_hub_send_decision).
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SendDecisionEnvelope } from "@/platform/communication-hub/sendDecisionService";
import {
  GROUP_LABEL,
  pickNextAction,
  resolveBlockers,
  type BlockerGroup,
  type ResolvedBlocker,
} from "./canonicalBlockerCatalog";
import type { RecipientMatchContext } from "./resolveTestRecipient";

interface Props {
  decision: SendDecisionEnvelope | null;
  loading: boolean;
  onRecheck: () => void;
  recipientContext?: RecipientMatchContext | null;
}

function statusHeadline(
  loading: boolean,
  decision: SendDecisionEnvelope | null,
  resolved: ResolvedBlocker[],
): { label: string; tone: "ready" | "attention" | "blocked" | "idle"; icon: JSX.Element } {
  if (loading) {
    return {
      label: "Checking readiness…",
      tone: "idle",
      icon: <RefreshCw className="h-4 w-4 animate-spin" />,
    };
  }
  if (!decision) {
    return {
      label: "Readiness not checked yet",
      tone: "idle",
      icon: <ChevronRight className="h-4 w-4" />,
    };
  }
  if (decision.allowed) {
    return {
      label: "Ready — you can continue",
      tone: "ready",
      icon: <CheckCircle2 className="h-4 w-4" />,
    };
  }
  const critical = resolved.some((r) => r.severity === "critical" || r.code === "emergency_stop_active");
  if (critical) {
    return {
      label: "Blocked",
      tone: "blocked",
      icon: <ShieldAlert className="h-4 w-4" />,
    };
  }
  return {
    label: "Needs attention",
    tone: "attention",
    icon: <AlertTriangle className="h-4 w-4" />,
  };
}

/** True iff the fix route is an in-page anchor (e.g. `#go-live-step-preview`). */
function isAnchor(href: string): boolean {
  return href.startsWith("#");
}

export function ReadinessSummary({ decision, loading, onRecheck, recipientContext }: Props) {
  const [showPassed, setShowPassed] = useState(false);
  const [showTech, setShowTech] = useState(false);

  const resolved = useMemo(
    () => resolveBlockers(decision?.blockers ?? []),
    [decision],
  );
  const headline = statusHeadline(loading, decision, resolved);
  const nextAction = useMemo(() => pickNextAction(resolved), [resolved]);

  const grouped: Record<BlockerGroup, ResolvedBlocker[]> = {
    platform: [],
    event: [],
    test: [],
  };
  for (const r of resolved) grouped[r.group].push(r);

  // Group readiness roll-up (Platform / Event / Current Test).
  const rollUp: Array<{ group: BlockerGroup; state: "complete" | "attention" | "not_started" }> = (
    ["platform", "event", "test"] as BlockerGroup[]
  ).map((g) => ({
    group: g,
    state:
      grouped[g].length > 0
        ? "attention"
        : !decision
          ? "not_started"
          : "complete",
  }));

  const passedGates = (decision?.gate_results ?? []).filter((g) => g.status === "pass");
  const skippedGates = (decision?.gate_results ?? []).filter(
    (g) => g.status === "skipped",
  );

  const totalNeeds = resolved.length;
  const summaryLine =
    totalNeeds === 0
      ? decision?.allowed
        ? "All setup items are complete."
        : ""
      : `${totalNeeds} setup item${totalNeeds === 1 ? "" : "s"} need${totalNeeds === 1 ? "s" : ""} attention before you can continue.`;

  const toneClass =
    headline.tone === "ready"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : headline.tone === "attention"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : headline.tone === "blocked"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-muted bg-muted/30";

  return (
    <div className="space-y-3">
      {/* Headline card */}
      <div className={`rounded-md border p-3 ${toneClass}`}>
        <div className="flex items-center gap-2 text-sm font-semibold">
          {headline.icon}
          {headline.label}
        </div>
        {summaryLine && (
          <div className="mt-1 text-xs">{summaryLine}</div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button size="sm" variant="outline" onClick={onRecheck} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            Re-check
          </Button>
          {decision && (
            <span className="text-[11px] opacity-75">
              policy v{decision.recipient_policy_version ?? "?"} · config v
              {decision.configuration_version ?? "?"}
            </span>
          )}
        </div>
      </div>

      {/* Setup progress roll-up */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {rollUp.map((r) => (
          <div
            key={r.group}
            className="flex items-center justify-between rounded-md border p-2 text-xs"
          >
            <span className="font-medium">{GROUP_LABEL[r.group]}</span>
            {r.state === "complete" ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Complete
              </span>
            ) : r.state === "attention" ? (
              <span className="inline-flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" /> Needs attention
              </span>
            ) : (
              <span className="text-muted-foreground">Not started</span>
            )}
          </div>
        ))}
      </div>

      {/* Recommended next action */}
      {nextAction && (
        <Alert>
          <Wrench className="h-4 w-4" />
          <AlertTitle>Recommended next action</AlertTitle>
          <AlertDescription>
            {nextAction.code === "recipient_policy_denied"
              ? "Configure an approved test recipient in Recipient Policy, then return and re-check readiness."
              : `${nextAction.title}. ${nextAction.explanation}`}
            <div className="mt-2">
              {isAnchor(nextAction.fixRoute) ? (
                <a
                  href={nextAction.fixRoute}
                  className="inline-flex items-center gap-1 text-sm text-primary underline"
                >
                  {nextAction.fixLabel} <ArrowRight className="h-3.5 w-3.5" />
                </a>
              ) : (
                <Link
                  to={nextAction.fixRoute}
                  className="inline-flex items-center gap-1 text-sm text-primary underline"
                >
                  {nextAction.fixLabel} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Grouped blockers */}
      {(["platform", "event", "test"] as BlockerGroup[]).map((g) =>
        grouped[g].length === 0 ? null : (
          <div key={g} className="space-y-2">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              {GROUP_LABEL[g]}
            </div>
            {grouped[g].map((b) => (
              <div key={b.code} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold">{b.title}</div>
                  {b.isUnknown && (
                    <Badge variant="outline" className="text-[10px]">Unrecognised</Badge>
                  )}
                  <Badge variant="outline" className="text-[10px]">{b.severity}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {b.serverMessage || b.explanation}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  <span className="font-medium">Why: </span>{b.whyItBlocks}
                </div>
                {(b.code === "recipient_policy_denied" || b.code === "test_recipient_not_resolved") &&
                  recipientContext && (
                    <div className="mt-2 rounded-md border border-dashed bg-muted/30 p-2 text-[11px] space-y-0.5">
                      <div>
                        <span className="text-muted-foreground">Policy mode: </span>
                        <span className="font-mono">{recipientContext.policyMode}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Evaluated recipient: </span>
                        <span className="font-mono">
                          {recipientContext.evaluatedMasked ?? "(none resolved)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Approved recipient: </span>
                        <span className="font-mono">
                          {recipientContext.approvedMasked ?? "(not configured)"}
                        </span>
                      </div>
                      {recipientContext.normalizedMatch === false && (
                        <div className="text-amber-700">
                          Normalized match: <strong>No</strong> — the event is trying to use{" "}
                          <code>{recipientContext.evaluatedMasked}</code>, but Recipient Policy
                          currently allows <code>{recipientContext.approvedMasked}</code>.
                        </div>
                      )}
                      {b.code === "test_recipient_not_resolved" && (
                        <div className="text-amber-700">
                          Reason: <code>{recipientContext.reason}</code> — no approved recipient
                          could be resolved for this diagnostic event.
                        </div>
                      )}
                    </div>
                )}
                {(b.currentValue != null || b.requiredValue != null) && (
                  <div className="mt-1 text-[11px]">
                    {b.currentValue != null && (
                      <div>
                        <span className="text-muted-foreground">Current: </span>
                        <span className="font-mono">{String(b.currentValue)}</span>
                      </div>
                    )}
                    {b.requiredValue != null && (
                      <div>
                        <span className="text-muted-foreground">Required: </span>
                        <span className="font-mono">{String(b.requiredValue)}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {isAnchor(b.fixRoute) ? (
                    <Button asChild size="sm">
                      <a href={b.fixRoute}>
                        <Wrench className="h-3.5 w-3.5 mr-1" /> Fix now
                      </a>
                    </Button>
                  ) : (
                    <Button asChild size="sm">
                      <Link to={b.fixRoute}>
                        <Wrench className="h-3.5 w-3.5 mr-1" /> Fix now
                      </Link>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={onRecheck} disabled={loading}>
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
                    Re-check
                  </Button>
                </div>
                <details className="mt-2">
                  <summary className="text-[11px] text-muted-foreground cursor-pointer">
                    Technical details
                  </summary>
                  <div className="mt-1 text-[11px] font-mono text-muted-foreground">
                    code: {b.originalCode || b.code}
                    {b.code !== b.originalCode && ` (canonical: ${b.code})`}
                    {b.stage && ` · stage: ${b.stage}`}
                  </div>
                </details>
              </div>
            ))}
          </div>
        ),
      )}

      {/* Completed checks */}
      {passedGates.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowPassed((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {showPassed ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            View completed checks ({passedGates.length})
          </button>
          {showPassed && (
            <ul className="mt-2 space-y-1">
              {passedGates.map((g) => (
                <li key={g.gate} className="flex items-center gap-2 text-xs text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="font-medium">{g.gate.replace(/_/g, " ")}</span>
                  {g.reason && <span className="text-muted-foreground">— {g.reason}</span>}
                </li>
              ))}
              {skippedGates.map((g) => (
                <li key={g.gate} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span>{g.gate.replace(/_/g, " ")} (skipped)</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Technical details for the whole envelope */}
      {decision && (
        <div>
          <button
            type="button"
            onClick={() => setShowTech((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {showTech ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Advanced diagnostics
          </button>
          {showTech && (
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted/40 p-2 text-[11px]">
              {JSON.stringify(
                {
                  decision_id: decision.decision_id,
                  blockers: decision.blockers,
                  warnings: decision.warnings,
                  gate_results: decision.gate_results,
                  trace_context: decision.trace_context,
                },
                null,
                2,
              )}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default ReadinessSummary;
