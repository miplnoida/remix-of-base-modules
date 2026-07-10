/**
 * Generic Event Pilot panel (EPIC 2A).
 *
 * Dry-run only for now. Path:
 *   UI → comm-hub-event-pilot → send_communication_v1 (testMode=true)
 *      → comm-hub-dispatch (targetMode)
 *
 * Recipient is locked to rohit@mishainfotech.com in this phase.
 * No live-mode UI is exposed and no external customer/employer/claimant recipient
 * is permitted server-side either.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2, ShieldCheck, Info, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PILOT_EVENT_CATALOGUE, type PilotEvent } from "./pilotEventCatalogue";

const LOCKED_RECIPIENT = "rohit@mishainfotech.com";
const TYPED_CONFIRMATION = "SEND GENERIC EVENT DRY RUN";
const SERVER_PROVIDED = new Set(["request_no", "request_id", "generated_at", "module_code", "event_code"]);

/**
 * EPIC 4A-UX-IA-2 Part F — event source is now active rows in
 * `communication_hub_event_template_map` joined with live-control + registry.
 * Falls back to PILOT_EVENT_CATALOGUE metadata (tokens/description) when a
 * mapping row does not have registry data.
 */
interface HubMappedEvent extends PilotEvent {
  templateActive: boolean;
  templateVersionNo: number | null;
  liveStatus: string | null;
  riskDb: string | null;
  eventName: string;
  registered: boolean;
}

function defaultTokensFor(evt: PilotEvent, recipientName: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of evt.requiredTokens) {
    if (SERVER_PROVIDED.has(k)) continue;
    if (k === "recipient_name") out[k] = recipientName || "Rohit Wadhwa";
    else if (k === "employer_name") out[k] = "Demo Employer Ltd";
    else if (k === "reference_no") out[k] = "ER-DRYRUN-001";
    else out[k] = `sample_${k}`;
  }
  return out;
}

