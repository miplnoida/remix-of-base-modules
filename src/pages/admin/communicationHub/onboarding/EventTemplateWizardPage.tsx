/**
 * EPIC 4B — Event & Template Onboarding Wizard.
 *
 * Route: /admin/communication-hub/onboarding/event-template-wizard
 *
 * Dry-run only. No live email. No cron. Recipient locked upstream.
 * Wizard steps:
 *   1. Module & event
 *   2. Required tokens
 *   3. Template (new or existing)
 *   4. Preview
 *   5. Publish version
 *   6. Ensure live-control (dry_run_only)
 *   7. Map event → template
 *   8. Preflight
 *   9. Optional dry-run validation
 *   10. Summary + next steps
 */
import React, { useMemo, useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Info, Loader2, Plus, ShieldAlert, Trash2 } from "lucide-react";
import CommunicationHubWorkspaceShell from "../components/CommunicationHubWorkspaceShell";
import { listSenderProfiles, type SenderProfile } from "../services/senderProfileService";
import { supabase as _supabase } from "@/integrations/supabase/client";
import {
  KNOWN_MODULES,
  SERVER_PROVIDED_TOKENS,
  TokenMetadata,
  createTemplateWithVersion,
  ensureEventLiveControlDryRun,
  extractTokens,
  fetchOnboardingStatus,
  findExistingTemplate,
  isValidTokenKey,
  mapEventToTemplate,
  renderPreview,
  runDryRunValidation,
  runEventPreflight,
  suggestTemplateCode,
  updateTokenMetadata,
  upsertRegistry,
  validateTemplateBody,
} from "../services/eventTemplateOnboardingService";

const STEP_LABELS = [
  "Module & Event",
  "Tokens",
  "Template",
  "Preview",
  "Publish",
  "Live Control",
  "Mapping",
  "Preflight",
  "Dry-Run",
  "Summary",
];

const DEFAULT_HTML = `<p>Hello {{recipient_name}},</p>
<p>This is a dry-run notification for {{module_code}} / {{event_code}}.</p>
<p>Request No: {{request_no}}</p>`;

