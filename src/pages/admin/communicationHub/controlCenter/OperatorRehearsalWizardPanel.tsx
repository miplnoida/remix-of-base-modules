/**
 * EPIC 2E — Operator Rehearsal Wizard
 *
 * Admin-only panel that safely exercises the three operator action loops
 * (cancel, retry dry-run + target dispatch, clear stale lock) against
 * synthetic dry-run-only messages. Never sends live email.
 */
import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PILOT_EVENT_CATALOGUE } from "./pilotEventCatalogue";
import { toast } from "sonner";

const CONFIRM_PHRASE = "RUN OPERATOR REHEARSAL";
const ALLOWED_RECIPIENT = "rohit@mishainfotech.com";

type StepKey = "cancel" | "retry" | "clear_lock";

interface RehearsalResponse {
  ok: boolean;
  results?: {
    pass: Partial<Record<StepKey, boolean>>;
    ids: Partial<Record<StepKey, any>>;
    errors: Partial<Record<StepKey, string>>;
  };
  safety?: Record<string, boolean>;
  error?: string;
}

export function OperatorRehearsalWizardPanel() {
  const defaultChoice = useMemo(() => {
    const compliance = PILOT_EVENT_CATALOGUE.find(
      e => e.moduleCode === "COMPLIANCE" && e.eventCode === "INTERNAL_CASE_STATUS_NOTICE",
    );
    return compliance ?? PILOT_EVENT_CATALOGUE[0];
  }, []);
  const [selectedKey, setSelectedKey] = useState<string>(`${defaultChoice.moduleCode}::${defaultChoice.eventCode}`);
  const [reason, setReason] = useState("");
  const [phrase, setPhrase] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RehearsalResponse | null>(null);

  const selected = useMemo(
    () => PILOT_EVENT_CATALOGUE.find(e => `${e.moduleCode}::${e.eventCode}` === selectedKey) ?? defaultChoice,
    [selectedKey, defaultChoice],
  );

  const phraseOk = phrase.trim() === CONFIRM_PHRASE;
  const reasonOk = reason.trim().length >= 6;
  const canRun = phraseOk && reasonOk && !running;

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await (supabase as any).functions.invoke("comm-hub-event-pilot", {
        body: {
          action: "rehearse",
          moduleCode: selected.moduleCode,
          eventCode: selected.eventCode,
          templateCode: selected.templateCode,
          reason: reason.trim(),
          typedConfirmation: phrase.trim(),
        },
      });
      if (error) throw new Error(error.message ?? String(error));
      setResult(data as RehearsalResponse);
      if ((data as any)?.ok) toast.success("Operator rehearsal completed. Review the report below.");
      else toast.error(`Rehearsal failed: ${(data as any)?.error ?? "unknown"}`);
    } catch (e: any) {
      setResult({ ok: false, error: e?.message ?? String(e) });
      toast.error(`Rehearsal failed: ${e?.message ?? String(e)}`);
    } finally {
      setRunning(false);
    }
  };

  const stepBadge = (v: boolean | undefined) =>
    v === true ? <Badge className="bg-emerald-600">PASS</Badge>
    : v === false ? <Badge variant="destructive">FAIL</Badge>
    : <Badge variant="outline">—</Badge>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Operator Rehearsal Wizard
        </CardTitle>
        <CardDescription>
          Safely rehearse cancel, retry dry-run, and clear-stale-lock operator actions
          against three separate synthetic test messages. No live email, no provider call.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Safety guarantees</AlertTitle>
          <AlertDescription className="text-xs">
            All rehearsal messages are <code>test_mode=true</code>, recipient locked to{" "}
            <code>{ALLOWED_RECIPIENT}</code>. No writes to <code>notification_queue</code> /
            <code>notification_logs</code>. Every action is audited.
          </AlertDescription>
        </Alert>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Module / Event</Label>
            <Select value={selectedKey} onValueChange={setSelectedKey} disabled={running}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PILOT_EVENT_CATALOGUE.map(e => (
                  <SelectItem key={`${e.moduleCode}::${e.eventCode}`} value={`${e.moduleCode}::${e.eventCode}`}>
                    {e.moduleCode} / {e.eventCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Template code</Label>
            <Input value={selected.templateCode} readOnly className="font-mono text-xs" />
          </div>
          <div className="space-y-1">
            <Label>Recipient (locked)</Label>
            <Input value={ALLOWED_RECIPIENT} readOnly className="font-mono text-xs" />
          </div>
          <div className="space-y-1">
            <Label>Confirmation phrase</Label>
            <Input value={phrase} onChange={e => setPhrase(e.target.value)}
              placeholder={CONFIRM_PHRASE} disabled={running} />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label>Reason (min 6 chars)</Label>
            <Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Why is this rehearsal being run?" disabled={running} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={run} disabled={!canRun}>
            {running && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Run operator rehearsal
          </Button>
        </div>

        {result && (
          <div className="rounded border p-3 space-y-3 text-sm">
            <div className="flex items-center gap-2 font-medium">
              {result.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
              Rehearsal report
            </div>
            {result.error && <div className="text-destructive text-xs">Error: {result.error}</div>}

            {(["cancel", "retry", "clear_lock"] as StepKey[]).map(k => {
              const pass = result.results?.pass?.[k];
              const ids = result.results?.ids?.[k];
              const err = result.results?.errors?.[k];
              return (
                <div key={k} className="rounded bg-muted/50 p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium capitalize">{k.replace("_", " ")} test</div>
                    {stepBadge(pass)}
                  </div>
                  {ids && (
                    <div className="text-xs font-mono grid gap-0.5">
                      {ids.request_no && <div>request: {ids.request_no}</div>}
                      {ids.message_id && <div>message: {ids.message_id}</div>}
                      {ids.audit_id && <div>audit: {ids.audit_id}</div>}
                      {ids.final_status && <div>final status: {ids.final_status}</div>}
                      {ids.provider_message_id && <div>provider_message_id: {ids.provider_message_id}</div>}
                      {ids.dispatch && (
                        <div>
                          dispatch: sentDryRun={String(ids.dispatch.sentDryRun)},
                          sentLive={String(ids.dispatch.sentLive)},
                          targetMode={String(ids.dispatch.targetMode)}
                        </div>
                      )}
                    </div>
                  )}
                  {err && <div className="text-destructive text-xs">{err}</div>}
                </div>
              );
            })}

            {result.safety && (
              <div className="rounded border-dashed border p-2 text-xs">
                <div className="font-medium mb-1">Safety confirmations</div>
                <ul className="grid gap-0.5">
                  <li>No live email: <b>{String(result.safety.live_email_sent === false)}</b></li>
                  <li>No provider call: <b>{String(result.safety.provider_called === false)}</b></li>
                  <li>notification_queue untouched: <b>{String(result.safety.notification_queue_touched === false)}</b></li>
                  <li>notification_logs untouched: <b>{String(result.safety.notification_logs_touched === false)}</b></li>
                  <li>test_mode only: <b>{String(result.safety.test_mode_only === true)}</b></li>
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OperatorRehearsalWizardPanel;
