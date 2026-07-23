/**
 * CH-SIMPLE-P3D-B.3 — Reusable DryRunPanel.
 *
 * The panel presents a simple operator workflow:
 *
 *   1. Preview status  (from PreviewApprovalPanel or props)
 *   2. Dry-run readiness  (from canonical send-decision result)
 *   3. Run Dry Test  (single button — the server is authoritative)
 *   4. Progress  (display-only labels)
 *   5. Final result  (BLOCKED / DRY_RUN_FAILED / DRY_RUN_PASSED)
 *
 * The panel exposes NO queue, dispatcher, provider, cron, or live-window
 * controls. Idempotency keys are minted once per intentional attempt and
 * reused across rerenders / network retries. A "Run Again" action mints a
 * fresh key only after the prior result is final.
 *
 * Designed for embedding inside the future unified Go Live workflow —
 * this panel is intentionally NOT registered as a top-level route.
 */
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ShieldCheck, AlertTriangle, XCircle, Loader2, ChevronDown, KeyRound } from "lucide-react";
import { toast } from "sonner";
import {
  resolveAuthErrorMessage,
  getAuthErrorDetails,
  isAuthFailure,
  type AuthErrorDetails,
} from "@/platform/communication-hub/authErrorMessages";
import { getFreshAuthenticatedSession, CommHubAuthError } from "@/platform/communication-hub/authSession";
import BlockersList from "@/pages/admin/communicationHub/safety/BlockersList";
import {
  runDryTest,
  validateDryRunCertification,
  generateIdempotencyKey,
  DRY_RUN_PROGRESS_STEPS,
  type DryRunEnvelope,
  type DryRunCertificationValidation,
} from "@/platform/communication-hub/dryRunService";

export interface DryRunPanelProps {
  /** Module code — must match the approved preview. */
  moduleCode: string;
  /** Event code — must match the approved preview. */
  eventCode: string;
  /** Channel (default: email). */
  channel?: string;
  /** Locked, server-issued preview snapshot id. */
  previewSnapshotId?: string | null;
  /** Locked, server-issued preview approval id. Required for CONTROLLED sends. */
  previewApprovalId?: string | null;
  /** Recipients from the approved preview. */
  recipients: string[];
  /**
   * Canonical send-decision result forwarded from the surrounding workflow.
   * The panel does NOT recompute readiness — the server evaluator is
   * authoritative. When null, the Run button stays disabled.
   */
  canonicalDecision?: {
    ready: boolean;
    blockers?: Array<{ code: string; stage?: string; severity?: string; message?: string }>;
    warnings?: Array<{ code: string; message?: string }>;
  } | null;
  /** Whether the preview is currently approved & valid. */
  previewApproved?: boolean;
  /** Free-text reason recorded on the execution row. */
  defaultReason?: string;
  /** CH-SIMPLE-P3F: notified when the run reaches a final state so parent
   *  wizards (Go Live) can lift the certification id into step-lock state. */
  onFinal?: (envelope: DryRunEnvelope, validation: DryRunCertificationValidation | null) => void;
}

type Phase = "idle" | "running" | "final";

