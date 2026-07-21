/**
 * CH-SIMPLE-P3F — Unified Go Live Journey.
 *
 * Single guided page that walks an administrator through the five
 * authoritative safety gates before any live email is sent. It reuses
 * existing panels — PreviewApprovalPanel, DryRunPanel, ControlledLivePanel
 * — and NEVER reproduces server rules in the browser.
 *
 * Step lock invariants:
 *   1. Select Event             -> 2 unlocks when module+event are chosen
 *   2. Check Readiness          -> 3 unlocks when the canonical send-decision
 *                                  for context=preview returns allowed=true
 *   3. Preview & Approve        -> 4 unlocks when the server returns an
 *                                  ACTIVE approval id
 *   4. Run Dry Test             -> 5 unlocks when the server returns a valid
 *                                  DRY_RUN_PASSED certification
 *   5. Controlled Live Test     -> 6 unlocks when the orchestrator returns a
 *                                  final controlled-live result
 *   6. Review & Complete        -> read-only evidence
 *
 * Session state is stored in sessionStorage under commHub.goLive.v1 —
 * it only holds ids, never authorisation flags. Every downstream step
 * verifies authoritative server state on load.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CommunicationHubWorkspaceShell, {
  CommunicationHubSectionCard,
} from "../components/CommunicationHubWorkspaceShell";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Circle, Lock, ShieldAlert, ExternalLink } from "lucide-react";
import PreviewApprovalPanel from "../controlCenter/PreviewApprovalPanel";
import DryRunPanel from "../controlCenter/DryRunPanel";
import ControlledLivePanel from "../controlCenter/ControlledLivePanel";
import BlockersList from "../safety/BlockersList";
import {
  evaluateCanonicalSendDecision,
  type SendDecisionEnvelope,
} from "@/platform/communication-hub/sendDecisionService";
import {
  fetchGlobalSettings,
  type CommunicationGlobalSettings,
} from "@/platform/communication-hub/globalSettingsService";
import {
  fetchRecipientPolicy,
  type RecipientPolicy,
} from "@/platform/communication-hub/recipientPolicyService";
import { toast } from "sonner";

const SESSION_KEY = "commHub.goLive.v1";

interface GoLiveSession {
  moduleCode: string;
  eventCode: string;
  channel: string;
  previewSnapshotId: string | null;
  previewApprovalId: string | null;
  dryRunExecutionId: string | null;
  dryRunCertificationId: string | null;
  controlledLiveExecutionId: string | null;
  controlledLiveCertificationId: string | null;
}

const EMPTY_SESSION: GoLiveSession = {
  moduleCode: "",
  eventCode: "",
  channel: "email",
  previewSnapshotId: null,
  previewApprovalId: null,
  dryRunExecutionId: null,
  dryRunCertificationId: null,
  controlledLiveExecutionId: null,
  controlledLiveCertificationId: null,
};

/** Map server-side fix hints to concrete admin routes (kept explicit; no
 *  broad regex, so unknown codes fall back to a generic diagnostics page). */
const FIX_ROUTE_MAP: Record<string, string> = {
  recipient_policy: "/admin/communication-hub/recipient-policy",
  template_mapping: "/admin/communication-hub/design",
  template_version: "/admin/communication-hub/design",
  sender_profile: "/admin/communication-hub/design/sender-profiles",
  sender_verification: "/admin/communication-hub/design/sender-verification",
  email_provider: "/admin/notifications/providers",
  send_policy: "/admin/communication-hub/governance/send-policies",
  review_policy: "/admin/communication-hub/governance",
  event_configuration: "/admin/communication-hub/onboarding/event-template-wizard",
  emergency_stop: "/admin/communication-hub/control-center",
  operating_mode: "/admin/communication-hub/control-center",
};

function loadSession(): GoLiveSession {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { ...EMPTY_SESSION };
    const parsed = JSON.parse(raw);
    return { ...EMPTY_SESSION, ...parsed };
  } catch {
    return { ...EMPTY_SESSION };
  }
}
function saveSession(s: GoLiveSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* private mode — ignore */
  }
}

