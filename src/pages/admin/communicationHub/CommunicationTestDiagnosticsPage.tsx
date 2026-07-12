/**
 * EPIC CH-ORCH-0 + CH-TEST-1 — Communication Test & Diagnostics.
 * Route: /admin/communication-hub/test-diagnostics
 *
 * This is the final Test & Diagnostics screen. It does NOT bypass any gate.
 * All paths flow through the canonical send spine:
 *
 *   UI → sendCommunication() façade
 *      → comm-hub-enqueue (edge)
 *      → public.send_communication_v1 (RPC, SECURITY DEFINER)
 *      → comm-hub-dispatch (async / target-mode)
 *
 * Modes:
 *   - VALIDATE_ONLY        → preflight-only via comm-hub-event-pilot preflight
 *                            (no request/message row created).
 *   - RENDER_PREVIEW       → render_comm_hub_template_preview RPC.
 *                            Pure resolver, does not create request/message.
 *   - DRY_RUN              → sendCommunication({ testMode: true }) — creates
 *                            a request + queued message with test_mode=true.
 *                            Dispatcher stubs the provider ("dry-run:").
 *   - QUEUE_TEST           → same as DRY_RUN, but does not trigger a manual
 *                            dispatch — used to prove enqueue + gates only.
 *   - CONTROLLED_LIVE_E2E  → sendCommunication({ testMode: false }) — real
 *                            send. Server-side send policy, review policy,
 *                            recipient allowlist and live gate MUST allow.
 *                            Requires explicit toggle + typed confirmation.
 *
 * Never bypasses:
 *   - send policy (communication_hub_event_send_policy)
 *   - review policy (communication_hub_event_review_policy)
 *   - Recipient Control Center allowlist
 *   - Event Live Control (dry_run_only vs live_manual_only)
 *   - Sender profile enabled/verified checks
 *
 * Never enables cron. Never enables bulk. Never accepts uncontrolled
 * external recipients — the manual recipient goes through the same
 * server-side allowlist check as any live send.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CommunicationHubWorkspaceShell, {
  CommunicationHubSectionCard,
} from "./components/CommunicationHubWorkspaceShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2, ShieldCheck, Info, AlertTriangle, Send, PlayCircle, Eye, CheckCircle2,
  ExternalLink, ListChecks, MailCheck, RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import { sendCommunication } from "@/platform/communication-hub/sendCommunication";
import { renderCommHubTemplatePreview, type CommHubPreviewResult } from "./preview/commHubPreviewService";
import { BlockersList } from "./safety/BlockersList";
import {
  validateBusinessCommunication,
  type ValidateResult,
  type RecipientMode,
} from "./testDiagnostics/validateBusinessCommunication";
import { ReadinessCards } from "./testDiagnostics/ReadinessCards";



// --- Types ------------------------------------------------------------------

type Mode = "VALIDATE_ONLY" | "RENDER_PREVIEW" | "DRY_RUN" | "QUEUE_TEST" | "CONTROLLED_LIVE_E2E";

interface MappedEvent {
  moduleCode: string;
  eventCode: string;
  eventName: string;
  templateCode: string;
  channel: string;
  riskLevel: string | null;
  liveStatus: string | null;
  templateActive: boolean;
  templateVersionNo: number | null;
  requiredTokens: string[];
  sourceScreens: string[];
  entityType: string | null;
}

interface SenderProfileLite {
  id: string;
  from_email: string;
  from_display_name: string | null;
  is_enabled: boolean;
  is_verified: boolean;
}

const TYPED_LIVE_CONFIRMATION = "SEND CONTROLLED LIVE COMMUNICATION";
const DEFAULT_ALLOWLIST_HINT = "rohit@mishainfotech.com";

// --- Component --------------------------------------------------------------

export default function CommunicationTestDiagnosticsPage() {
  const [events, setEvents] = useState<MappedEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [sourceScreen, setSourceScreen] = useState<string>("");
  const [entityType, setEntityType] = useState<string>("");
  const [entityId, setEntityId] = useState<string>("");
  const [referenceNo, setReferenceNo] = useState<string>("");
  const [recipientEmail, setRecipientEmail] = useState<string>(DEFAULT_ALLOWLIST_HINT);
  const [recipientName, setRecipientName] = useState<string>("Rohit Wadhwa");
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("manual");
  const [tokensJson, setTokensJson] = useState<string>("{\n  \"recipient_name\": \"Rohit Wadhwa\"\n}");
  const [mode, setMode] = useState<Mode>("VALIDATE_ONLY");
  const [liveToggle, setLiveToggle] = useState(false);
  const [liveTyped, setLiveTyped] = useState("");
  const [reason, setReason] = useState("Communication Hub Test & Diagnostics");
  const [busy, setBusy] = useState(false);

  const [validateResult, setValidateResult] = useState<ValidateResult | null>(null);
  const [previewResult, setPreviewResult] = useState<CommHubPreviewResult | null>(null);
  const [sendResult, setSendResult] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [traceSteps, setTraceSteps] = useState<any[]>([]);
  const [traceRow, setTraceRow] = useState<any>(null);
  const [traceId, setTraceId] = useState<string | null>(null);
  const [senderProfile, setSenderProfile] = useState<SenderProfileLite | null>(null);


  const currentEvent = useMemo<MappedEvent | null>(
    () => events.find((e) => `${e.moduleCode}:${e.eventCode}` === selectedKey) ?? null,
    [events, selectedKey],
  );

  // --- Data loading -----------------------------------------------------

  async function loadEvents() {
    setLoadingEvents(true);
    try {
      const [mapRes, liveRes, regRes] = await Promise.all([
        (supabase as any).from("communication_hub_event_template_map")
          .select("module_code, event_code, channel, template_code, active, risk_level")
          .eq("active", true).eq("channel", "email"),
        (supabase as any).from("communication_hub_event_live_control")
          .select("module_code, event_code, status, risk_level"),
        (supabase as any).from("communication_hub_module_event_registry")
          .select("module_code, event_code, event_name, required_tokens, source_screens, entity_type"),
      ]);
      const mappings = (mapRes.data ?? []) as any[];
      const tplCodes = Array.from(new Set(mappings.map((m) => m.template_code)));
      const tplByCode: Record<string, { active: boolean; versionNo: number | null }> = {};
      if (tplCodes.length) {
        const { data: tpls } = await (supabase as any).from("core_template")
          .select("code, is_active, active_version_id").in("code", tplCodes);
        const versionIds = (tpls ?? []).map((t: any) => t.active_version_id).filter(Boolean);
        const versionMap: Record<string, number> = {};
        if (versionIds.length) {
          const { data: vers } = await (supabase as any).from("core_template_version")
            .select("id, version_no").in("id", versionIds);
          for (const v of vers ?? []) versionMap[v.id] = v.version_no;
        }
        for (const t of (tpls ?? []) as any[]) {
          tplByCode[t.code] = {
            active: !!t.is_active && !!t.active_version_id,
            versionNo: t.active_version_id ? versionMap[t.active_version_id] ?? null : null,
          };
        }
      }
      const liveByKey: Record<string, { status: string; risk: string | null }> = {};
      for (const l of (liveRes.data ?? []) as any[])
        liveByKey[`${l.module_code}:${l.event_code}`] = { status: l.status, risk: l.risk_level ?? null };
      const regByKey: Record<string, {
        name: string | null; tokens: string[]; sourceScreens: string[]; entityType: string | null;
      }> = {};
      for (const r of (regRes.data ?? []) as any[]) {
        regByKey[`${r.module_code}:${r.event_code}`] = {
          name: r.event_name ?? null,
          tokens: Array.isArray(r.required_tokens) ? r.required_tokens : [],
          sourceScreens: Array.isArray(r.source_screens) ? r.source_screens : [],
          entityType: r.entity_type ?? null,
        };
      }
      const merged: MappedEvent[] = mappings.map((m) => {
        const key = `${m.module_code}:${m.event_code}`;
        const reg = regByKey[key];
        const tpl = tplByCode[m.template_code];
        const live = liveByKey[key];
        return {
          moduleCode: m.module_code,
          eventCode: m.event_code,
          eventName: reg?.name ?? m.event_code,
          templateCode: m.template_code,
          channel: m.channel,
          riskLevel: (m.risk_level ?? live?.risk ?? "low"),
          liveStatus: live?.status ?? null,
          templateActive: tpl?.active ?? false,
          templateVersionNo: tpl?.versionNo ?? null,
          requiredTokens: reg?.tokens ?? [],
          sourceScreens: reg?.sourceScreens ?? [],
          entityType: reg?.entityType ?? null,
        };
      });
      merged.sort((a, b) => `${a.moduleCode}:${a.eventCode}`.localeCompare(`${b.moduleCode}:${b.eventCode}`));
      setEvents(merged);
      if (!selectedKey && merged.length) setSelectedKey(`${merged[0].moduleCode}:${merged[0].eventCode}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load events");
    } finally {
      setLoadingEvents(false);
    }
  }

  useEffect(() => { void loadEvents(); /* eslint-disable-next-line */ }, []);

  // When event changes, refresh dependent fields
  useEffect(() => {
    if (!currentEvent) return;
    setEntityType(currentEvent.entityType ?? "");
    setSourceScreen(currentEvent.sourceScreens[0] ?? "");
    // Refresh tokens JSON with reasonable defaults
    const defaults: Record<string, string> = { recipient_name: recipientName || "Rohit Wadhwa" };
    for (const tk of currentEvent.requiredTokens) {
      if (["request_no", "generated_at", "module_code", "event_code", "request_id"].includes(tk)) continue;
      if (!(tk in defaults)) defaults[tk] = `sample_${tk}`;
    }
    setTokensJson(JSON.stringify(defaults, null, 2));
    setValidateResult(null); setPreviewResult(null); setSendResult(null);
    setTimeline([]); setTraceId(null); setSenderProfile(null);
    // eslint-disable-next-line
  }, [selectedKey]);

  function parsedTokens(): Record<string, string> | null {
    try {
      const raw = JSON.parse(tokensJson);
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw)) out[k] = String(v ?? "");
      return out;
    } catch { return null; }
  }

  // --- Actions ---------------------------------------------------------

  async function runValidateOnly() {
    if (!currentEvent) return;
    const tokens = parsedTokens();
    if (!tokens) { toast.error("Tokens JSON is invalid."); return; }
    setBusy(true); setValidateResult(null);
    try {
      const result = await validateBusinessCommunication({
        moduleCode: currentEvent.moduleCode,
        eventCode: currentEvent.eventCode,
        channel: "email",
        entityType: entityType || null,
        entityId: entityId || null,
        referenceNo: referenceNo || null,
        recipientMode,
        recipientEmail: recipientEmail.trim(),
        tokens,
        mode,
      });
      setValidateResult(result);
      if (result.ready) toast.success("Validation passed — no blockers.");
      else toast.message(`${result.blockers.length} blocker(s) reported.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Validation failed");
    } finally { setBusy(false); }
  }


  async function runRenderPreview() {
    if (!currentEvent) return;
    const tokens = parsedTokens();
    if (!tokens) { toast.error("Tokens JSON is invalid."); return; }
    setBusy(true); setPreviewResult(null); setSenderProfile(null);
    try {
      const res = await renderCommHubTemplatePreview({
        module_code: currentEvent.moduleCode,
        event_code: currentEvent.eventCode,
        channel: "email",
        recipient_email: recipientEmail.trim(),
        recipient_name: recipientName.trim(),
        entity_type: entityType || null,
        entity_id: entityId || null,
        reference_no: referenceNo || null,
        tokens,
      });
      setPreviewResult(res);
      if (res.sender_profile_id) {
        setSenderProfile({
          id: res.sender_profile_id,
          from_email: res.from_email ?? "",
          from_display_name: res.from_display_name ?? null,
          is_enabled: !!res.sender_enabled,
          is_verified: !!res.sender_verified,
        });
      }
      if (res.ok && (res.blockers ?? []).length === 0) toast.success("Preview rendered.");
      else toast.message(`Preview returned ${(res.blockers ?? []).length} blocker(s).`);
    } catch (e: any) {
      toast.error(e?.message ?? "Preview failed");
    } finally { setBusy(false); }
  }

  async function runSend(kind: "DRY_RUN" | "QUEUE_TEST" | "CONTROLLED_LIVE_E2E") {
    if (!currentEvent) return;
    const tokens = parsedTokens();
    if (!tokens) { toast.error("Tokens JSON is invalid."); return; }
    if (recipientMode !== "manual") {
      toast.error("Only the manual recipient mode is currently enabled from this screen.");
      return;
    }
    if (kind === "CONTROLLED_LIVE_E2E") {
      if (!liveToggle) { toast.error("Enable the controlled end-to-end toggle."); return; }
      if (liveTyped !== TYPED_LIVE_CONFIRMATION) {
        toast.error(`Type exactly: ${TYPED_LIVE_CONFIRMATION}`); return;
      }
      if (!reason.trim() || reason.trim().length < 8) {
        toast.error("Reason is required for a controlled live send (min 8 chars).");
        return;
      }
      const email = recipientEmail.trim();
      if (!email || email.split(",").length > 1) {
        toast.error("Controlled live send is limited to a single allowlisted recipient.");
        return;
      }
    }
    setBusy(true); setSendResult(null); setTimeline([]); setTraceSteps([]); setTraceRow(null); setTraceId(null);

    try {
      const idempotencyKey = `test-diag-${currentEvent.moduleCode}-${currentEvent.eventCode}-${crypto.randomUUID()}`;
      const res = await sendCommunication({
        moduleCode: currentEvent.moduleCode,
        eventCode: currentEvent.eventCode,
        channels: ["EMAIL"],
        recipient: {
          type: "ADMIN_USER",
          email: recipientEmail.trim(),
          name: recipientName.trim(),
          role: "to",
        },
        data: { ...tokens, __source_screen: sourceScreen || null, __test_reason: reason },
        reference: {
          entityType: entityType || null,
          entityId: entityId || null,
          referenceNo: referenceNo || null,
        },
        idempotencyKey,
        testMode: kind !== "CONTROLLED_LIVE_E2E",
        metadata: {
          diagnostics_mode: kind,
          initiated_from: "communication_test_diagnostics",
          recipient_mode: recipientMode,
        },
      });
      setSendResult({ kind, ...res });
      if (!res.ok) {
        toast.error(`${kind} failed: ${res.error ?? res.warnings?.[0] ?? "gate blocked"}`);
      } else {
        toast.success(`${kind} — request ${res.requestNo ?? res.requestId}`);
        if (res.requestId) await loadTimelineForRequest(res.requestId);
      }
    } catch (e: any) {
      toast.error(e?.message ?? `${kind} threw`);
      setSendResult({ kind, ok: false, error: e?.message });
    } finally { setBusy(false); }
  }

  async function loadTimelineForRequest(requestId: string) {
    try {
      const [evRes, traceRes] = await Promise.all([
        (supabase as any).from("communication_event_log")
          .select("id, stage, occurred_at, payload, actor_user_id")
          .eq("request_id", requestId).order("occurred_at", { ascending: true }),
        (supabase as any).from("communication_hub_trace")
          .select("id, trace_no, current_stage, blocked_stage, status, request_id, request_no, message_id")
          .eq("request_id", requestId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setTimeline((evRes.data ?? []) as any[]);
      if (traceRes.data?.id) {
        setTraceId(traceRes.data.id);
        setTraceRow(traceRes.data);
        const { data: steps } = await (supabase as any).from("communication_hub_trace_step")
          .select("stage_code, stage_name, status, occurred_at, blocker_codes, plain_summary")
          .eq("trace_id", traceRes.data.id).order("occurred_at", { ascending: true });
        setTraceSteps((steps ?? []) as any[]);
      }
    } catch (e: any) {
      // non-fatal
      console.warn("timeline load failed", e);
    }
  }


  // --- Render ----------------------------------------------------------

  const gateBanner =
    currentEvent && currentEvent.liveStatus && currentEvent.liveStatus !== "dry_run_only" ? (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Live control: {currentEvent.liveStatus}</AlertTitle>
        <AlertDescription>
          Server enforces the send policy, review policy, allowlist and sender-verification checks
          regardless of the mode selected here.
        </AlertDescription>
      </Alert>
    ) : null;

  return (
    <CommunicationHubWorkspaceShell
      title="Communication Test & Diagnostics"
      purpose="Final canonical Test & Diagnostics — same path every business module will use."
      risk="action-capable"
      quickLinks={[
        { label: "Trace Center", href: "/admin/communication-hub/traces" },
        { label: "Recipient Control Center", href: "/admin/communication-hub/recipient-control" },
        { label: "Event → Template Mapping", href: "/admin/communication-hub/design" },
        { label: "Governance & Live Control", href: "/admin/communication-hub/governance" },
        { label: "Safety Switchboard", href: "/admin/communication-hub/safety" },
      ]}
    >
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Canonical send path</AlertTitle>
        <AlertDescription>
          Every action here calls the same façade every module uses:
          <code className="ml-1">sendCommunication → comm-hub-enqueue → send_communication_v1 → comm-hub-dispatch</code>.
          Send policy, review policy, recipient allowlist and event live control are enforced server-side.
        </AlertDescription>
      </Alert>

      <CommunicationHubSectionCard title="1. Select event and reference">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Module &amp; event (active mapped)</Label>
              <Button size="sm" variant="ghost" onClick={() => void loadEvents()} disabled={loadingEvents}>
                <RefreshCcw className="h-3 w-3 mr-1" />Refresh
              </Button>
            </div>
            <Select value={selectedKey} onValueChange={setSelectedKey} disabled={loadingEvents || !events.length}>
              <SelectTrigger><SelectValue placeholder={loadingEvents ? "Loading…" : "Select event"} /></SelectTrigger>
              <SelectContent className="max-h-[400px]">
                {events.map((e) => (
                  <SelectItem key={`${e.moduleCode}:${e.eventCode}`} value={`${e.moduleCode}:${e.eventCode}`}>
                    <span className="font-mono text-[11px]">{e.moduleCode}</span>
                    <span className="mx-1 text-muted-foreground">/</span>
                    <span className="font-mono text-[11px]">{e.eventCode}</span>
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      · {e.riskLevel} · {e.liveStatus ?? "no-ctrl"}
                      {e.templateActive ? ` · v${e.templateVersionNo ?? "?"}` : " · tpl-inactive"}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentEvent && (
              <div className="text-[11px] text-muted-foreground">
                Template: <span className="font-mono">{currentEvent.templateCode}</span> · Channel: {currentEvent.channel}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Source screen / workflow</Label>
            <Select value={sourceScreen} onValueChange={setSourceScreen}>
              <SelectTrigger><SelectValue placeholder="(optional) select source" /></SelectTrigger>
              <SelectContent>
                {(currentEvent?.sourceScreens ?? []).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
                {(currentEvent?.sourceScreens ?? []).length === 0 && (
                  <SelectItem value="__none" disabled>No source screens registered</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Entity type</Label>
            <Input value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="e.g. legal_case" />
          </div>
          <div className="space-y-1.5">
            <Label>Entity ID</Label>
            <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="UUID or business ID" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Reference no.</Label>
            <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="e.g. LG-2026-000123" />
          </div>
        </div>
      </CommunicationHubSectionCard>

      <CommunicationHubSectionCard
        title="2. Sender & recipient"
        description="Sender resolves from the mapped template's sender profile. Recipient must pass the allowlist gate."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Sender (from template)</Label>
            <div className="rounded-md border bg-muted px-3 py-2 text-xs font-mono">
              {senderProfile ? (
                <>
                  {senderProfile.from_display_name ?? "(no display name)"} &lt;{senderProfile.from_email}&gt;
                  <div className="mt-1 flex gap-1">
                    <Badge variant={senderProfile.is_enabled ? "default" : "destructive"} className="text-[10px]">
                      {senderProfile.is_enabled ? "enabled" : "disabled"}
                    </Badge>
                    <Badge variant={senderProfile.is_verified ? "default" : "destructive"} className="text-[10px]">
                      {senderProfile.is_verified ? "verified" : "unverified"}
                    </Badge>
                  </div>
                </>
              ) : (
                <span className="text-muted-foreground">Run &ldquo;Render preview&rdquo; to resolve sender.</span>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Recipient mode</Label>
            <RadioGroup
              value={recipientMode}
              onValueChange={(v) => setRecipientMode(v as RecipientMode)}
              className="space-y-1"
            >
              <label className="flex items-start gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted">
                <RadioGroupItem value="manual" id="rm-manual" className="mt-1" />
                <div>
                  <div className="text-xs font-medium">Manual test recipient</div>
                  <div className="text-[11px] text-muted-foreground">Uses the email below. Must be on the allowlist for a live send.</div>
                </div>
              </label>
              <label className="flex items-start gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted opacity-70">
                <RadioGroupItem value="resolved_business" id="rm-resolved" className="mt-1" />
                <div>
                  <div className="text-xs font-medium">Resolved business recipient</div>
                  <div className="text-[11px] text-muted-foreground">Blocked: recipient resolver not yet wired from this screen (recipient_resolver_missing).</div>
                </div>
              </label>
              <label className="flex items-start gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted opacity-70">
                <RadioGroupItem value="resolved_with_override" id="rm-override" className="mt-1" />
                <div>
                  <div className="text-xs font-medium">Resolved recipient with override approval</div>
                  <div className="text-[11px] text-muted-foreground">Blocked: override policy not configured (recipient_override_policy_missing).</div>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label>Manual test recipient (email)</Label>
            <Input value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Recipient display name</Label>
            <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
          </div>
        </div>
      </CommunicationHubSectionCard>

      <CommunicationHubSectionCard title="3. Tokens">
        <div className="space-y-1.5">
          <Label>
            Tokens (JSON) — required: {(currentEvent?.requiredTokens ?? []).join(", ") || "—"}
          </Label>
          <Textarea rows={7} value={tokensJson} onChange={(e) => setTokensJson(e.target.value)} className="font-mono text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label>Reason (audit)</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </CommunicationHubSectionCard>

      <CommunicationHubSectionCard
        title="4. Run mode"
        description="Every mode passes the same server-side gates. Live send additionally requires the toggle + typed confirmation."
      >
        {gateBanner}
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="grid gap-2 md:grid-cols-2">
          {[
            { v: "VALIDATE_ONLY",       t: "Validate only (preflight)",         d: "No rows written. Checks mapping, template, tokens, gates." },
            { v: "RENDER_PREVIEW",      t: "Render preview",                    d: "Resolves template + sender, shows subject/body. No enqueue." },
            { v: "DRY_RUN",             t: "Dry-run (test_mode=true)",          d: "Creates request + queued message, dispatcher stubs provider." },
            { v: "QUEUE_TEST",          t: "Queue test",                        d: "Enqueue only. Same as dry-run — proves gates + enqueue." },
            { v: "CONTROLLED_LIVE_E2E", t: "Controlled end-to-end (LIVE)",      d: "Real send. Server gates must all allow. Explicit typed confirmation required." },
          ].map((o) => (
            <label key={o.v} className="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted">
              <RadioGroupItem value={o.v} id={`mode-${o.v}`} className="mt-1" />
              <div>
                <div className="text-sm font-medium">{o.t}</div>
                <div className="text-xs text-muted-foreground">{o.d}</div>
              </div>
            </label>
          ))}
        </RadioGroup>

        {mode === "CONTROLLED_LIVE_E2E" && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Controlled live send</AlertTitle>
            <AlertDescription className="space-y-2">
              <div>Server-side allowlist, live control, send policy, review policy and sender verification must all allow. This will attempt a real provider send.</div>
              <label className="flex items-center gap-2">
                <Checkbox checked={liveToggle} onCheckedChange={(v) => setLiveToggle(!!v)} />
                <span className="text-sm">I understand and want to attempt a real send.</span>
              </label>
              <div>
                <Label className="text-xs">Type exactly: <code>{TYPED_LIVE_CONFIRMATION}</code></Label>
                <Input value={liveTyped} onChange={(e) => setLiveTyped(e.target.value)} className="mt-1" />
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              if (mode === "VALIDATE_ONLY") return void runValidateOnly();
              if (mode === "RENDER_PREVIEW") return void runRenderPreview();
              if (mode === "CONTROLLED_LIVE_E2E") return void runSend("CONTROLLED_LIVE_E2E");
              return void runSend(mode as "DRY_RUN" | "QUEUE_TEST");
            }}
            disabled={busy || !currentEvent}
          >
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {mode === "VALIDATE_ONLY" && (<><ListChecks className="h-4 w-4 mr-1" /> Run validation</>)}
            {mode === "RENDER_PREVIEW" && (<><Eye className="h-4 w-4 mr-1" /> Render preview</>)}
            {mode === "DRY_RUN" && (<><PlayCircle className="h-4 w-4 mr-1" /> Run dry-run</>)}
            {mode === "QUEUE_TEST" && (<><MailCheck className="h-4 w-4 mr-1" /> Enqueue test</>)}
            {mode === "CONTROLLED_LIVE_E2E" && (<><Send className="h-4 w-4 mr-1" /> Controlled live send</>)}
          </Button>
        </div>
      </CommunicationHubSectionCard>

      {(validateResult || previewResult || sendResult) && (
        <CommunicationHubSectionCard title="5. Result">
          {validateResult && mode === "VALIDATE_ONLY" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {validateResult.ready
                  ? <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Ready</Badge>
                  : <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Blocked</Badge>}
                <span className="text-xs text-muted-foreground">Preflight response</span>
              </div>
              <BlockersList codes={validateResult.blockers ?? []} />
              {(validateResult.warnings ?? []).length > 0 && (
                <div className="text-xs text-muted-foreground">Warnings: {(validateResult.warnings as string[]).join(", ")}</div>
              )}
            </div>
          )}

          {previewResult && mode === "RENDER_PREVIEW" && (
            <div className="space-y-3">
              {(previewResult.blockers ?? []).length > 0 && (
                <BlockersList codes={previewResult.blockers} />
              )}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs">Subject</Label>
                  <div className="rounded-md border bg-muted px-3 py-2 text-sm">{previewResult.subject_preview ?? "—"}</div>
                </div>
                <div>
                  <Label className="text-xs">Template</Label>
                  <div className="rounded-md border bg-muted px-3 py-2 text-xs font-mono">
                    {previewResult.resolved_template_code ?? "—"} v{previewResult.version_no ?? "?"} ({previewResult.version_status ?? "?"})
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs">HTML preview</Label>
                <div
                  className="rounded-md border bg-white text-black p-3 max-h-[400px] overflow-auto text-sm"
                  dangerouslySetInnerHTML={{ __html: previewResult.html_preview ?? "" }}
                />
              </div>
              {(previewResult.unresolved_tokens ?? []).length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Unresolved tokens</AlertTitle>
                  <AlertDescription>{(previewResult.unresolved_tokens ?? []).join(", ")}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {sendResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {sendResult.ok
                  ? <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> {sendResult.status ?? "queued"}</Badge>
                  : <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> {sendResult.error ?? "failed"}</Badge>}
                <span className="text-xs text-muted-foreground">Mode: {sendResult.kind}</span>
                {sendResult.requestNo && (
                  <Badge variant="outline" className="font-mono text-[10px]">{sendResult.requestNo}</Badge>
                )}
              </div>
              {(sendResult.warnings ?? []).length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Warnings: {(sendResult.warnings as string[]).join(" · ")}
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label className="text-xs">Request</Label>
                  <div className="rounded-md border bg-muted px-3 py-2 text-xs font-mono break-all">
                    {sendResult.requestId ?? "—"}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Messages</Label>
                  <div className="rounded-md border bg-muted px-3 py-2 text-xs font-mono break-all">
                    {(sendResult.messageIds ?? []).join(", ") || "—"}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Provider outcome</Label>
                  <div className="rounded-md border bg-muted px-3 py-2 text-xs">
                    {sendResult.kind === "CONTROLLED_LIVE_E2E"
                      ? "Real provider dispatch (async)"
                      : "Stubbed (dry-run:) — see Trace Center for full timeline"}
                  </div>
                </div>
              </div>

              {timeline.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Gate timeline (communication_event_log)</Label>
                  <div className="rounded-md border divide-y">
                    {timeline.map((t) => (
                      <div key={t.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="font-mono">{t.stage}</span>
                        <span className="text-muted-foreground">{new Date(t.occurred_at).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {sendResult.requestId && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/admin/communication-hub/requests/${sendResult.requestId}`}>
                      Open request <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                )}
                {traceId && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/admin/communication-hub/traces/${traceId}`}>
                      Open in Trace Center <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                )}
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin/communication-hub/traces">
                    All traces <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CommunicationHubSectionCard>
      )}
    </CommunicationHubWorkspaceShell>
  );
}
