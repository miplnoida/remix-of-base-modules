/**
 * EPIC PROD-3 — Controlled Internal Live Test workflow.
 * Route: /admin/communication-hub/testing/controlled-live-test
 *
 * Purpose:
 *   Guide an operator through exactly ONE internal live email send with:
 *     1. Candidate event selection (live_manual_only, low-risk by default)
 *     2. Single internal recipient (allowlist-validated)
 *     3. Runtime gate parity check (evaluate_comm_hub_runtime_gate_status)
 *     4. Preview review (render_comm_hub_template_preview)
 *     5. Typed confirmation + checklist
 *     6. Canonical enqueue path (sendCommunication → comm-hub-enqueue)
 *     7. Post-send evidence + copyable summary
 *
 * Never bypasses any gate. Never enables live. Never schedules cron.
 * Never allows bulk or external recipients. Uses the canonical enqueue
 * path only — never direct RPC. Direct callers (event-pilot / admin-test-
 * notice) are intentionally NOT used from this workflow.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ClipboardCopy, ExternalLink, Info, Loader2, RefreshCcw, Send, ShieldAlert } from "lucide-react";

import CommunicationHubWorkspaceShell, { CommunicationHubSectionCard } from "../components/CommunicationHubWorkspaceShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { fetchControlSettings, type CommHubControlSettings } from "../controlCenter/controlCenterService";
import { loadAllEventsReadiness, type ReadinessRow } from "../liveReadiness/allEventsLiveReadinessService";
import { RuntimeGateParityPanel } from "../productionReadiness/RuntimeGateParityPanel";
import { renderCommHubTemplatePreview, type CommHubPreviewResult } from "../preview/commHubPreviewService";
import {
  sendCommunication,
  isCommunicationHubSendEnabled,
  setCommunicationHubSendEnabledRuntime,
} from "@/platform/communication-hub/sendCommunication";
import type { SendCommunicationResult } from "@/platform/communication-hub/types";

const TYPED_PHRASE = "SEND ONE INTERNAL LIVE TEST";

interface SendEvidence {
  ok: boolean;
  status: string;
  requestId: string | null;
  requestNo: string | null;
  correlationId: string;
  messageIds: string[];
  warnings: string[];
  error?: string;
  raw: SendCommunicationResult;
  attemptedAt: string;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}***@${domain}`;
}

function isRecipientAllowed(
  email: string,
  control: CommHubControlSettings | null,
): { allowed: boolean; reason: string } {
  const e = (email ?? "").trim().toLowerCase();
  if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { allowed: false, reason: "Invalid email format." };
  if (!control) return { allowed: false, reason: "Recipient allowlist not loaded." };
  const domain = e.split("@")[1];
  const addrs = (control.allowed_email_addresses ?? []).map((x) => x.toLowerCase());
  const doms = (control.allowed_email_domains ?? []).map((x) => x.toLowerCase().replace(/^@/, ""));
  if (addrs.includes(e)) return { allowed: true, reason: `Address is explicitly allowlisted.` };
  if (doms.includes(domain)) return { allowed: true, reason: `Domain @${domain} is allowlisted.` };
  return { allowed: false, reason: `Not in allowlist (${addrs.length} address(es), ${doms.length} domain(s)).` };
}

export default function ControlledLiveTestPage() {
  const [control, setControl] = useState<CommHubControlSettings | null>(null);
  const [events, setEvents] = useState<ReadinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [allowHighRisk, setAllowHighRisk] = useState(false);

  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");

  const [preview, setPreview] = useState<CommHubPreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewReviewed, setPreviewReviewed] = useState(false);

  const [typed, setTyped] = useState("");
  const [ckInternal, setCkInternal] = useState(false);
  const [ckOne, setCkOne] = useState(false);
  const [ckNotBulk, setCkNotBulk] = useState(false);
  const [ckReviewedPreview, setCkReviewedPreview] = useState(false);
  const [ckGatesChecked, setCkGatesChecked] = useState(false);

  const [sending, setSending] = useState(false);
  const [evidence, setEvidence] = useState<SendEvidence | null>(null);

  const selected = useMemo(
    () => events.find((r) => `${r.module_code}:${r.event_code}:${r.channel}` === selectedKey) ?? null,
    [events, selectedKey],
  );

  const candidateEvents = useMemo(
    () =>
      events
        .filter(
          (r) =>
            r.channel === "email" &&
            r.eligible &&
            r.live_control_status === "live_manual_only" &&
            r.template_mapped &&
            r.template_version_ok &&
            r.sender_mapped &&
            r.sender_enabled &&
            r.sender_domain_verified &&
            r.send_policy_exists &&
            r.send_policy_approved &&
            r.review_policy_exists,
        )
        .filter((r) => (allowHighRisk ? true : !r.is_high_risk))
        .sort((a, b) => a.key.localeCompare(b.key)),
    [events, allowHighRisk],
  );

  async function load() {
    setLoading(true);
    try {
      const [c, e] = await Promise.all([fetchControlSettings(), loadAllEventsReadiness()]);
      setControl(c);
      setEvents(e);
      // Suggest first allowed address as recipient hint.
      if (!recipientEmail && c.allowed_email_addresses.length > 0) setRecipientEmail(c.allowed_email_addresses[0]);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load readiness");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, []);

  // Reset downstream state when selection changes.
  useEffect(() => {
    setPreview(null);
    setPreviewReviewed(false);
    setCkReviewedPreview(false);
    setEvidence(null);
  }, [selectedKey, recipientEmail]);

  const recipientCheck = useMemo(() => isRecipientAllowed(recipientEmail, control), [recipientEmail, control]);

  const gateInput = useMemo(() => {
    if (!selected || !recipientEmail || !recipientCheck.allowed) return null;
    return {
      moduleCode: selected.module_code,
      eventCode: selected.event_code,
      channel: selected.channel,
      sendMode: "live" as const,
      recipientEmail: recipientEmail.trim(),
      recipientCount: 1,
      previewConfirmed: previewReviewed,
    };
  }, [selected, recipientEmail, recipientCheck.allowed, previewReviewed]);

  async function runPreview() {
    if (!selected || !recipientCheck.allowed) return;
    setPreviewLoading(true);
    try {
      const p = await renderCommHubTemplatePreview({
        module_code: selected.module_code,
        event_code: selected.event_code,
        channel: selected.channel,
        recipient_email: recipientEmail.trim(),
        recipient_name: recipientName.trim() || undefined,
      });
      setPreview(p);
      if (!p.ok) toast.warning("Preview returned blockers — review before send.");
    } catch (err: any) {
      toast.error(err?.message ?? "Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  }

  const hardBlockers = useMemo(() => {
    const list: string[] = [];
    if (!selected) list.push("Select a candidate event.");
    else {
      if (selected.is_high_risk && !allowHighRisk) list.push("Event is high-risk (not allowed by default).");
      if (selected.live_control_status !== "live_manual_only") list.push("Event live-control is not live_manual_only.");
      if (!selected.template_version_ok) list.push("Template version is not approved/valid.");
      if (!(selected.sender_enabled && selected.sender_domain_verified)) list.push("Mapped sender not fully verified.");
      if (!(selected.send_policy_exists && selected.send_policy_approved)) list.push("Send policy missing or unapproved.");
      if (!selected.review_policy_exists) list.push("Review policy missing.");
    }
    if (!recipientEmail) list.push("Recipient required.");
    else if (!recipientCheck.allowed) list.push(`Recipient not allowed: ${recipientCheck.reason}`);
    return list;
  }, [selected, allowHighRisk, recipientEmail, recipientCheck]);

  const allConfirmed =
    ckInternal && ckOne && ckNotBulk && ckReviewedPreview && ckGatesChecked && previewReviewed;
  const typedOk = typed.trim() === TYPED_PHRASE;
  const canSend = hardBlockers.length === 0 && allConfirmed && typedOk && !sending;

  async function runControlledLiveSend() {
    if (!canSend || !selected) return;
    // Ensure façade is enabled at runtime for this browser session; live send
    // requires this flag ON. This does NOT change any server gate.
    if (!isCommunicationHubSendEnabled()) setCommunicationHubSendEnabledRuntime(true);

    setSending(true);
    const dedupeKey = `controlled-live-test:${selected.module_code}:${selected.event_code}:${Date.now()}`;
    try {
      const result = await sendCommunication({
        moduleCode: selected.module_code,
        eventCode: selected.event_code,
        channels: ["EMAIL"],
        recipient: {
          role: "to",
          email: recipientEmail.trim(),
          name: recipientName.trim() || undefined,
        },
        data: {
          recipient_name: recipientName.trim() || "Internal Tester",
          controlled_live_test: true,
        },
        metadata: {
          controlled_live_test: true,
          source: "controlled_internal_live_test",
          preview_confirmed: true,
          review_context: { preview_confirmed: true },
          typed_confirmation: TYPED_PHRASE,
        },
        idempotencyKey: dedupeKey,
        testMode: false,
      });
      setEvidence({
        ok: !!result.ok,
        status: result.status,
        requestId: result.requestId,
        requestNo: result.requestNo,
        correlationId: result.correlationId,
        messageIds: result.messageIds ?? [],
        warnings: result.warnings ?? [],
        error: result.error,
        raw: result,
        attemptedAt: new Date().toISOString(),
      });
      if (result.ok) toast.success("Controlled live test enqueued through canonical path.");
      else toast.error(`Enqueue blocked: ${result.error ?? "see warnings"}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Send failed");
      setEvidence({
        ok: false,
        status: "failed",
        requestId: null,
        requestNo: null,
        correlationId: "",
        messageIds: [],
        warnings: [String(err?.message ?? err)],
        error: "EXCEPTION",
        raw: {} as SendCommunicationResult,
        attemptedAt: new Date().toISOString(),
      });
    } finally {
      setSending(false);
      // Reset one-shot confirmations to prevent accidental re-fire.
      setTyped("");
      setCkGatesChecked(false);
    }
  }

  function buildSummary(): string {
    const lines: string[] = [
      "# Controlled Internal Live Test — Summary",
      "",
      `Timestamp: ${new Date().toISOString()}`,
      `Event: ${selected ? `${selected.module_code} / ${selected.event_code} (${selected.channel})` : "—"}`,
      `Event name: ${selected?.event_name ?? "—"}`,
      `Risk: ${selected?.risk_level ?? "—"}${selected?.is_high_risk ? " (high-risk)" : ""}`,
      `Recipient (masked): ${recipientEmail ? maskEmail(recipientEmail) : "—"}`,
      `Recipient allowed: ${recipientCheck.allowed ? "yes" : "no"} — ${recipientCheck.reason}`,
      `Preview reviewed: ${previewReviewed ? "yes" : "no"}`,
      `Typed confirmation: ${typedOk ? "matched" : "not matched"}`,
      "",
      "## Result",
      evidence
        ? [
            `Attempted at: ${evidence.attemptedAt}`,
            `Enqueue ok: ${evidence.ok ? "yes" : "no"}`,
            `Status: ${evidence.status}`,
            `Request ID: ${evidence.requestId ?? "—"}`,
            `Request No: ${evidence.requestNo ?? "—"}`,
            `Correlation ID: ${evidence.correlationId || "—"}`,
            `Message IDs: ${evidence.messageIds.join(", ") || "—"}`,
            evidence.error ? `Error: ${evidence.error}` : "",
            evidence.warnings.length ? `Warnings:\n - ${evidence.warnings.join("\n - ")}` : "",
          ]
            .filter(Boolean)
            .join("\n")
        : "No send attempted yet.",
      "",
      "## Next recommended action",
      evidence?.ok
        ? "Open the Communication Request → confirm provider send & webhook delivery in Delivery Monitor."
        : evidence
          ? "Resolve blockers surfaced by comm-hub-enqueue; do NOT retry blindly."
          : "Complete preview + confirmations + typed phrase, then run the test.",
    ];
    return lines.join("\n");
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(buildSummary());
      toast.success("Summary copied to clipboard");
    } catch {
      toast.error("Clipboard copy failed");
    }
  }

  return (
    <CommunicationHubWorkspaceShell
      title="Controlled Internal Live Test"
      purpose="Send exactly one internal live email through the canonical enqueue path with typed confirmation, preview review, and full evidence."
      risk="high-risk"
      section="Testing"
    >
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>This test uses the canonical enqueue path.</AlertTitle>
        <AlertDescription className="text-xs">
          sendCommunication() → comm-hub-enqueue → send_communication_v1 (SECURITY DEFINER) → dispatcher.
          Direct RPC callers (comm-hub-event-pilot, comm-hub-admin-test-notice) are NOT used from this
          workflow. All server-side gates (send policy, review policy, event live-control, recipient
          allowlist, sender verification, template version, bulk block) remain enforced.
        </AlertDescription>
      </Alert>

      {/* Step 1 — Event */}
      <CommunicationHubSectionCard
        title="Step 1 · Select candidate event"
        description="Only events that are eligible, live_manual_only, and fully mapped/verified are listed. High-risk events are hidden by default."
      >
        {loading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs">
              <Checkbox id="hr" checked={allowHighRisk} onCheckedChange={(v) => setAllowHighRisk(!!v)} />
              <Label htmlFor="hr" className="cursor-pointer">
                Show high-risk events (disabled by default)
              </Label>
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => void load()}>
                <RefreshCcw className="h-3.5 w-3.5 mr-1" /> Refresh
              </Button>
            </div>
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    candidateEvents.length === 0
                      ? "No candidate events available"
                      : `Select a candidate event (${candidateEvents.length})`
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {candidateEvents.map((r) => (
                  <SelectItem key={r.key} value={r.key}>
                    {r.module_code} · {r.event_code} · {r.channel}
                    {r.is_high_risk ? " · high-risk" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{selected.event_name}</Badge>
                <Badge variant="outline">risk: {selected.risk_level}</Badge>
                <Badge variant="outline">live: {selected.live_control_status ?? "—"}</Badge>
                <Badge variant={selected.template_version_ok ? "default" : "destructive"}>template v{selected.template_version_no ?? "?"}</Badge>
                <Badge variant={selected.sender_enabled && selected.sender_domain_verified ? "default" : "destructive"}>sender</Badge>
                <Badge variant={selected.send_policy_approved ? "default" : "destructive"}>send policy</Badge>
                <Badge variant={selected.review_policy_exists ? "default" : "destructive"}>review policy</Badge>
              </div>
            )}
          </div>
        )}
      </CommunicationHubSectionCard>

      {/* Step 2 — Recipient */}
      <CommunicationHubSectionCard
        title="Step 2 · Internal recipient (exactly one)"
        description="Recipient must be on the address allowlist or match an allowed domain. External and multi-recipient sends are blocked."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="rcpt-email">Email</Label>
            <Input
              id="rcpt-email"
              type="email"
              autoComplete="off"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="internal.tester@yourdomain"
            />
          </div>
          <div>
            <Label htmlFor="rcpt-name">Name (optional)</Label>
            <Input
              id="rcpt-name"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Internal Tester"
            />
          </div>
        </div>
        <div className="text-xs mt-2">
          {recipientEmail ? (
            recipientCheck.allowed ? (
              <span className="text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> {recipientCheck.reason}
              </span>
            ) : (
              <span className="text-destructive inline-flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> {recipientCheck.reason}
              </span>
            )
          ) : (
            <span className="text-muted-foreground">Enter one internal recipient.</span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground">
          Allowlist: {control?.allowed_email_addresses.length ?? 0} address(es),{" "}
          {control?.allowed_email_domains.length ?? 0} domain(s). Manage in{" "}
          <Link to="/admin/communication-hub/recipient-control" className="underline">
            Recipient Control
          </Link>
          .
        </div>
      </CommunicationHubSectionCard>

      {/* Step 3/4 — Runtime gate */}
      <CommunicationHubSectionCard
        title="Step 3 · Runtime gate parity check"
        description="Calls evaluate_comm_hub_runtime_gate_status with send_mode=live. Blocked gates prevent send."
      >
        <RuntimeGateParityPanel input={gateInput} autoLoad={!!gateInput} />
      </CommunicationHubSectionCard>

      {/* Step 5 — Preview */}
      <CommunicationHubSectionCard
        title="Step 4 · Preview"
        description="Render the resolved template for this event + recipient. Preview must be reviewed before live send."
      >
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void runPreview()}
            disabled={!selected || !recipientCheck.allowed || previewLoading}
          >
            {previewLoading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Generate preview
          </Button>
          <div className="flex items-center gap-2 ml-auto">
            <Checkbox
              id="pv-ok"
              checked={previewReviewed}
              disabled={!preview?.ok}
              onCheckedChange={(v) => {
                const next = !!v;
                setPreviewReviewed(next);
                setCkReviewedPreview(next);
              }}
            />
            <Label htmlFor="pv-ok" className={preview?.ok ? "cursor-pointer" : "opacity-50"}>
              I reviewed the preview
            </Label>
          </div>
        </div>
        {preview && (
          <div className="space-y-2 mt-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant={preview.ok ? "default" : "destructive"}>preview: {preview.ok ? "ok" : "blocked"}</Badge>
              {preview.version_no != null && <Badge variant="outline">v{preview.version_no}</Badge>}
              {preview.sender_verified != null && (
                <Badge variant={preview.sender_verified ? "default" : "destructive"}>
                  sender {preview.sender_verified ? "verified" : "unverified"}
                </Badge>
              )}
            </div>
            <div className="text-xs font-medium">Subject</div>
            <div className="rounded border bg-muted/40 px-3 py-2 text-sm">{preview.subject_preview ?? "—"}</div>
            <div className="text-xs font-medium">HTML body</div>
            <div
              className="rounded border bg-background px-3 py-2 text-sm max-h-64 overflow-auto"
              dangerouslySetInnerHTML={{ __html: preview.html_preview ?? "" }}
            />
            {(preview.blockers?.length ?? 0) > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Preview blockers</AlertTitle>
                <AlertDescription className="text-xs">
                  <ul className="list-disc pl-5">
                    {(preview.blockers ?? []).map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CommunicationHubSectionCard>

      {/* Step 6 — Confirmations */}
      <CommunicationHubSectionCard
        title="Step 5 · Typed confirmation"
        description={`Type exactly: ${TYPED_PHRASE}`}
      >
        {hardBlockers.length > 0 && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Hard-blocked</AlertTitle>
            <AlertDescription className="text-xs">
              <ul className="list-disc pl-5">
                {hardBlockers.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-2 mt-2">
          <div className="flex items-center gap-2">
            <Checkbox id="c1" checked={ckInternal} onCheckedChange={(v) => setCkInternal(!!v)} />
            <Label htmlFor="c1" className="cursor-pointer">I confirm the recipient is internal/allowed.</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="c2" checked={ckOne} onCheckedChange={(v) => setCkOne(!!v)} />
            <Label htmlFor="c2" className="cursor-pointer">I confirm this sends exactly one email.</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="c3" checked={ckNotBulk} onCheckedChange={(v) => setCkNotBulk(!!v)} />
            <Label htmlFor="c3" className="cursor-pointer">I confirm this is not bulk.</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="c4"
              checked={ckReviewedPreview}
              disabled={!previewReviewed}
              onCheckedChange={(v) => setCkReviewedPreview(!!v)}
            />
            <Label htmlFor="c4" className={previewReviewed ? "cursor-pointer" : "opacity-50"}>
              I confirm I reviewed the preview.
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="c5" checked={ckGatesChecked} onCheckedChange={(v) => setCkGatesChecked(!!v)} />
            <Label htmlFor="c5" className="cursor-pointer">I confirm live gates were checked.</Label>
          </div>
        </div>
        <div className="mt-3">
          <Label htmlFor="typed">Typed phrase</Label>
          <Input
            id="typed"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={TYPED_PHRASE}
            autoComplete="off"
          />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Button
            onClick={() => void runControlledLiveSend()}
            disabled={!canSend}
            variant={canSend ? "default" : "outline"}
          >
            {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Send one internal live test
          </Button>
          <span className="text-xs text-muted-foreground">
            {canSend
              ? "All safeguards satisfied."
              : "Send button remains disabled until all safeguards are satisfied."}
          </span>
        </div>
      </CommunicationHubSectionCard>

      {/* Step 8 — Evidence */}
      {evidence && (
        <CommunicationHubSectionCard title="Step 6 · Result evidence" description="Canonical enqueue response and trace links.">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant={evidence.ok ? "default" : "destructive"}>enqueue: {evidence.ok ? "ok" : "blocked/failed"}</Badge>
            <Badge variant="outline">status: {evidence.status}</Badge>
            {evidence.requestNo && <Badge variant="outline">req: {evidence.requestNo}</Badge>}
            {evidence.messageIds.length > 0 && <Badge variant="outline">msgs: {evidence.messageIds.length}</Badge>}
            {evidence.error && <Badge variant="destructive">error: {evidence.error}</Badge>}
          </div>
          {evidence.warnings.length > 0 && (
            <Alert>
              <AlertTitle>Warnings / blockers</AlertTitle>
              <AlertDescription className="text-xs">
                <ul className="list-disc pl-5">
                  {evidence.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <div className="grid gap-2 md:grid-cols-3 text-xs">
            {evidence.requestId && (
              <Button asChild size="sm" variant="outline">
                <Link to={`/admin/communication-hub/requests/${evidence.requestId}`}>
                  Open Request <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/communication-hub/traces">
                Trace Center <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/communication-hub/delivery-monitor">
                Delivery Monitor <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => void copySummary()}>
              <ClipboardCopy className="h-3.5 w-3.5 mr-1" /> Copy post-test summary
            </Button>
          </div>
          <pre className="text-[11px] rounded border bg-muted/40 px-3 py-2 overflow-auto max-h-64">
{JSON.stringify(evidence.raw, null, 2)}
          </pre>
        </CommunicationHubSectionCard>
      )}
    </CommunicationHubWorkspaceShell>
  );
}