export default function EventTemplateWizardPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);

  // Step 1
  const [moduleCode, setModuleCode] = useState(params.get("module") ?? "");
  const [eventCode, setEventCode] = useState(params.get("event") ?? "");
  const [eventName, setEventName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerDescription, setTriggerDescription] = useState("");
  const [recipientType, setRecipientType] = useState("ADMIN_USER");
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("low");
  const [entityType, setEntityType] = useState("");
  const [notes, setNotes] = useState("");

  // Step 2
  const [tokens, setTokens] = useState<TokenMetadata[]>([...SERVER_PROVIDED_TOKENS]);

  // Step 3
  const [templateCode, setTemplateCode] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateHtml, setTemplateHtml] = useState(DEFAULT_HTML);
  const [existingTemplate, setExistingTemplate] = useState<any>(null);
  const [confirmNewVersion, setConfirmNewVersion] = useState(false);

  // Reason (used across steps)
  const [reason, setReason] = useState("");

  // Mapping confirmation
  const [mapConfirm, setMapConfirm] = useState("");

  // Dry-run confirmation
  const [dryRunConfirm, setDryRunConfirm] = useState("");

  // Progress state
  const [busy, setBusy] = useState(false);
  const [registryDone, setRegistryDone] = useState(false);
  const [tokensDone, setTokensDone] = useState(false);
  const [templateResult, setTemplateResult] = useState<{ template_id: string; template_code: string; version_id: string; version_no: number } | null>(null);
  const [liveControlDone, setLiveControlDone] = useState(false);
  const [mappingDone, setMappingDone] = useState(false);
  const [preflightResult, setPreflightResult] = useState<any>(null);
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [senderProfileId, setSenderProfileId] = useState<string>("");
  const [senders, setSenders] = useState<SenderProfile[]>([]);
  useEffect(() => { void listSenderProfiles().then(setSenders).catch(() => {}); }, []);

  useEffect(() => {
    // auto-suggest template code
    if (moduleCode && eventCode && !templateCode) {
      setTemplateCode(suggestTemplateCode(moduleCode, eventCode));
    }
    if (moduleCode && eventCode && !templateName) {
      setTemplateName(`${moduleCode} ${eventCode} Email`);
    }
  }, [moduleCode, eventCode]); // eslint-disable-line

  // Load existing status if module/event preselected
  useEffect(() => {
    if (moduleCode && eventCode) {
      fetchOnboardingStatus(moduleCode, eventCode).then((s) => {
        if (s.registry) {
          setEventName(s.registry.event_name ?? "");
          setDescription(s.registry.description ?? "");
          setTriggerDescription(s.registry.trigger_description ?? "");
          setRecipientType(s.registry.recipient_type ?? "ADMIN_USER");
          setRiskLevel((s.registry.risk_level ?? "low") as any);
          setEntityType(s.registry.entity_type ?? "");
          setNotes(s.registry.notes ?? "");
          if (s.registry.template_code) setTemplateCode(s.registry.template_code);
          if (Array.isArray(s.registry.token_metadata) && s.registry.token_metadata.length > 0) {
            const merged = mergeServerProvided(s.registry.token_metadata as TokenMetadata[]);
            setTokens(merged);
          }
        }
      });
    }
  }, []); // eslint-disable-line

  const highRisk = riskLevel === "high";
  const previewSubject = useMemo(() => renderPreview(templateSubject, tokens), [templateSubject, tokens]);
  const previewHtml = useMemo(() => renderPreview(templateHtml, tokens), [templateHtml, tokens]);
  const templateErrors = useMemo(() => validateTemplateBody(templateSubject, templateHtml, tokens), [templateSubject, templateHtml, tokens]);

  function mergeServerProvided(incoming: TokenMetadata[]): TokenMetadata[] {
    const map = new Map<string, TokenMetadata>();
    for (const t of SERVER_PROVIDED_TOKENS) map.set(t.key, t);
    for (const t of incoming) {
      if (map.has(t.key)) map.set(t.key, { ...map.get(t.key)!, ...t, server_provided: map.get(t.key)!.server_provided });
      else map.set(t.key, t);
    }
    return [...map.values()];
  }

  function tokensPayload(): TokenMetadata[] {
    // dedupe by key
    const map = new Map<string, TokenMetadata>();
    for (const t of tokens) map.set(t.key, t);
    return [...map.values()];
  }

  function requiredTokenKeys(): string[] {
    return tokensPayload().map((t) => t.key);
  }

  function tokensAsSampleMap(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const t of tokensPayload()) if (!t.server_provided) out[t.key] = t.sample || "";
    return out;
  }

  // --- Step actions ---

  async function saveRegistry() {
    if (!moduleCode || !eventCode) return toast.error("Module and event code required");
    if (!reason || reason.trim().length < 4) return toast.error("Reason required");
    setBusy(true);
    try {
      await upsertRegistry(
        {
          module_code: moduleCode,
          module_name: KNOWN_MODULES.find((m) => m.code === moduleCode)?.name,
          event_code: eventCode,
          event_name: eventName,
          description,
          trigger_description: triggerDescription,
          channel: "email",
          recipient_type: recipientType,
          entity_type: entityType,
          risk_level: riskLevel,
          template_code: templateCode || suggestTemplateCode(moduleCode, eventCode),
          token_metadata: tokensPayload(),
          required_tokens: requiredTokenKeys(),
          notes,
          recommended_phase: highRisk ? "governance_required" : "dry_run",
        },
        reason,
      );
      setRegistryDone(true);
      toast.success("Registry saved");
      setStep(1);
    } catch (e: any) {
      toast.error(`Registry save failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveTokens() {
    // validate keys
    const seen = new Set<string>();
    for (const t of tokens) {
      if (!isValidTokenKey(t.key)) return toast.error(`Invalid token key: ${t.key}`);
      if (seen.has(t.key)) return toast.error(`Duplicate token: ${t.key}`);
      seen.add(t.key);
      if (t.required && !t.server_provided && !t.sample) return toast.error(`Sample required for token: ${t.key}`);
    }
    if (!reason || reason.trim().length < 4) return toast.error("Reason required");
    setBusy(true);
    try {
      await updateTokenMetadata(moduleCode, eventCode, "email", tokensPayload(), reason);
      setTokensDone(true);
      toast.success("Tokens saved");
      setStep(2);
    } catch (e: any) {
      toast.error(`Save tokens failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function checkExistingTemplate() {
    if (!templateCode) return;
    const existing = await findExistingTemplate(templateCode);
    setExistingTemplate(existing);
  }

  async function publishTemplate() {
    if (templateErrors.length > 0) return toast.error(`Fix template errors first: ${templateErrors[0]}`);
    if (!templateSubject) return toast.error("Subject required");
    if (existingTemplate?.active_version_id && !confirmNewVersion) {
      return toast.error("Confirm creating a new version");
    }
    if (!reason || reason.trim().length < 4) return toast.error("Reason required");
    setBusy(true);
    try {
      const res = await createTemplateWithVersion({
        template_code: templateCode,
        template_name: templateName || templateCode,
        module_code: moduleCode,
        module_name: KNOWN_MODULES.find((m) => m.code === moduleCode)?.name,
        description,
        subject: templateSubject,
        body_html: templateHtml,
        required_tokens: requiredTokenKeys(),
        change_summary: reason,
        reason,
        confirmNewVersion: !!existingTemplate?.active_version_id,
      });
      setTemplateResult(res);
      toast.success(`Template v${res.version_no} published`);
      setStep(5);
    } catch (e: any) {
      toast.error(`Publish failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function ensureLiveControl() {
    if (!reason || reason.trim().length < 4) return toast.error("Reason required");
    setBusy(true);
    try {
      await ensureEventLiveControlDryRun(moduleCode, eventCode, "email", riskLevel, reason);
      setLiveControlDone(true);
      toast.success("Live-control ensured (dry-run only)");
      setStep(6);
    } catch (e: any) {
      toast.error(`Live-control failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function doMapping() {
    if (mapConfirm !== "MAP EVENT TO TEMPLATE") return toast.error("Type: MAP EVENT TO TEMPLATE");
    if (!reason || reason.trim().length < 4) return toast.error("Reason required");
    if (!senderProfileId) return toast.error("Sender profile is required");
    setBusy(true);
    try {
      await mapEventToTemplate({
        moduleCode,
        eventCode,
        channel: "email",
        templateCode,
        riskLevel,
        reason,
        senderProfileId,
      });
      setMappingDone(true);
      toast.success("Event mapped to template");
      setStep(7);
    } catch (e: any) {
      toast.error(`Mapping failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function doPreflight() {
    setBusy(true);
    try {
      const res = await runEventPreflight({
        moduleCode,
        eventCode,
        templateCode,
        tokens: tokensAsSampleMap(),
      });
      setPreflightResult(res);
      if (res?.ready) toast.success("Preflight ready — no blockers");
      else toast.message(`Preflight has ${res?.blockers?.length ?? 0} blocker(s)`);
    } catch (e: any) {
      toast.error(`Preflight failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function doDryRun() {
    if (dryRunConfirm !== "SEND GENERIC EVENT DRY RUN") return toast.error("Type: SEND GENERIC EVENT DRY RUN");
    if (!reason || reason.trim().length < 4) return toast.error("Reason required");
    setBusy(true);
    try {
      const res = await runDryRunValidation({
        moduleCode,
        eventCode,
        templateCode,
        tokens: tokensAsSampleMap(),
        reason,
      });
      setDryRunResult(res);
      toast.success("Dry-run completed");
      setStep(9);
    } catch (e: any) {
      toast.error(`Dry-run failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  // --- Token editor helpers ---
  function addToken() {
    setTokens((t) => [...t, { key: "", label: "", sample: "", required: true, server_provided: false, data_type: "text", sensitive: false }]);
  }
  function removeToken(i: number) {
    setTokens((t) => t.filter((_, idx) => idx !== i));
  }
  function updateToken(i: number, patch: Partial<TokenMetadata>) {
    setTokens((t) => t.map((tk, idx) => (idx === i ? { ...tk, ...patch } : tk)));
  }
  function insertTokenIntoBody(key: string) {
    setTemplateHtml((s) => s + `{{${key}}}`);
  }

  return (
    <CommunicationHubWorkspaceShell
      title="Event & Template Onboarding Wizard"
      purpose="Create module events, define tokens, author templates, publish versions, map events, and dry-run validate — all from one screen."
      risk="action-capable"
      section="Onboarding"
    >
      {highRisk && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>High-risk / statutory event</AlertTitle>
          <AlertDescription>
            Dry-run only. Live sending requires the Governed Controlled Live Send flow. This wizard cannot promote to live.
          </AlertDescription>
        </Alert>
      )}

      {/* Stepper */}
      <Card>
        <CardContent className="pt-4">
          <ol className="flex flex-wrap gap-2 text-xs">
            {STEP_LABELS.map((label, i) => (
              <li
                key={label}
                className={`px-2 py-1 rounded border ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-muted" : ""}`}
              >
                {i + 1}. {label}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Reason field is shared across steps */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Reason (required for every write)</CardTitle>
        </CardHeader>
        <CardContent>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Onboarding LEGAL/INTERNAL_CASE_ASSIGNMENT_NOTICE" />
        </CardContent>
      </Card>

      {/* Step 0 - Module/Event */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>1. Module & Event</CardTitle>
            <CardDescription>Identify the business module and event. Codes are UPPER_SNAKE_CASE.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Module</Label>
                <Select value={moduleCode} onValueChange={setModuleCode}>
                  <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                  <SelectContent>
                    {KNOWN_MODULES.map((m) => (
                      <SelectItem key={m.code} value={m.code}>{m.name} ({m.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Event code</Label>
                <Input value={eventCode} onChange={(e) => setEventCode(e.target.value.toUpperCase())} placeholder="INTERNAL_CASE_ASSIGNMENT_NOTICE" />
              </div>
              <div>
                <Label>Event name</Label>
                <Input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Internal case assignment notice" />
              </div>
              <div>
                <Label>Recipient type</Label>
                <Select value={recipientType} onValueChange={setRecipientType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN_USER">Admin user</SelectItem>
                    <SelectItem value="STAFF_USER">Staff user</SelectItem>
                    <SelectItem value="EMPLOYER">Employer</SelectItem>
                    <SelectItem value="INSURED_PERSON">Insured person</SelectItem>
                    <SelectItem value="EXTERNAL_PARTY">External party</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Risk level</Label>
                <Select value={riskLevel} onValueChange={(v) => setRiskLevel(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">low</SelectItem>
                    <SelectItem value="medium">medium</SelectItem>
                    <SelectItem value="high">high</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Entity type</Label>
                <Input value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="legal_case, insured_person, claim..." />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Trigger description</Label>
              <Textarea value={triggerDescription} onChange={(e) => setTriggerDescription(e.target.value)} rows={2} placeholder="Emitted when..." />
            </div>
            <div className="flex justify-end">
              <Button onClick={saveRegistry} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Save registry <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1 - Tokens */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Required tokens</CardTitle>
            <CardDescription>Define tokens used in the template. Server-provided tokens are locked.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="border rounded">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium bg-muted">
                <div className="col-span-2">Key</div>
                <div className="col-span-2">Label</div>
                <div className="col-span-3">Sample</div>
                <div className="col-span-1">Type</div>
                <div className="col-span-1">Req</div>
                <div className="col-span-1">Server</div>
                <div className="col-span-1">PII</div>
                <div className="col-span-1"></div>
              </div>
              {tokens.map((t, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 border-t items-center text-sm">
                  <Input className="col-span-2 h-8" value={t.key} disabled={t.server_provided} onChange={(e) => updateToken(i, { key: e.target.value })} />
                  <Input className="col-span-2 h-8" value={t.label} disabled={t.server_provided} onChange={(e) => updateToken(i, { label: e.target.value })} />
                  <Input className="col-span-3 h-8" value={t.sample} disabled={t.server_provided} onChange={(e) => updateToken(i, { sample: e.target.value })} />
                  <div className="col-span-1">
                    <Select value={t.data_type} disabled={t.server_provided} onValueChange={(v) => updateToken(i, { data_type: v as any })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["text", "date", "number", "boolean", "url", "email"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1"><Checkbox checked={t.required} disabled={t.server_provided} onCheckedChange={(v) => updateToken(i, { required: !!v })} /></div>
                  <div className="col-span-1"><Checkbox checked={t.server_provided} disabled /></div>
                  <div className="col-span-1"><Checkbox checked={t.sensitive} disabled={t.server_provided} onCheckedChange={(v) => updateToken(i, { sensitive: !!v })} /></div>
                  <div className="col-span-1 text-right">
                    {!t.server_provided && (
                      <Button size="icon" variant="ghost" onClick={() => removeToken(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={addToken}><Plus className="h-4 w-4 mr-1" /> Add token</Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
                <Button onClick={saveTokens} disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Save tokens <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2 - Template */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>3. Template</CardTitle>
            <CardDescription>Create a new template or select an existing one to add a new version.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Template code</Label>
                <div className="flex gap-2">
                  <Input value={templateCode} onChange={(e) => setTemplateCode(e.target.value.toUpperCase())} />
                  <Button variant="outline" onClick={checkExistingTemplate}>Check</Button>
                </div>
              </div>
              <div>
                <Label>Template name</Label>
                <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
              </div>
            </div>
            {existingTemplate && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Existing template found</AlertTitle>
                <AlertDescription>
                  Status: {existingTemplate.status}. Active version id: {existingTemplate.active_version_id ?? "none"}.
                  {existingTemplate.active_version_id && (
                    <label className="flex items-center gap-2 mt-2 text-xs">
                      <Checkbox checked={confirmNewVersion} onCheckedChange={(v) => setConfirmNewVersion(!!v)} />
                      I confirm creating a new template version (server will require typed confirmation)
                    </label>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <div>
              <Label>Subject</Label>
              <Input value={templateSubject} onChange={(e) => setTemplateSubject(e.target.value)} placeholder="e.g. [SSB] Case {{case_reference}} assigned" />
            </div>
            <div>
              <Label>Body (HTML)</Label>
              <div className="mb-2 flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground">Insert token:</span>
                {tokens.map((t) => (
                  <Button key={t.key} type="button" size="sm" variant="outline" className="h-6 text-xs" onClick={() => insertTokenIntoBody(t.key)}>
                    {`{{${t.key}}}`}
                  </Button>
                ))}
              </div>
              <Textarea value={templateHtml} onChange={(e) => setTemplateHtml(e.target.value)} rows={10} className="font-mono text-xs" />
            </div>
            {templateErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Template issues</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc ml-4 text-xs">{templateErrors.map((e) => <li key={e}>{e}</li>)}</ul>
                </AlertDescription>
              </Alert>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={() => setStep(3)} disabled={templateErrors.length > 0}>
                Preview <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 - Preview */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>4. Preview</CardTitle>
            <CardDescription>Rendered with sample values. No database write.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="border rounded p-3 bg-muted/40">
              <div className="text-xs text-muted-foreground">Subject</div>
              <div className="font-medium">{previewSubject}</div>
            </div>
            <div className="border rounded p-3">
              <div className="text-xs text-muted-foreground mb-2">Body</div>
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={() => setStep(4)}>Continue to publish <ArrowRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4 - Publish */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>5. Publish template version</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">This creates the template (if missing) and publishes a new active version.</p>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(3)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={publishTemplate} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Publish version
              </Button>
            </div>
            {templateResult && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Published</AlertTitle>
                <AlertDescription>
                  Template <code>{templateResult.template_code}</code> v{templateResult.version_no} — version id <code>{templateResult.version_id}</code>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5 - Live control */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>6. Ensure live-control (dry-run only)</CardTitle>
            <CardDescription>Creates safety row for this event if missing. Never promotes to live.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Status will be dry_run_only</AlertTitle>
              <AlertDescription>Live status can only be changed via the Governed Controlled Live Send flow.</AlertDescription>
            </Alert>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(4)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={ensureLiveControl} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Ensure dry-run control
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 6 - Mapping */}
      {step === 6 && (
        <Card>
          <CardHeader>
            <CardTitle>7. Map event → template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <strong>{moduleCode}</strong> / <strong>{eventCode}</strong> / email → <code>{templateCode}</code>
            </div>
            <div>
              <Label>Sender profile <span className="text-destructive">*</span></Label>
              <Select value={senderProfileId || "__none"} onValueChange={(v) => setSenderProfileId(v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Choose sender profile" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">(none — required)</SelectItem>
                  {senders.map((s) => (
                    <SelectItem key={s.id} value={s.id} disabled={!s.is_enabled}>
                      {s.profile_name} — {s.from_email}
                      {!s.is_enabled ? " (disabled)"
                        : s.provider_identity_status !== "verified" ? " (pending)"
                        : !s.domain_verified ? " (domain unverified)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {senderProfileId && (() => {
                const s = senders.find((x) => x.id === senderProfileId);
                if (!s) return null;
                const verified = s.provider_identity_status === "verified" && s.domain_verified;
                return (
                  <Alert className="mt-2">
                    <Info className="h-4 w-4" />
                    <AlertTitle className="text-xs">
                      From: {s.display_name} &lt;{s.from_email}&gt;
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                      {verified
                        ? "Verified — usable for internal dry-run and live external send when other gates pass."
                        : "Sender is pending verification. Dry-run internal is allowed, but live external send is blocked until verified."}
                    </AlertDescription>
                  </Alert>
                );
              })()}
              <p className="text-[10px] text-muted-foreground mt-1">
                Manage senders in <Link className="underline" to="/admin/communication-hub/design/sender-profiles">Sender Profiles</Link>.
              </p>
            </div>
            <div>
              <Label>Type exactly: <code>MAP EVENT TO TEMPLATE</code></Label>
              <Input value={mapConfirm} onChange={(e) => setMapConfirm(e.target.value)} />
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(5)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={doMapping} disabled={busy || mapConfirm !== "MAP EVENT TO TEMPLATE" || !senderProfileId}>
                {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Create mapping
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 7 - Preflight */}
      {step === 7 && (
        <Card>
          <CardHeader>
            <CardTitle>8. Preflight</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={doPreflight} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Run preflight
            </Button>
            {preflightResult && (
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-96">{JSON.stringify(preflightResult, null, 2)}</pre>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(6)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={() => setStep(8)} disabled={!preflightResult}>Continue <ArrowRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 8 - Dry-run */}
      {step === 8 && (
        <Card>
          <CardHeader>
            <CardTitle>9. Optional dry-run validation</CardTitle>
            <CardDescription>Recipient locked to <code>rohit@mishainfotech.com</code>. <strong>test_mode=true</strong>. No live provider call.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Type exactly: <code>SEND GENERIC EVENT DRY RUN</code></Label>
              <Input value={dryRunConfirm} onChange={(e) => setDryRunConfirm(e.target.value)} />
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(9)}>Skip <ArrowRight className="h-4 w-4 ml-1" /></Button>
              <Button onClick={doDryRun} disabled={busy || dryRunConfirm !== "SEND GENERIC EVENT DRY RUN"}>
                {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Run dry-run
              </Button>
            </div>
            {dryRunResult && (
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-96">{JSON.stringify(dryRunResult, null, 2)}</pre>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 9 - Summary */}
      {step === 9 && (
        <Card>
          <CardHeader>
            <CardTitle>10. Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant={registryDone ? "default" : "outline"}>Registry</Badge>
              <Badge variant={tokensDone ? "default" : "outline"}>Tokens</Badge>
              <Badge variant={templateResult ? "default" : "outline"}>Template published</Badge>
              <Badge variant={liveControlDone ? "default" : "outline"}>Live-control</Badge>
              <Badge variant={mappingDone ? "default" : "outline"}>Mapping</Badge>
              <Badge variant={preflightResult?.ready ? "default" : "outline"}>Preflight</Badge>
              <Badge variant={dryRunResult ? "default" : "outline"}>Dry-run</Badge>
            </div>
            <Separator />
            <div className="space-y-1 text-sm">
              <div className="font-medium">What happens next?</div>
              <ol className="list-decimal ml-5 text-muted-foreground">
                <li>Wire the module workflow to call <code>sendCommunication()</code>.</li>
                <li>Dry-run from the actual workflow.</li>
                <li>Submit a governance proposal before any live send.</li>
              </ol>
            </div>
            <Separator />
            <div className="grid gap-2 md:grid-cols-2 text-sm">
              <Link className="underline" to="/admin/communication-hub/delivery-monitor">Delivery Monitor</Link>
              <Link className="underline" to="/admin/communication-hub/dispatch-register">Dispatch Register</Link>
              <Link className="underline" to="/admin/communication-hub/lifecycle-log">Lifecycle Event Log</Link>
              <Link className="underline" to="/admin/communication-hub/requests">Requests</Link>
              <Link className="underline" to={`/admin/communication-hub/pilots?module=${moduleCode}&event=${eventCode}`}>Open in Generic Pilot</Link>
              <Link className="underline" to="/admin/communication-hub/design">Event/Template Mapping</Link>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => navigate("/admin/communication-hub/onboarding")}>Back to Onboarding</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </CommunicationHubWorkspaceShell>
  );
}