export function DryRunPanel(props: DryRunPanelProps) {
  const {
    moduleCode,
    eventCode,
    channel = "email",
    previewSnapshotId,
    previewApprovalId,
    recipients,
    canonicalDecision,
    previewApproved = false,
    defaultReason = "",
    onFinal,
  } = props;

  // Idempotency: one key per intentional attempt. A ref persists across
  // rerenders. `Run Again` explicitly mints a fresh key AFTER a final result.
  const idempotencyRef = useRef<string | null>(null);
  if (!idempotencyRef.current) idempotencyRef.current = generateIdempotencyKey();

  const [reason, setReason] = useState<string>(defaultReason);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progressStep, setProgressStep] = useState<number>(0);
  const [envelope, setEnvelope] = useState<DryRunEnvelope | null>(null);
  const [certValidation, setCertValidation] =
    useState<DryRunCertificationValidation | null>(null);
  const [technicalOpen, setTechnicalOpen] = useState(false);
  // Phase 4B3 — authentication is tracked independently of the runtime
  // execution envelope. An auth failure must not populate a "final result".
  const [authError, setAuthError] = useState<AuthErrorDetails | null>(null);
  const [refreshingAuth, setRefreshingAuth] = useState(false);

  const readinessStatus: "Ready" | "Needs Attention" | "Blocked" = useMemo(() => {
    if (!canonicalDecision) return "Blocked";
    if (canonicalDecision.ready) return "Ready";
    const anyCritical = (canonicalDecision.blockers ?? []).some(
      (b) => b.severity === "critical" || b.severity === "high",
    );
    return anyCritical ? "Blocked" : "Needs Attention";
  }, [canonicalDecision]);

  const canRun =
    phase === "idle" &&
    !authError &&
    recipients.length > 0 &&
    !!previewSnapshotId &&
    previewApproved &&
    readinessStatus === "Ready";

  async function handleRun() {
    if (!canRun) return;
    setPhase("running");
    setEnvelope(null);
    setCertValidation(null);
    setAuthError(null);
    setProgressStep(0);

    const timer = setInterval(() => {
      setProgressStep((s) => Math.min(s + 1, DRY_RUN_PROGRESS_STEPS.length - 2));
    }, 550);

    try {
      const env = await runDryTest({
        moduleCode,
        eventCode,
        channel,
        recipients,
        previewSnapshotId: previewSnapshotId ?? null,
        previewApprovalId: previewApprovalId ?? null,
        operatorReason: reason || null,
        idempotencyKey: idempotencyRef.current!,
      });
      clearInterval(timer);

      // Auth failure inside the envelope: DO NOT paint as a final Dry Run
      // result. Show the dedicated authentication alert instead. The server
      // guarantees no runtime rows were created (retry_safe = true).
      const authDetails = getAuthErrorDetails(env);
      if (authDetails) {
        setAuthError(authDetails);
        setPhase("idle");
        setProgressStep(0);
        toast.error(`${authDetails.title} — ${authDetails.message}`);
        return;
      }

      setProgressStep(DRY_RUN_PROGRESS_STEPS.length - 1);
      setEnvelope(env);
      setPhase("final");

      let v: DryRunCertificationValidation | null = null;
      if (env.status === "DRY_RUN_PASSED" && env.dry_run_certification_id) {
        try {
          v = await validateDryRunCertification({
            certificationId: env.dry_run_certification_id,
            moduleCode,
            eventCode,
            channel,
          });
          setCertValidation(v);
        } catch (e: any) {
          toast.error(`Certification validator: ${e?.message ?? "failed"}`);
        }
      }
      onFinal?.(env, v);
    } catch (e: any) {
      clearInterval(timer);
      // Client-side auth (CommHubAuthError) and network failures land here.
      // Auth failures must not fall through to the generic error toast.
      if (isAuthFailure(e) || e instanceof CommHubAuthError) {
        const d = getAuthErrorDetails(e) ?? getAuthErrorDetails({ blockers: [{ code: "authentication_required" }] })!;
        setAuthError(d);
        setPhase("idle");
        setProgressStep(0);
        return;
      }
      toast.error(e?.message ?? "Dry-run request failed");
      setPhase("idle");
    }
  }

  async function handleRefreshSession() {
    setRefreshingAuth(true);
    try {
      await getFreshAuthenticatedSession();
      setAuthError(null);
      toast.success("Session refreshed. You can retry the Dry Run.");
    } catch (err) {
      const d = getAuthErrorDetails(err) ?? {
        code: "session_lookup_failed",
        title: "Session could not be restored",
        message: "Your session could not be restored. Please sign in again.",
        fix: "Sign out and sign in again.",
        severity: "medium" as const,
        retrySafe: true,
      };
      setAuthError(d);
      toast.error(d.message);
    } finally {
      setRefreshingAuth(false);
    }
  }

  function handleRunAgain() {
    // Retry-safe contract (Phase 4B3):
    //   Block "Run Again" ONLY when the server EXPLICITLY set retry_safe=false
    //   AND the outcome is ambiguous or mutation cleanup is unproven.
    //   Missing retry_safe (=== "UNKNOWN") also blocks a fresh key mint.
    if (phase !== "final" || !envelope) return;
    if (envelope.retry_safe === false && envelope.ambiguous_outcome) return;
    if (envelope.retry_safe === "UNKNOWN" && envelope.mutation_started) return;
    idempotencyRef.current = generateIdempotencyKey();
    setEnvelope(null);
    setCertValidation(null);
    setProgressStep(0);
    setPhase("idle");
  }

  const runAgainBlocked =
    phase === "final" &&
    !!envelope &&
    ((envelope.retry_safe === false && envelope.ambiguous_outcome) ||
      (envelope.retry_safe === "UNKNOWN" && envelope.mutation_started));

  return (
    <div className="space-y-4">
      {/* Authentication alert — strictly separate from readiness / dispatch. */}
      {authError && (
        <Alert>
          <KeyRound className="h-4 w-4" />
          <AlertTitle>{authError.title}</AlertTitle>
          <AlertDescription className="space-y-2">
            <div>{authError.message}</div>
            <div className="text-xs text-muted-foreground">{authError.fix}</div>
            <div className="text-xs">
              Evidence: No Dry Run runtime rows were created · Provider called: No · Simulator called: No · Safe to retry after sign-in: Yes
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleRefreshSession} disabled={refreshingAuth}>
                {refreshingAuth ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing…
                  </>
                ) : (
                  "Refresh Session"
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}


      <section className="rounded-md border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Preview status</div>
          {previewSnapshotId ? (
            previewApproved ? (
              <Badge variant="default">Preview approved</Badge>
            ) : (
              <Badge variant="outline">Preview prepared — approval required</Badge>
            )
          ) : (
            <Badge variant="destructive">No preview prepared</Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          The dry-run runs against the locked, server-verified preview. Refresh or approve the
          preview above before running the dry test.
        </div>
      </section>

      {/* B. Readiness */}
      <section className="rounded-md border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Dry-run readiness</div>
          {readinessStatus === "Ready" && <Badge variant="default">Ready</Badge>}
          {readinessStatus === "Needs Attention" && (
            <Badge variant="outline">Needs Attention</Badge>
          )}
          {readinessStatus === "Blocked" && <Badge variant="destructive">Blocked</Badge>}
        </div>
        <div className="text-xs text-muted-foreground">
          Readiness comes from the canonical server send-decision — this panel does not
          recompute it.
        </div>
        {readinessStatus !== "Ready" && canonicalDecision?.blockers?.length ? (
          <BlockersList
            codes={canonicalDecision.blockers.map((b) => b.code)}
            title="Fix the following before running the dry test"
            compact
          />
        ) : null}
      </section>

      {/* C. Reason + Run button */}
      <section className="rounded-md border p-3 space-y-3">
        <div className="space-y-1">
          <Label htmlFor="dry-run-reason">Operator reason (optional)</Label>
          <Input
            id="dry-run-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Pre-controlled-live rehearsal for pension award notice"
            disabled={phase !== "idle"}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRun} disabled={!canRun} aria-label="Run Dry Test">
            {phase === "running" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running…
              </>
            ) : (
              "Run Dry Test"
            )}
          </Button>
          {phase === "final" && (
            <Button variant="outline" onClick={handleRunAgain} disabled={runAgainBlocked}>
              Run Again
            </Button>
          )}
          <div className="text-xs text-muted-foreground ml-auto font-mono">
            key: {idempotencyRef.current?.slice(0, 12)}…
          </div>
        </div>
        {!canRun && phase === "idle" && (
          <div className="text-xs text-muted-foreground">
            Run is disabled until preview approval and canonical readiness are green.
          </div>
        )}
        {runAgainBlocked && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Outcome not retry-safe</AlertTitle>
            <AlertDescription>
              The server could not confirm whether runtime state was created
              or safely cleaned up. Investigate the execution evidence below
              before running again.
            </AlertDescription>
          </Alert>
        )}
      </section>

      {/* D. Progress */}
      {phase === "running" && (
        <section className="rounded-md border p-3 space-y-2">
          <div className="text-sm font-medium">Progress</div>
          <ol className="text-sm space-y-1">
            {DRY_RUN_PROGRESS_STEPS.map((label, i) => {
              const active = i === progressStep;
              const done = i < progressStep;
              return (
                <li key={label} className="flex items-center gap-2">
                  {done ? (
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <span className="inline-block h-4 w-4 rounded-full border" />
                  )}
                  <span className={active ? "font-medium" : "text-muted-foreground"}>
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="text-xs text-muted-foreground">
            Labels are display-only. The server is authoritative for every step.
          </div>
        </section>
      )}

      {/* E. Final result */}
      {phase === "final" && envelope && <FinalResult envelope={envelope} certValidation={certValidation} />}
    </div>
  );
}

function FinalResult({
  envelope,
  certValidation,
}: {
  envelope: DryRunEnvelope;
  certValidation: DryRunCertificationValidation | null;
}) {
  const s = envelope.status;
  return (
    <section className="space-y-3">
      {s === "DRY_RUN_PASSED" && (
        <Alert>
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-700">
            Dry test passed — no real email was sent.
          </AlertTitle>
          <AlertDescription>
            {envelope.idempotent_replay
              ? "Earlier execution recovered (idempotent replay). No duplicate evidence created."
              : "Certification issued. Ready to progress to controlled live."}
          </AlertDescription>
        </Alert>
      )}
      {s === "DRY_RUN_FAILED" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Dry run failed — {envelope.failure_stage ?? "unknown stage"}</AlertTitle>
          <AlertDescription>
            The dry run started but could not complete certification. Review the blockers below,
            correct the underlying issue, then use "Run Again" to mint a fresh idempotency key.
          </AlertDescription>
        </Alert>
      )}
      {s === "BLOCKED" && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Blocked before processing</AlertTitle>
          <AlertDescription>
            A pre-mutation gate stopped the run before any provider or simulator
            call. Review the blockers below to see which gate reported the issue.
          </AlertDescription>
        </Alert>
      )}

      {envelope.blockers.length > 0 && (
        <BlockersList codes={envelope.blockers.map((b) => b.code)} />
      )}

      <EvidenceCard envelope={envelope} certValidation={certValidation} />

      {certValidation && (
        <CertificationCard validation={certValidation} />
      )}
    </section>
  );
}

function EvidenceCard({
  envelope,
  certValidation,
}: {
  envelope: DryRunEnvelope;
  certValidation: DryRunCertificationValidation | null;
}) {
  const providerCallLabel = envelope.provider_call_attempted ? "Yes" : "No";
  const providerMsgLabel = envelope.provider_message_id ?? "None";
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="text-sm font-medium">Evidence</div>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <Row label="Request number" value={envelope.request_number} />
        <Row label="Execution number" value={envelope.execution_no} />
        <Row label="Message ID" value={envelope.message_id} mono />
        <Row label="Delivery attempt ID" value={envelope.delivery_attempt_id} mono />
        <Row label="Trace ID" value={envelope.trace_id} mono />
        <Row
          label="Certification ID"
          value={envelope.dry_run_certification_id}
          mono
        />
        <Row
          label="Certification expires"
          value={envelope.certification_expires_at ?? certValidation?.expires_at ?? null}
        />
        <Row label="Provider call attempted" value={providerCallLabel} />
        <Row label="Provider message ID" value={providerMsgLabel} />
        <Row label="Operating mode" value={envelope.final_operating_mode} />
        <Row label="Retry-safe" value={envelope.retry_safe === "UNKNOWN" ? "Unknown" : envelope.retry_safe ? "Yes" : "No"} />
        <Row label="Retry reason" value={envelope.retry_reason} />
        <Row label="Mutation started" value={envelope.mutation_started ? "Yes" : "No"} />
        <Row label="Ambiguous outcome" value={envelope.ambiguous_outcome ? "Yes" : "No"} />
        <Row label="Simulator call attempted" value={envelope.simulator_call_attempted ? "Yes" : "No"} />
        <Row label="Transition log ID" value={envelope.transition_log_id} mono />
      </dl>
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="mt-2">
            <ChevronDown className="h-4 w-4 mr-1" /> Technical details
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-64 whitespace-pre-wrap break-all">
            {JSON.stringify(envelope, null, 2)}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function CertificationCard({ validation }: { validation: DryRunCertificationValidation }) {
  const tone: "default" | "destructive" =
    validation.valid ? "default" : "destructive";
  return (
    <Alert variant={tone}>
      <ShieldCheck className="h-4 w-4" />
      <AlertTitle>Certification: {validation.status}</AlertTitle>
      <AlertDescription>
        {validation.valid
          ? "The dry-run certification is currently valid."
          : validation.reason
            ? `Invalidated — ${validation.reason}`
            : "This certification is no longer valid. Re-run the dry test."}
      </AlertDescription>
    </Alert>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-xs text-muted-foreground min-w-[140px]">{label}</dt>
      <dd className={`text-sm ${mono ? "font-mono" : ""}`}>{value ?? "—"}</dd>
    </div>
  );
}

export default DryRunPanel;
