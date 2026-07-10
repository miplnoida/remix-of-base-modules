/**
 * EPIC 3A — Live Readiness Governance Panel (read-only, proposal-only).
 *
 * Evaluates event/template rows from `communication_hub_event_template_map`
 * against the readiness rules and produces a downloadable Markdown proposal.
 *
 * SAFETY:
 *  - No writes.
 *  - Does NOT promote events, does NOT open a live window, does NOT send.
 *  - The "Generate Live Readiness Proposal" button only produces a Markdown
 *    document for humans; nothing is enabled or dispatched.
 *  - EPIC 3B checklist actions are rendered disabled.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  RefreshCcw, ShieldCheck, AlertTriangle, FileDown, Copy, Lock, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolveSenderForEvent, type ResolvedSender } from "../services/senderProfileService";
import { Link } from "react-router-dom";

interface Row {
  moduleCode: string;
  eventCode: string;
  templateCode: string;
  channel: string;
  mappingActive: boolean;
  liveStatus: string | null;
  riskLevel: string | null;
  templateExists: boolean;
  activeVersionExists: boolean;
  templateVersionNo: number | null;
  lastDryRunNo: string | null;
  lastDryRunStatus: string | null;
  lastDryRunAt: string | null;
  lastDryRunHasUnrenderedTokens: boolean;
  operatorRehearsalPassed: boolean;
  operatorRehearsalAt: string | null;
  liveQueuedCount: number;
  operationsVisible: boolean;
  blockers: string[];
  senderBlockers: string[];
  sender: ResolvedSender | null;
  readinessStatus: "Not ready" | "Dry-run ready" | "Candidate for manual live review";
  recommendedAction: string;
}

interface Gates {
  dispatch_enabled: boolean;
  dry_run_only: boolean;
  email_live_enabled: boolean;
  cron_desired_enabled: boolean;
}

function classify(row: Omit<Row, "readinessStatus" | "recommendedAction">, gates: Gates): {
  readinessStatus: Row["readinessStatus"];
  recommendedAction: string;
} {
  const blockers = row.blockers;
  const hardSenderBlockers = row.senderBlockers.filter(b =>
    b === "sender_profile_missing" || b === "sender_disabled" || b === "sender_category_mismatch",
  );
  if (
    !row.mappingActive || row.liveStatus === "disabled" || row.liveStatus === null ||
    !row.templateExists || !row.activeVersionExists || !row.lastDryRunNo ||
    row.lastDryRunStatus === "failed" || row.lastDryRunHasUnrenderedTokens ||
    hardSenderBlockers.length > 0
  ) {
    return {
      readinessStatus: "Not ready",
      recommendedAction: blockers[0] ? `Resolve: ${blockers.join(", ")}` : "Run first dry-run.",
    };
  }
  const anyLiveGateOpen = gates.email_live_enabled || gates.cron_desired_enabled;
  const senderReadyForExternal = row.senderBlockers.length === 0;
  const candidate =
    (row.riskLevel ?? "").toLowerCase() === "low" &&
    row.liveStatus === "dry_run_only" &&
    row.operatorRehearsalPassed &&
    row.liveQueuedCount === 0 &&
    !anyLiveGateOpen &&
    row.operationsVisible &&
    senderReadyForExternal;
  if (candidate) {
    return {
      readinessStatus: "Candidate for manual live review",
      recommendedAction: "Draft proposal → keep dry-run only in this epic (EPIC 3B).",
    };
  }
  return {
    readinessStatus: "Dry-run ready",
    recommendedAction: !senderReadyForExternal
      ? "Verify sender identity + domain in Sender Verification Console before proposing live."
      : row.operatorRehearsalPassed
        ? "Continue observing dry-runs; awaiting risk/pilot criteria."
        : "Run Operator Rehearsal Wizard before proposing live pilot.",
  };
}

async function loadRow(m: any, gates: Gates): Promise<Row> {
  const blockers: string[] = [];

  const [liveCtrl, tpl, lastReq, lastRehearsal] = await Promise.all([
    (supabase as any).from("communication_hub_event_live_control")
      .select("status, risk_level")
      .eq("module_code", m.module_code).eq("event_code", m.event_code).maybeSingle(),
    (supabase as any).from("core_template")
      .select("id, is_active, active_version_id")
      .eq("code", m.template_code).maybeSingle(),
    (supabase as any).from("communication_request")
      .select("id, request_no, status, created_at")
      .eq("module_code", m.module_code).eq("event_code", m.event_code)
      .order("created_at", { ascending: false }).limit(1),
    (supabase as any).from("communication_hub_control_audit")
      .select("setting_key, new_value, changed_at")
      .in("setting_key", [`operator_rehearsal_run:${m.module_code}:${m.event_code}`, "operator_rehearsal_run"])
      .order("changed_at", { ascending: false }).limit(10),
  ]);

  const liveStatus = liveCtrl.data?.status ?? null;
  const riskLevel = liveCtrl.data?.risk_level ?? null;
  if (!liveCtrl.data) blockers.push("event_live_control_missing");
  else if (liveStatus === "disabled") blockers.push("event_disabled");

  if (!m.active) blockers.push("mapping_disabled");

  const templateExists = !!tpl.data;
  const activeVersionExists = !!tpl.data?.active_version_id && !!tpl.data?.is_active;
  if (!templateExists) blockers.push("template_missing");
  else if (!activeVersionExists) blockers.push("template_no_active_version");

  let templateVersionNo: number | null = null;
  if (tpl.data?.active_version_id) {
    const { data: v } = await (supabase as any).from("core_template_version")
      .select("version_no").eq("id", tpl.data.active_version_id).maybeSingle();
    templateVersionNo = v?.version_no ?? null;
  }

  const lastDryRunNo = lastReq.data?.[0]?.request_no ?? null;
  const lastDryRunStatus = lastReq.data?.[0]?.status ?? null;
  const lastDryRunAt = lastReq.data?.[0]?.created_at ?? null;
  if (!lastDryRunNo) blockers.push("no_dry_run_yet");
  else if (lastDryRunStatus === "failed") blockers.push("last_dry_run_failed");

  // Check message body for unrendered tokens
  let lastDryRunHasUnrenderedTokens = false;
  let operationsVisible = false;
  if (lastReq.data?.[0]?.id) {
    const { data: msgs } = await (supabase as any).from("communication_message")
      .select("id, rendered_body, status, test_mode").eq("request_id", lastReq.data[0].id).limit(5);
    if (msgs && msgs.length > 0) {
      operationsVisible = true;
      lastDryRunHasUnrenderedTokens = msgs.some((mm: any) =>
        typeof mm.rendered_body === "string" && /\{\{\s*[a-zA-Z0-9_.]+\s*\}\}/.test(mm.rendered_body),
      );
      if (lastDryRunHasUnrenderedTokens) blockers.push("unrendered_tokens_in_last_dry_run");
    }
  }

  const rehearsalRow = (lastRehearsal.data ?? []).find((row: any) => {
    const value = row.new_value ?? {};
    return value.module_code === m.module_code && value.event_code === m.event_code;
  });
  const rehearsalVal = rehearsalRow?.new_value as any;
  const operatorRehearsalPassed =
    !!rehearsalVal && (
      rehearsalVal.overall === "pass" ||
      (
        rehearsalVal.results?.pass?.cancel === true &&
        rehearsalVal.results?.pass?.retry === true &&
        rehearsalVal.results?.pass?.clear_lock === true
      )
    );
  const operatorRehearsalAt = rehearsalRow?.changed_at ?? null;
  if (!operatorRehearsalPassed) blockers.push("operator_rehearsal_not_passed");

  const { count: liveQueuedCount } = await (supabase as any).from("communication_message")
    .select("id", { count: "exact", head: true })
    .eq("test_mode", false).in("status", ["queued", "sending"]);
  const liveQ = liveQueuedCount ?? 0;
  if (liveQ > 0) blockers.push("live_queued_present");

  // Sender readiness (EPIC CH-S2). Recipient assumed internal pilot in this proposal-only view.
  let sender: ResolvedSender | null = null;
  const senderBlockers: string[] = [];
  try {
    sender = await resolveSenderForEvent(m.module_code, m.event_code, m.channel);
  } catch { sender = null; }
  if (!sender || sender.ok !== true || !sender.sender_profile_id) {
    senderBlockers.push("sender_profile_missing");
  } else {
    if (sender.is_enabled === false) senderBlockers.push("sender_disabled");
    // Proposal-only: warn if not verified even for internal, since promotion may target external later.
    if (sender.provider_identity_status !== "verified") senderBlockers.push("sender_not_verified");
    if (sender.domain_verified !== true) senderBlockers.push("sender_domain_not_verified");
    const expected: Record<string, string> = {
      LEGAL: "legal",
      COMPLIANCE: "compliance",
      EMPLOYER_REGISTRATION: "registration",
    };
    if (expected[m.module_code] && sender.sender_category === "notifications") {
      senderBlockers.push("sender_category_mismatch");
    }
    if ((riskLevel === "high" || riskLevel === "sensitive") && sender.sender_category === "notifications") {
      if (!senderBlockers.includes("sender_category_mismatch")) senderBlockers.push("sender_category_mismatch");
    }
  }
  // Non-verified sender blocks Candidate readiness
  const blockingSender = senderBlockers.filter(b => b !== "sender_not_verified" && b !== "sender_domain_not_verified");
  const allBlockers = [...blockers, ...blockingSender];

  const base = {
    moduleCode: m.module_code, eventCode: m.event_code, templateCode: m.template_code,
    channel: m.channel, mappingActive: !!m.active,
    liveStatus, riskLevel,
    templateExists, activeVersionExists, templateVersionNo,
    lastDryRunNo, lastDryRunStatus, lastDryRunAt, lastDryRunHasUnrenderedTokens,
    operatorRehearsalPassed, operatorRehearsalAt,
    liveQueuedCount: liveQ, operationsVisible,
    blockers: allBlockers,
    senderBlockers,
    sender,
  };
  const { readinessStatus, recommendedAction } = classify(base as any, gates);
  return { ...base, readinessStatus, recommendedAction };
}

function readinessBadge(status: Row["readinessStatus"]) {
  if (status === "Candidate for manual live review")
    return <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />{status}</Badge>;
  if (status === "Dry-run ready") return <Badge variant="secondary">{status}</Badge>;
  return <Badge variant="destructive">{status}</Badge>;
}

function buildProposal(row: Row, gates: Gates): string {
  const now = new Date().toISOString();
  return `# Live Readiness Proposal — ${row.moduleCode} / ${row.eventCode}

> **Proposal only. No live enablement has been performed.**
> Generated at ${now}

## Candidate
- Module: \`${row.moduleCode}\`
- Event: \`${row.eventCode}\`
- Channel: \`${row.channel}\`
- Template code: \`${row.templateCode}\`
- Active template version: v${row.templateVersionNo ?? "?"}
- Risk level: **${row.riskLevel ?? "unknown"}**
- Current event live status: **${row.liveStatus ?? "missing"}**

## Latest dry-run
- Request no: \`${row.lastDryRunNo ?? "—"}\`
- Status: \`${row.lastDryRunStatus ?? "—"}\`
- Timestamp: ${row.lastDryRunAt ?? "—"}
- Unrendered tokens in body: ${row.lastDryRunHasUnrenderedTokens ? "YES (blocker)" : "no"}

## Operator rehearsal
- Passed: ${row.operatorRehearsalPassed ? "YES" : "NO"}
- Last rehearsal: ${row.operatorRehearsalAt ?? "—"}

## Operations pages checked
- Delivery Monitor / Dispatch Register / Lifecycle Event Log show latest dry-run: ${row.operationsVisible ? "YES" : "NO"}

## Current safe-gate state (must all remain closed for this epic)
- \`dispatch_enabled\` = ${gates.dispatch_enabled}
- \`dry_run_only\` = ${gates.dry_run_only}
- \`email_live_enabled\` = ${gates.email_live_enabled}
- \`cron_desired_enabled\` = ${gates.cron_desired_enabled}
- Live queued messages: ${row.liveQueuedCount}

## Blockers
${row.blockers.length ? row.blockers.map(b => `- ${b}`).join("\n") : "- none"}

## Pilot recipient restriction (future)
- Internal-only allowlist address (e.g. \`rohit@mishainfotech.com\`).
- No external recipient permitted for first live send.

## Proposed typed confirmation for future live promotion
\`PROMOTE ${row.moduleCode}/${row.eventCode} TO LIVE MANUAL ONLY\`

## Future EPIC 3B checklist (not performed in this epic)
1. Promote event to \`live_manual_only\` (admin-only, audited, reason required).
2. Open DB live window (\`email_live_enabled=true\`, records \`live_eligible_after=now()\`).
3. Run preflight against candidate event.
4. Send exactly one internal live email to allowlist address.
5. Confirm delivery via Resend webhook + Delivery Monitor.
6. Immediately close DB live window (\`email_live_enabled=false\`).
7. Confirm safe state restored (live_queued=0, no cron).

## Governance
- Readiness status: **${row.readinessStatus}**
- Recommended action: ${row.recommendedAction}
- This document is advisory. No live enablement, no cron, no provider call performed.
`;
}

export function LiveReadinessGovernancePanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [gates, setGates] = useState<Gates | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [proposal, setProposal] = useState<string>("");

  async function reload() {
    setLoading(true);
    try {
      const [{ data: mappings }, { data: g }] = await Promise.all([
        (supabase as any).from("communication_hub_event_template_map")
          .select("module_code, event_code, channel, template_code, active")
          .eq("channel", "email"),
        (supabase as any).from("communication_hub_control_settings")
          .select("dispatch_enabled, dry_run_only, email_live_enabled, cron_desired_enabled")
          .limit(1).maybeSingle(),
      ]);
      const gs: Gates = {
        dispatch_enabled: !!g?.dispatch_enabled,
        dry_run_only: !!g?.dry_run_only,
        email_live_enabled: !!g?.email_live_enabled,
        cron_desired_enabled: !!g?.cron_desired_enabled,
      };
      setGates(gs);
      const out = await Promise.all((mappings ?? []).map((m: any) => loadRow(m, gs)));
      setRows(out.sort((a, b) => `${a.moduleCode}${a.eventCode}`.localeCompare(`${b.moduleCode}${b.eventCode}`)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  const candidates = useMemo(
    () => rows.filter(r => r.readinessStatus === "Candidate for manual live review"),
    [rows],
  );

  function generate(row: Row) {
    if (!gates) return;
    const md = buildProposal(row, gates);
    setProposal(md);
    setSelectedKey(`${row.moduleCode}:${row.eventCode}`);
  }

  function download() {
    if (!proposal) return;
    const blob = new Blob([proposal], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `live-readiness-proposal-${selectedKey ?? "candidate"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyMd() {
    try {
      await navigator.clipboard.writeText(proposal);
      toast.success("Proposal copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  }

  const anyLiveGateOpen = !!(gates?.email_live_enabled || gates?.cron_desired_enabled);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> Live Readiness Governance (EPIC 3A)
          </CardTitle>
          <CardDescription>
            Proposal-only view. Evaluates candidates for a future manual live pilot.
            No event is promoted, no live window is opened, no email is sent here.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
          <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
        </Button>
        <Button variant="outline" size="sm" asChild className="ml-2">
          <Link to="/admin/communication-hub/design/sender-verification">
            <ShieldCheck className="h-4 w-4 mr-1" /> Sender Verification Console
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Read-only in this epic</AlertTitle>
          <AlertDescription>
            All promotion, live-window, preflight and live-send actions are disabled.
            Use this panel to identify candidates and generate a proposal document for
            EPIC 3B review. The <code>COMMUNICATION_HUB_EMAIL_LIVE</code> env gate must
            remain <code>false</code>.
          </AlertDescription>
        </Alert>

        {gates && (
          <div className="grid gap-2 md:grid-cols-4 text-xs">
            <div className="rounded-md border p-2">dispatch_enabled: <Badge variant={gates.dispatch_enabled ? "default" : "secondary"}>{String(gates.dispatch_enabled)}</Badge></div>
            <div className="rounded-md border p-2">dry_run_only: <Badge variant={gates.dry_run_only ? "default" : "outline"}>{String(gates.dry_run_only)}</Badge></div>
            <div className="rounded-md border p-2">email_live_enabled: <Badge variant={gates.email_live_enabled ? "destructive" : "secondary"}>{String(gates.email_live_enabled)}</Badge></div>
            <div className="rounded-md border p-2">cron_desired_enabled: <Badge variant={gates.cron_desired_enabled ? "destructive" : "secondary"}>{String(gates.cron_desired_enabled)}</Badge></div>
          </div>
        )}

        {loading ? (
          <div className="text-sm text-muted-foreground">Evaluating readiness…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2 border-b">Module / Event</th>
                  <th className="p-2 border-b">Template</th>
                  <th className="p-2 border-b">Sender</th>
                  <th className="p-2 border-b">Risk</th>
                  <th className="p-2 border-b">Event status</th>
                  <th className="p-2 border-b">Latest dry-run</th>
                  <th className="p-2 border-b">Rehearsal</th>
                  <th className="p-2 border-b">Live queued</th>
                  <th className="p-2 border-b">Token blockers</th>
                  <th className="p-2 border-b">Ops visible</th>
                  <th className="p-2 border-b">Blockers</th>
                  <th className="p-2 border-b">Readiness</th>
                  <th className="p-2 border-b">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={`${r.moduleCode}:${r.eventCode}`} className="align-top border-b">
                    <td className="p-2">
                      <div className="font-mono text-[11px]">{r.moduleCode}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{r.eventCode}</div>
                    </td>
                    <td className="p-2">
                      <div className="font-mono text-[10px]">{r.templateCode}</div>
                      {r.activeVersionExists
                        ? <Badge variant="secondary">v{r.templateVersionNo ?? "?"}</Badge>
                        : <Badge variant="destructive">no active version</Badge>}
                    </td>
                    <td className="p-2">
                      {r.sender && r.sender.ok ? (
                        <div className="space-y-1">
                          <div className="font-mono text-[10px]">{r.sender.from_email}</div>
                          <div className="flex flex-wrap gap-1">
                            {r.sender.is_enabled === false
                              ? <Badge variant="destructive">disabled</Badge>
                              : <Badge variant="secondary">enabled</Badge>}
                            {r.sender.provider_identity_status === "verified"
                              ? <Badge variant="secondary">identity ok</Badge>
                              : <Badge variant="destructive">identity {r.sender.provider_identity_status}</Badge>}
                            {r.sender.domain_verified
                              ? <Badge variant="secondary">domain ok</Badge>
                              : <Badge variant="destructive">domain unverified</Badge>}
                          </div>
                          {r.senderBlockers.length > 0 && (
                            <div className="text-[10px] text-destructive">{r.senderBlockers.join(", ")}</div>
                          )}
                        </div>
                      ) : (
                        <Badge variant="destructive">sender missing</Badge>
                      )}
                    </td>
                    <td className="p-2"><Badge variant="outline">{r.riskLevel ?? "—"}</Badge></td>
                    <td className="p-2"><Badge variant="outline">{r.liveStatus ?? "missing"}</Badge></td>
                    <td className="p-2">
                      {r.lastDryRunNo ? (
                        <>
                          <div className="font-mono text-[10px]">{r.lastDryRunNo}</div>
                          <div className="text-[10px] text-muted-foreground">{r.lastDryRunStatus}</div>
                        </>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-2">
                      {r.operatorRehearsalPassed
                        ? <Badge variant="secondary">passed</Badge>
                        : <Badge variant="destructive">not passed</Badge>}
                    </td>
                    <td className="p-2">
                      <Badge variant={r.liveQueuedCount === 0 ? "secondary" : "destructive"}>{r.liveQueuedCount}</Badge>
                    </td>
                    <td className="p-2">
                      {r.lastDryRunHasUnrenderedTokens
                        ? <Badge variant="destructive">unrendered</Badge>
                        : <Badge variant="secondary">clean</Badge>}
                    </td>
                    <td className="p-2">
                      {r.operationsVisible
                        ? <Badge variant="secondary">yes</Badge>
                        : <Badge variant="outline">no</Badge>}
                    </td>
                    <td className="p-2">
                      {r.blockers.length === 0
                        ? <Badge variant="secondary">none</Badge>
                        : (
                          <div className="flex items-start gap-1">
                            <AlertTriangle className="h-3 w-3 text-destructive mt-0.5" />
                            <div className="text-[10px]">{r.blockers.join(", ")}</div>
                          </div>
                        )}
                    </td>
                    <td className="p-2">{readinessBadge(r.readinessStatus)}</td>
                    <td className="p-2">
                      <div className="space-y-1">
                        <div className="text-[10px]">{r.recommendedAction}</div>
                        <Button
                          size="sm" variant="outline" className="h-7 text-[11px]"
                          disabled={r.readinessStatus !== "Candidate for manual live review"}
                          onClick={() => generate(r)}
                        >
                          <FileDown className="h-3 w-3 mr-1" />
                          Generate proposal
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={13} className="p-4 text-center text-muted-foreground">No mapped events found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {proposal && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Live Readiness Proposal — {selectedKey}</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyMd}><Copy className="h-3 w-3 mr-1" />Copy</Button>
                <Button size="sm" variant="outline" onClick={download}><FileDown className="h-3 w-3 mr-1" />Download .md</Button>
              </div>
            </div>
            <Textarea readOnly value={proposal} rows={16} className="font-mono text-[11px]" />
            <div className="text-[11px] text-muted-foreground">
              Proposal only. No live enablement has been performed.
            </div>
          </div>
        )}

        {/* EPIC 3B future checklist — disabled */}
        <div className="rounded-md border p-3 space-y-2">
          <div className="text-xs font-semibold flex items-center gap-2">
            <Lock className="h-3 w-3" /> Future EPIC 3B actions (disabled in this epic)
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {[
              "1. Promote selected event to live_manual_only",
              "2. Open DB live window",
              "3. Run preflight",
              "4. Send exactly one internal live email",
              "5. Confirm delivery / webhook",
              "6. Immediately close DB live window",
              "7. Confirm safe state",
            ].map(step => (
              <Button
                key={step} variant="outline" size="sm"
                disabled
                className="justify-start opacity-60 cursor-not-allowed"
              >
                <Lock className="h-3 w-3 mr-2" />{step}
              </Button>
            ))}
          </div>
          {anyLiveGateOpen && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Live gate is open</AlertTitle>
              <AlertDescription>
                A live gate (email_live_enabled or cron_desired_enabled) is currently on.
                Close it before proposing any pilot; no candidate should be evaluated while
                a live gate is open.
              </AlertDescription>
            </Alert>
          )}
          <div className="text-[11px] text-muted-foreground">
            Candidates identified: <strong>{candidates.length}</strong>.
            All promotion / send actions remain disabled until EPIC 3B.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