interface StepHeaderProps {
  index: number;
  title: string;
  status: "locked" | "current" | "done" | "attention";
  hint?: string;
}
function StepHeader({ index, title, status, hint }: StepHeaderProps) {
  const Icon = status === "done" ? CheckCircle2 : status === "locked" ? Lock : Circle;
  const tone =
    status === "done" ? "text-emerald-600" :
    status === "locked" ? "text-muted-foreground" :
    status === "attention" ? "text-amber-600" : "text-primary";
  return (
    <div className="flex items-center gap-3">
      <Icon className={`h-5 w-5 ${tone}`} />
      <div>
        <div className="text-sm font-semibold">
          Step {index}. {title}
        </div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

export default function GoLivePage() {
  const [session, setSession] = useState<GoLiveSession>(() => loadSession());
  const [moduleInput, setModuleInput] = useState(session.moduleCode);
  const [eventInput, setEventInput] = useState(session.eventCode);
  const [decision, setDecision] = useState<SendDecisionEnvelope | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [settings, setSettings] = useState<CommunicationGlobalSettings | null>(null);
  const [recipientPolicy, setRecipientPolicy] = useState<RecipientPolicy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => { saveSession(session); }, [session]);

  useEffect(() => {
    Promise.all([fetchGlobalSettings(), fetchRecipientPolicy()])
      .then(([s, p]) => {
        if (!mountedRef.current) return;
        setSettings(s);
        setRecipientPolicy(p);
      })
      .catch((e) => setLoadError(e?.message ?? "Failed to load hub settings"));
  }, []);

  const eventChosen = !!session.moduleCode && !!session.eventCode;

  async function refreshDecision() {
    if (!eventChosen) return;
    setDecisionLoading(true);
    try {
      const env = await evaluateCanonicalSendDecision({
        moduleCode: session.moduleCode,
        eventCode: session.eventCode,
        channel: session.channel,
        sendContext: "preview",
      });
      setDecision(env);
    } catch (e: any) {
      toast.error(e?.message ?? "Readiness check failed");
    } finally {
      setDecisionLoading(false);
    }
  }

  useEffect(() => {
    if (eventChosen) refreshDecision();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.moduleCode, session.eventCode, session.channel]);

  const readinessOk = !!decision && decision.allowed === true;
  const previewApproved =
    !!session.previewApprovalId && !!session.previewSnapshotId;
  const dryRunCertified = !!session.dryRunCertificationId;
  const controlledLiveDone = !!session.controlledLiveExecutionId;

  const stepStatus = useMemo(() => ({
    s1: eventChosen ? "done" as const : "current" as const,
    s2: !eventChosen ? "locked" as const
        : readinessOk ? "done" as const
        : decision ? "attention" as const : "current" as const,
    s3: !readinessOk ? "locked" as const
        : previewApproved ? "done" as const : "current" as const,
    s4: !previewApproved ? "locked" as const
        : dryRunCertified ? "done" as const : "current" as const,
    s5: !dryRunCertified ? "locked" as const
        : controlledLiveDone ? "done" as const : "current" as const,
    s6: !controlledLiveDone ? "locked" as const : "current" as const,
  }), [eventChosen, readinessOk, previewApproved, dryRunCertified, controlledLiveDone, decision]);

  function handleSelectEvent() {
    const m = moduleInput.trim().toUpperCase();
    const e = eventInput.trim().toUpperCase();
    if (!m || !e) {
      toast.error("Module code and event code are required");
      return;
    }
    // Selecting a new event invalidates every downstream authorisation.
    setSession({
      ...EMPTY_SESSION,
      moduleCode: m,
      eventCode: e,
      channel: "email",
    });
    setDecision(null);
  }

  function handleReset() {
    sessionStorage.removeItem(SESSION_KEY);
    setSession({ ...EMPTY_SESSION });
    setModuleInput("");
    setEventInput("");
    setDecision(null);
  }

  const recipientSummary = useMemo(() => {
    if (!recipientPolicy) return "Loading…";
    switch (recipientPolicy.activeMode) {
      case "single_configured_address":
        return recipientPolicy.singleConfiguredAddress
          ? `Single configured recipient: ${recipientPolicy.singleConfiguredAddress}`
          : "Single-configured mode selected but no address is set — fix in Recipient Policy.";
      case "approved_named_list":
        return `Approved named list (${recipientPolicy.approvedNamedAddresses.length} entries)`;
      case "approved_domain_list":
        return `Approved domain list (${recipientPolicy.approvedDomains.length} domains)`;
      default:
        return `Mode: ${recipientPolicy.activeMode}`;
    }
  }, [recipientPolicy]);

  return (
    <CommunicationHubWorkspaceShell
      title="Go Live"
      purpose="Guided journey that verifies readiness, preview approval, dry-run certification and a controlled-live test before any real email is sent."
      risk="action-capable"
      quickLinks={[
        { label: "Control Center", href: "/admin/communication-hub/control-center" },
        { label: "Recipient Policy", href: "/admin/communication-hub/recipient-policy" },
        { label: "Design & Templates", href: "/admin/communication-hub/design" },
        { label: "Testing & Pilots (advanced)", href: "/admin/communication-hub/pilots" },
      ]}
    >
      {loadError && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Hub settings unavailable</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {settings && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Operating mode:</span>
          <Badge variant={settings.operatingMode === "EMERGENCY_STOP" ? "destructive" : "secondary"}>
            {settings.operatingMode}
          </Badge>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">Recipient policy:</span>
          <span>{recipientSummary}</span>
        </div>
      )}

      {/* STEP 1 — SELECT EVENT */}
      <CommunicationHubSectionCard
        title={<StepHeader index={1} title="Select Event" status={stepStatus.s1} /> as any}
        description="Choose the module and event you want to bring live. Selecting a new event resets every downstream approval."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Module code</Label>
            <Input
              value={moduleInput}
              onChange={(e) => setModuleInput(e.target.value)}
              placeholder="e.g. BENEFITS"
            />
          </div>
          <div>
            <Label>Event code</Label>
            <Input
              value={eventInput}
              onChange={(e) => setEventInput(e.target.value)}
              placeholder="e.g. AWARD_ISSUED"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleSelectEvent}>Confirm Event</Button>
            <Button variant="outline" onClick={handleReset}>Reset journey</Button>
          </div>
        </div>
        {eventChosen && (
          <div className="mt-3 text-sm">
            Journey scoped to <code className="font-mono">{session.moduleCode}</code> ·{" "}
            <code className="font-mono">{session.eventCode}</code> · channel <code>{session.channel}</code>.
          </div>
        )}
      </CommunicationHubSectionCard>

      <Separator />

      {/* STEP 2 — READINESS */}
      <CommunicationHubSectionCard
        title={<StepHeader index={2} title="Check Readiness" status={stepStatus.s2} /> as any}
        description="The server checks every gate — template mapping, sender, provider, recipient policy, operating mode, review/send policies. Fix any blocker before continuing."
      >
        {!eventChosen ? (
          <div className="text-sm text-muted-foreground">Select an event to run the readiness check.</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button onClick={refreshDecision} disabled={decisionLoading} size="sm">
                {decisionLoading ? "Checking…" : "Re-check readiness"}
              </Button>
              {decision && (
                <Badge variant={decision.allowed ? "default" : "destructive"}>
                  {decision.allowed ? "Ready" : "Blocked"}
                </Badge>
              )}
              {decision && (
                <span className="text-xs text-muted-foreground">
                  policy v{decision.recipient_policy_version ?? "?"} · config v{decision.configuration_version ?? "?"}
                </span>
              )}
            </div>

            {decision && !decision.allowed && (
              <>
                <BlockersList codes={decision.blockers.map(b => b.code)} />
                <div className="space-y-1">
                  <div className="text-xs font-medium uppercase text-muted-foreground">Fix in</div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(
                      decision.blockers
                        .map(b => b.fix_route)
                        .filter((r): r is string => !!r && !!FIX_ROUTE_MAP[r]),
                    )).map((route) => (
                      <Link key={route} to={FIX_ROUTE_MAP[route]} className="text-xs underline inline-flex items-center gap-1">
                        {route.replace(/_/g, " ")} <ExternalLink className="h-3 w-3" />
                      </Link>
                    ))}
                  </div>
                </div>
                <details>
                  <summary className="text-xs text-muted-foreground cursor-pointer">Technical details</summary>
                  <pre className="text-xs bg-muted/40 rounded p-2 overflow-x-auto">
                    {JSON.stringify({ blockers: decision.blockers, gate_results: decision.gate_results }, null, 2)}
                  </pre>
                </details>
              </>
            )}
          </div>
        )}
      </CommunicationHubSectionCard>

      <Separator />

      {/* STEP 3 — PREVIEW & APPROVE */}
      <CommunicationHubSectionCard
        title={<StepHeader index={3} title="Preview & Approve" status={stepStatus.s3} /> as any}
        description="Server renders a locked preview snapshot. Approving it produces the authorisation record required for the dry run."
      >
        {!readinessOk ? (
          <div className="text-sm text-muted-foreground">
            Locked. Readiness must pass before you can prepare a preview.
          </div>
        ) : (
          <PreviewApprovalPanel
            defaultModuleCode={session.moduleCode}
            defaultEventCode={session.eventCode}
            defaultChannel={session.channel}
            onApproved={(approval, snapshot) =>
              setSession((s) => ({
                ...s,
                previewSnapshotId: snapshot.snapshot_id,
                previewApprovalId: approval.approval_id,
                dryRunExecutionId: null,
                dryRunCertificationId: null,
                controlledLiveExecutionId: null,
                controlledLiveCertificationId: null,
              }))
            }
            onRevoked={() =>
              setSession((s) => ({
                ...s,
                previewApprovalId: null,
                dryRunExecutionId: null,
                dryRunCertificationId: null,
                controlledLiveExecutionId: null,
                controlledLiveCertificationId: null,
              }))
            }
          />
        )}
      </CommunicationHubSectionCard>

      <Separator />

      {/* STEP 4 — DRY RUN */}
      <CommunicationHubSectionCard
        title={<StepHeader index={4} title="Run Dry Test" status={stepStatus.s4} /> as any}
        description="One end-to-end simulation through the dispatcher — no provider call is ever made. A DRY_RUN_PASSED certification is required to enable the controlled-live test."
      >
        {!previewApproved ? (
          <div className="text-sm text-muted-foreground">
            Locked. Approve the preview first.
          </div>
        ) : (
          <DryRunPanel
            moduleCode={session.moduleCode}
            eventCode={session.eventCode}
            channel={session.channel}
            previewSnapshotId={session.previewSnapshotId}
            previewApprovalId={session.previewApprovalId}
            previewApproved={previewApproved}
            recipients={[]}
            canonicalDecision={
              decision
                ? {
                    ready: decision.allowed,
                    blockers: decision.blockers,
                    warnings: decision.warnings,
                  }
                : null
            }
            onFinal={(env, _v) =>
              setSession((s) => ({
                ...s,
                dryRunExecutionId: (env as any).execution_id ?? null,
                dryRunCertificationId:
                  env.status === "DRY_RUN_PASSED" ? env.dry_run_certification_id ?? null : null,
                controlledLiveExecutionId: null,
                controlledLiveCertificationId: null,
              }))
            }
          />
        )}
      </CommunicationHubSectionCard>

      <Separator />

      {/* STEP 5 — CONTROLLED LIVE */}
      <CommunicationHubSectionCard
        title={<StepHeader index={5} title="Controlled Live Test" status={stepStatus.s5} /> as any}
        description="Runs exactly one controlled-live send against the provider — stub by default. Real-email delivery is only permitted when the server-side gate is enabled by platform administrators."
      >
        {!dryRunCertified ? (
          <div className="text-sm text-muted-foreground">
            Locked. A DRY_RUN_PASSED certification is required.
          </div>
        ) : (
          <ControlledLivePanel
            moduleCode={session.moduleCode}
            eventCode={session.eventCode}
            channel="email"
            previewSnapshotId={session.previewSnapshotId}
            previewApprovalId={session.previewApprovalId}
            previewApproved={previewApproved}
            dryRunCertificationId={session.dryRunCertificationId}
            dryRunCertified={dryRunCertified}
            canonicalDecision={
              decision
                ? {
                    ready: decision.allowed,
                    blockers: decision.blockers,
                    warnings: decision.warnings,
                  }
                : null
            }
            operatingMode={settings?.operatingMode ?? null}
            onCompleted={(r) =>
              setSession((s) => ({
                ...s,
                controlledLiveExecutionId: (r as any).execution_id ?? null,
                controlledLiveCertificationId: (r as any).certification_id ?? null,
              }))
            }
          />
        )}
      </CommunicationHubSectionCard>

      <Separator />

      {/* STEP 6 — REVIEW */}
      <CommunicationHubSectionCard
        title={<StepHeader index={6} title="Review & Complete" status={stepStatus.s6} /> as any}
        description="Full evidence trail for this event. All ids below are server-issued — nothing here is authoritative in the browser."
      >
        {!controlledLiveDone ? (
          <div className="text-sm text-muted-foreground">
            Locked. Complete the controlled-live test to view the evidence summary.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Module / Event:</span> {session.moduleCode} / {session.eventCode}</div>
            <div><span className="text-muted-foreground">Channel:</span> {session.channel}</div>
            <div><span className="text-muted-foreground">Preview snapshot id:</span> <code className="font-mono text-xs">{session.previewSnapshotId ?? "—"}</code></div>
            <div><span className="text-muted-foreground">Preview approval id:</span> <code className="font-mono text-xs">{session.previewApprovalId ?? "—"}</code></div>
            <div><span className="text-muted-foreground">Dry-run execution id:</span> <code className="font-mono text-xs">{session.dryRunExecutionId ?? "—"}</code></div>
            <div><span className="text-muted-foreground">Dry-run certification id:</span> <code className="font-mono text-xs">{session.dryRunCertificationId ?? "—"}</code></div>
            <div><span className="text-muted-foreground">Controlled-live execution id:</span> <code className="font-mono text-xs">{session.controlledLiveExecutionId ?? "—"}</code></div>
            <div><span className="text-muted-foreground">Controlled-live certification id:</span> <code className="font-mono text-xs">{session.controlledLiveCertificationId ?? "—"}</code></div>
            <div className="md:col-span-2">
              <Alert>
                <AlertTitle>Recommendation</AlertTitle>
                <AlertDescription>
                  This event is <strong>P3E_STUB_CERTIFIED</strong> once the controlled-live test passes against the provider stub.
                  A separate operator sign-off ceremony is required before it can be advanced to
                  P3E_PROVIDER_ACCEPTED and, ultimately, P3E_CONTROLLED_LIVE_CERTIFIED.
                  Manual Production approval remains disabled in this stage.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}
      </CommunicationHubSectionCard>

      {/* Manual Production placeholder */}
      <CommunicationHubSectionCard
        title="Manual Production approval (coming soon)"
        description="Reserved for a future stage. Not enabled here — no live production sends can be issued from this page."
      >
        <div className="text-xs text-muted-foreground">
          Manual Production, Automated Production, cron, bulk and uncontrolled external recipients
          are intentionally out of scope for CH-SIMPLE-P3F.
        </div>
      </CommunicationHubSectionCard>
    </CommunicationHubWorkspaceShell>
  );
}