export function GenericEventPilotPanel() {
  const [events, setEvents] = useState<HubMappedEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string>("");

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
          .select("module_code, event_code, event_name, required_tokens"),
      ]);
      const mappings = (mapRes.data ?? []) as any[];

      // Template state lookup
      const tplCodes = Array.from(new Set(mappings.map(m => m.template_code)));
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
      for (const l of (liveRes.data ?? []) as any[]) {
        liveByKey[`${l.module_code}:${l.event_code}`] = { status: l.status, risk: l.risk_level ?? null };
      }
      const regByKey: Record<string, { name: string | null; tokens: string[] }> = {};
      for (const r of (regRes.data ?? []) as any[]) {
        regByKey[`${r.module_code}:${r.event_code}`] = {
          name: r.event_name ?? null,
          tokens: Array.isArray(r.required_tokens) ? r.required_tokens : [],
        };
      }

      const merged: HubMappedEvent[] = mappings.map(m => {
        const key = `${m.module_code}:${m.event_code}`;
        const fromCat = PILOT_EVENT_CATALOGUE.find(e => `${e.moduleCode}:${e.eventCode}` === key);
        const reg = regByKey[key];
        const tokens = fromCat?.requiredTokens ?? reg?.tokens ?? ["recipient_name", "request_no", "generated_at"];
        const tpl = tplByCode[m.template_code];
        const live = liveByKey[key];
        return {
          moduleCode: m.module_code,
          eventCode: m.event_code,
          eventName: reg?.name ?? fromCat?.eventName ?? m.event_code,
          defaultChannels: ["EMAIL"],
          defaultRecipient: "ADMIN_USER",
          risk: (m.risk_level ?? live?.risk ?? fromCat?.risk ?? "low") as PilotEvent["risk"],
          templateCode: m.template_code,
          description: fromCat?.description ?? "Active event/template mapping (dry-run only in this phase).",
          requiredTokens: tokens,
          templateActive: tpl?.active ?? false,
          templateVersionNo: tpl?.versionNo ?? null,
          liveStatus: live?.status ?? null,
          riskDb: live?.risk ?? null,
          registered: !!reg,
        };
      });

      // Prefer low-risk / dry_run_only events at the top
      merged.sort((a, b) => {
        const ra = a.risk === "low" ? 0 : 1;
        const rb = b.risk === "low" ? 0 : 1;
        if (ra !== rb) return ra - rb;
        return `${a.moduleCode}:${a.eventCode}`.localeCompare(`${b.moduleCode}:${b.eventCode}`);
      });

      setEvents(merged);
      if (merged.length && !selectedKey) {
        const first = merged.find(e => e.risk === "low" && e.liveStatus === "dry_run_only") ?? merged[0];
        setSelectedKey(`${first.moduleCode}:${first.eventCode}`);
      }
    } finally { setLoadingEvents(false); }
  }

  useEffect(() => { void loadEvents(); /* eslint-disable-next-line */ }, []);

  const evt = useMemo(() => {
    return events.find(e => `${e.moduleCode}:${e.eventCode}` === selectedKey)
      ?? events[0]
      ?? { ...PILOT_EVENT_CATALOGUE[0], templateActive: false, templateVersionNo: null, liveStatus: null, riskDb: null, registered: false };
  }, [selectedKey, events]);

  const [recipientName, setRecipientName] = useState("Rohit Wadhwa");
  const [tokensJson, setTokensJson] = useState<string>(() =>
    JSON.stringify(defaultTokensFor(PILOT_EVENT_CATALOGUE[0], "Rohit Wadhwa"), null, 2),
  );
  const [reason, setReason] = useState("First business-module Communication Hub dry-run onboarding.");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [preflighting, setPreflighting] = useState(false);
  const [preflight, setPreflight] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  // Refresh tokens when event changes
  useEffect(() => {
    if (evt && evt.moduleCode) {
      setTokensJson(JSON.stringify(defaultTokensFor(evt, recipientName), null, 2));
      setPreflight(null); setResult(null);
    }
    // eslint-disable-next-line
  }, [selectedKey]);

  function onEventChange(key: string) {
    setSelectedKey(key);
  }

  function parsedTokens(): Record<string, string> | null {
    try {
      const raw = JSON.parse(tokensJson);
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw)) out[k] = String(v ?? "");
      return out;
    } catch { return null; }
  }

  async function runPreflight() {
    const tokens = parsedTokens();
    if (!tokens) { toast.error("Tokens JSON is not valid."); return; }
    setPreflighting(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke("comm-hub-event-pilot", {
        body: {
          action: "preflight",
          moduleCode: evt.moduleCode,
          eventCode: evt.eventCode,
          templateCode: evt.templateCode,
          recipientEmail: LOCKED_RECIPIENT,
          recipientName: recipientName.trim(),
          tokens,
        },
      });
      if (error) { toast.error(`Preflight failed: ${(error as any)?.message ?? "unknown"}`); return; }
      setPreflight(data);
      if (data?.ready) toast.success("Preflight ready — no blockers.");
      else toast.message(`Preflight has ${data?.blockers?.length ?? 0} blocker(s).`);
    } finally { setPreflighting(false); }
  }

  async function submitDryRun() {
    const tokens = parsedTokens();
    if (!tokens) { toast.error("Tokens JSON is not valid."); return; }
    if (typed !== TYPED_CONFIRMATION) {
      toast.error(`Typed confirmation must equal: ${TYPED_CONFIRMATION}`); return;
    }
    setBusy(true); setResult(null);
    try {
      const idempotencyKey = `event-pilot-${evt.moduleCode}-${evt.eventCode}-${crypto.randomUUID()}`;
      const { data, error } = await (supabase as any).functions.invoke("comm-hub-event-pilot", {
        body: {
          action: "dry_run",
          moduleCode: evt.moduleCode,
          eventCode: evt.eventCode,
          templateCode: evt.templateCode,
          recipientEmail: LOCKED_RECIPIENT,
          recipientName: recipientName.trim(),
          tokens,
          reason: reason.trim(),
          typedConfirmation: typed,
          idempotencyKey,
        },
      });
      if (error) {
        toast.error(`Dry-run failed: ${(error as any)?.message ?? "unknown"}`);
        setResult({ ok: false, error: (error as any)?.message });
        return;
      }
      setResult(data);
      if (data?.ok) {
        toast.success(`Dry-run enqueued & dispatched (${data.requestNo})`);
        setTyped("");
      } else {
        toast.error(`Dry-run failed: ${data?.error ?? "unknown"}`);
      }
    } finally { setBusy(false); }
  }

  const disp = result?.dispatch?.response ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" /> Generic Event Pilot — dry-run only
        </CardTitle>
        <CardDescription>
          Send a Communication Hub dry-run for any onboarded event through the official
          façade (<code>send_communication_v1</code> → <code>comm-hub-dispatch</code> targetMode).
          Live sends are not exposed here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Phase EPIC-2A — dry-run only</AlertTitle>
          <AlertDescription>
            Recipient is locked to <code>{LOCKED_RECIPIENT}</code>. Server refuses any other recipient
            in this phase. No provider is called; message is created with <code>test_mode=true</code>
            and dispatched via target-mode with a <code>dry-run:</code> provider stub.
          </AlertDescription>
        </Alert>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Event (active mapped)</Label>
              <Button size="sm" variant="ghost" onClick={() => void loadEvents()} disabled={loadingEvents}>
                <RefreshCcw className="h-3 w-3 mr-1" />Refresh
              </Button>
            </div>
            <Select value={selectedKey} onValueChange={onEventChange} disabled={loadingEvents || events.length === 0}>
              <SelectTrigger><SelectValue placeholder={loadingEvents ? "Loading events…" : "Select event"} /></SelectTrigger>
              <SelectContent className="max-h-[400px]">
                {events.map(e => (
                  <SelectItem key={`${e.moduleCode}:${e.eventCode}`} value={`${e.moduleCode}:${e.eventCode}`}>
                    <span className="font-mono text-[11px]">{e.moduleCode}</span>
                    <span className="mx-1 text-muted-foreground">/</span>
                    <span className="font-mono text-[11px]">{e.eventCode}</span>
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      · {e.risk} · {e.liveStatus ?? "no-live-ctrl"}{e.templateActive ? ` · v${e.templateVersionNo ?? "?"}` : " · tpl-inactive"}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-[11px] text-muted-foreground">
              {events.length === 0 && !loadingEvents
                ? "No active mappings found. Add one in Design & Templates."
                : evt.description}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Template (from mapping)</Label>
            <div className="rounded-md border bg-muted px-3 py-2 text-xs font-mono">{evt.templateCode}</div>
            <div className="text-[11px] text-muted-foreground">
              {evt.templateActive ? `Active · v${evt.templateVersionNo ?? "?"}` : "Template inactive or no active version — dry-run may fail preflight."}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Recipient email (locked)</Label>
            <Input value={LOCKED_RECIPIENT} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Recipient name</Label>
            <Input value={recipientName} onChange={e => setRecipientName(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Tokens (JSON) — required: {evt.requiredTokens.filter(k => !SERVER_PROVIDED.has(k)).join(", ")}</Label>
          <Textarea rows={7} value={tokensJson} onChange={e => setTokensJson(e.target.value)}
            className="font-mono text-xs" />
          <div className="text-[11px] text-muted-foreground">
            Server-provided tokens ({Array.from(SERVER_PROVIDED).join(", ")}) are injected automatically.
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Typed confirmation — must equal <code>{TYPED_CONFIRMATION}</code></Label>
            <Input value={typed} onChange={e => setTyped(e.target.value)} placeholder={TYPED_CONFIRMATION} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">module={evt.moduleCode}</Badge>
          <Badge variant="secondary">event={evt.eventCode}</Badge>
          {evt.defaultChannels.map(c => <Badge key={c} variant="outline">channel={c.toLowerCase()}</Badge>)}
          <Badge>testMode=true</Badge>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={runPreflight} disabled={preflighting}>
            {preflighting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Run preflight
          </Button>
          <Button onClick={submitDryRun} disabled={busy || typed !== TYPED_CONFIRMATION || !reason.trim()}>
            <Send className="h-4 w-4 mr-1" />
            Send dry-run
          </Button>
        </div>

        {preflight && (
          <Alert variant={preflight.ready ? "default" : "destructive"}>
            <AlertTitle>Preflight — ready={String(preflight.ready)}</AlertTitle>
            <AlertDescription className="space-y-1 text-xs">
              <div>event_status: <code>{preflight.event_status ?? "—"}</code> · risk: <code>{preflight.event_risk_level ?? "—"}</code></div>
              <div>template: <code>{preflight.template_code ?? "—"}</code> v{preflight.template_version_no ?? "?"}</div>
              <div>required tokens: <code>{(preflight.required_tokens ?? []).join(", ")}</code></div>
              {preflight.blockers?.length ? (
                <div>blockers: <code>{preflight.blockers.join(", ")}</code></div>
              ) : null}
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert variant={result.ok ? "default" : "destructive"}>
            <AlertTitle>{result.ok ? "Dry-run completed" : "Dry-run failed"}</AlertTitle>
            <AlertDescription className="space-y-1 text-xs">
              {result.ok ? (
                <>
                  <div>Path: <code>{result.facadePath}</code></div>
                  <div>Request no: <code>{result.requestNo}</code> · id: <code>{result.requestId}</code></div>
                  <div>Message id: <code>{result.messageId}</code></div>
                  <div>Template: <code>{result.templateCode}</code> v{result.templateVersionNo}</div>
                  <div>
                    Dispatch: status={result.dispatch?.status} · targetMode={String(disp.targetMode)} ·
                    claimed={disp.claimed} · processed={disp.processed} ·
                    sentDryRun={disp.sentDryRun} · sentLive={disp.sentLive}
                  </div>
                  <div>Message: status={result.message?.status} · test_mode={String(result.message?.test_mode)} · provider_message_id=<code>{result.message?.provider_message_id}</code></div>
                  <div>Attempts: {result.attempts?.length ?? 0} · first status={result.attempts?.[0]?.status ?? "—"}</div>
                </>
              ) : (
                <>
                  <div>{result.error ?? "unknown"}</div>
                  {result.blockers?.length ? <div>blockers: {result.blockers.join(", ")}</div> : null}
                </>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
