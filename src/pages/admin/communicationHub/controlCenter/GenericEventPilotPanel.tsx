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
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PILOT_EVENT_CATALOGUE, type PilotEvent } from "./pilotEventCatalogue";

const LOCKED_RECIPIENT = "rohit@mishainfotech.com";
const TYPED_CONFIRMATION = "SEND GENERIC EVENT DRY RUN";
const SERVER_PROVIDED = new Set(["request_no", "request_id", "generated_at", "module_code", "event_code"]);

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
  const [selectedKey, setSelectedKey] = useState<string>(
    `${PILOT_EVENT_CATALOGUE[1].moduleCode}:${PILOT_EVENT_CATALOGUE[1].eventCode}`,
  );
  const evt = useMemo(() => {
    return PILOT_EVENT_CATALOGUE.find(
      e => `${e.moduleCode}:${e.eventCode}` === selectedKey,
    ) ?? PILOT_EVENT_CATALOGUE[0];
  }, [selectedKey]);

  const [recipientName, setRecipientName] = useState("Rohit Wadhwa");
  const [tokensJson, setTokensJson] = useState<string>(() =>
    JSON.stringify(defaultTokensFor(evt, "Rohit Wadhwa"), null, 2),
  );
  const [reason, setReason] = useState("First business-module Communication Hub dry-run onboarding.");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [preflighting, setPreflighting] = useState(false);
  const [preflight, setPreflight] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  function onEventChange(key: string) {
    setSelectedKey(key);
    const e = PILOT_EVENT_CATALOGUE.find(x => `${x.moduleCode}:${x.eventCode}` === key);
    if (e) setTokensJson(JSON.stringify(defaultTokensFor(e, recipientName), null, 2));
    setPreflight(null); setResult(null);
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
            <Label>Event</Label>
            <Select value={selectedKey} onValueChange={onEventChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PILOT_EVENT_CATALOGUE.map(e => (
                  <SelectItem key={`${e.moduleCode}:${e.eventCode}`} value={`${e.moduleCode}:${e.eventCode}`}>
                    {e.moduleCode} / {e.eventCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-[11px] text-muted-foreground">{evt.description}</div>
          </div>
          <div className="space-y-1.5">
            <Label>Template (locked)</Label>
            <div className="rounded-md border bg-muted px-3 py-2 text-xs font-mono">{evt.templateCode}</div>
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
