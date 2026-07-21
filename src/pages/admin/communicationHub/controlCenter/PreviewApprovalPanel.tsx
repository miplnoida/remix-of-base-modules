/**
 * CH-SIMPLE-P3C — Server-Verifiable Preview & Approval reusable panel.
 *
 * CH-SIMPLE-P3F-UX.6B — When `lockedContext` is supplied, the panel does not
 * accept any editable module/event/channel/recipient inputs. It uses the
 * exact resolved recipient produced by canonical readiness and rejects any
 * attempt to prepare a preview when the recipient is missing or diverges
 * from the currently-resolved Go Live recipient.
 *
 * Reads the server-rendered snapshot; the browser is never authoritative.
 */
import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  preparePreview, approvePreview, revokePreviewApproval,
  type PreviewSnapshot, type PreviewApprovalRecord,
} from "@/platform/communication-hub/previewApprovalService";
import { maskEmail } from "../utils/mask";

export type PreviewRecipientSource =
  | "single_configured_recipient"
  | "approved_named_recipient"
  | "operator_selected_approved_recipient";

const RECIPIENT_SOURCE_LABEL: Record<PreviewRecipientSource, string> = {
  single_configured_recipient: "Single Configured Recipient",
  approved_named_recipient: "Approved Named Recipient",
  operator_selected_approved_recipient: "Operator Selected Approved Recipient",
};

export interface PreviewLockedContext {
  moduleCode: string;
  eventCode: string;
  channel: string;
  resolvedRecipient: string;
  recipientSource: PreviewRecipientSource;
  templateVersionId?: string | null;
  testDataSource?: string | null;
}

interface Props {
  defaultModuleCode?: string;
  defaultEventCode?: string;
  defaultChannel?: string;
  /** CH-SIMPLE-P3F-UX.6B: when supplied, panel is locked to this context.
   *  A missing or diverging recipient blocks preview generation. */
  lockedContext?: PreviewLockedContext | null;
  onApproved?: (approval: PreviewApprovalRecord, snapshot: PreviewSnapshot) => void;
  onRevoked?: (approval: PreviewApprovalRecord) => void;
}

function normalize(v: string | null | undefined): string {
  return String(v ?? "").trim().toLowerCase();
}

export default function PreviewApprovalPanel({
  defaultModuleCode = "BENEFITS",
  defaultEventCode = "AWARD_ISSUED",
  defaultChannel = "email",
  lockedContext = null,
  onApproved,
  onRevoked,
}: Props) {
  const locked = !!lockedContext;
  const [moduleCode, setModuleCode] = useState(lockedContext?.moduleCode ?? defaultModuleCode);
  const [eventCode, setEventCode] = useState(lockedContext?.eventCode ?? defaultEventCode);
  const [channel, setChannel] = useState(lockedContext?.channel ?? defaultChannel);
  const [freeToRecipients, setFreeToRecipients] = useState("");
  const [reason, setReason] = useState("");
  const [snapshot, setSnapshot] = useState<PreviewSnapshot | null>(null);
  const [approval, setApproval] = useState<PreviewApprovalRecord | null>(null);
  const [busy, setBusy] = useState<null | "prepare" | "approve" | "revoke">(null);
  const [divergenceError, setDivergenceError] = useState<string | null>(null);

  // When operating under a locked context, always mirror the parent state.
  const effModule = lockedContext?.moduleCode ?? moduleCode;
  const effEvent = lockedContext?.eventCode ?? eventCode;
  const effChannel = lockedContext?.channel ?? channel;
  const effRecipient = lockedContext?.resolvedRecipient ?? null;

  const recipientMissing = locked && !effRecipient;
  const recipientDivergesFromSnapshot = useMemo(() => {
    if (!locked || !snapshot || !effRecipient) return false;
    const snapTo = (snapshot.to_recipients ?? []).map(normalize);
    return !(snapTo.length === 1 && snapTo[0] === normalize(effRecipient));
  }, [locked, snapshot, effRecipient]);

  // CH-SIMPLE-P3F-UX.6H — Single authoritative approval gate.
  // Content is "complete" only when the server-rendered subject/body contain
  // no unresolved `{{...}}` placeholders. This is a defense-in-depth check on
  // top of the server's `unresolved_variables` list.
  const rawPlaceholderPattern = /\{\{\s*[\w.$-]+\s*\}\}/;
  const contentIsComplete = useMemo(() => {
    if (!snapshot) return false;
    const subj = snapshot.rendered_subject ?? "";
    const html = snapshot.rendered_body_html ?? "";
    const text = snapshot.rendered_body_text ?? "";
    return !rawPlaceholderPattern.test(subj)
      && !rawPlaceholderPattern.test(html)
      && !rawPlaceholderPattern.test(text);
  }, [snapshot]);
  const unresolvedRequiredVariables = snapshot?.unresolved_variables ?? [];
  const approvalInProgress = busy === "approve";
  const snapshotIsPrepared = snapshot?.status === "PREPARED";
  const canApprovePreview =
    !!snapshot &&
    snapshotIsPrepared &&
    unresolvedRequiredVariables.length === 0 &&
    contentIsComplete &&
    !approvalInProgress &&
    !(locked && recipientDivergesFromSnapshot) &&
    reason.trim().length > 0;

  const approvalBlockers = useMemo(() => {
    if (!snapshot) return [] as string[];
    const list: string[] = [];
    if (!snapshotIsPrepared) list.push(`Snapshot status is ${snapshot.status}; refresh the preview.`);
    if (unresolvedRequiredVariables.length > 0) {
      list.push(
        `Preview has ${unresolvedRequiredVariables.length} unresolved required variable${unresolvedRequiredVariables.length === 1 ? "" : "s"}: ${unresolvedRequiredVariables.join(", ")}.`
      );
    }
    if (!contentIsComplete && unresolvedRequiredVariables.length === 0) {
      list.push("Rendered content still contains raw {{…}} placeholders. Preview cannot be approved.");
    }
    if (locked && recipientDivergesFromSnapshot) {
      list.push("Recipient context changed since this snapshot was prepared. Refresh the preview.");
    }
    if (reason.trim().length === 0) list.push("Approval reason is required.");
    return list;
  }, [snapshot, snapshotIsPrepared, unresolvedRequiredVariables, contentIsComplete, locked, recipientDivergesFromSnapshot, reason]);


  async function handlePrepare() {
    setDivergenceError(null);
    if (locked) {
      if (!effRecipient) {
        setDivergenceError("Cannot prepare a preview — no resolved test recipient.");
        return;
      }
    }
    setBusy("prepare");
    try {
      const to = locked
        ? [effRecipient!]
        : freeToRecipients.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
      const snap = await preparePreview({
        moduleCode: effModule,
        eventCode: effEvent,
        channel: effChannel,
        sendContext: "preview",
        toRecipients: to,
      });
      setSnapshot(snap);
      setApproval(null);
      toast.success(`Preview prepared (snapshot ${snap.snapshot_id.slice(0, 8)}…)`);
    } catch (e: any) {
      toast.error(e?.message ?? "preparePreview failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleApprove() {
    if (!snapshot) return;
    if (!reason.trim()) {
      toast.error("Approval reason is required");
      return;
    }
    if (locked && recipientDivergesFromSnapshot) {
      setDivergenceError(
        "Recipient context changed since this snapshot was prepared. Re-run readiness and prepare a fresh preview.",
      );
      return;
    }
    setBusy("approve");
    try {
      const rec = await approvePreview({
        snapshotId: snapshot.snapshot_id,
        approvalReason: reason.trim(),
        expectedContentHash: snapshot.content_hash,
      });
      setApproval(rec);
      toast.success(`Preview approved (approval ${rec.approval_id.slice(0, 8)}…)`);
      if (snapshot) onApproved?.(rec, snapshot);
    } catch (e: any) {
      toast.error(e?.message ?? "approvePreview failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleRevoke() {
    if (!approval) return;
    setBusy("revoke");
    try {
      await revokePreviewApproval({
        approvalId: approval.approval_id,
        revocationReason: reason.trim() || "revoked from preview panel",
      });
      const revoked = { ...approval, status: "REVOKED" as const };
      setApproval(revoked);
      onRevoked?.(revoked);
      toast.success("Approval revoked");
    } catch (e: any) {
      toast.error(e?.message ?? "revokePreviewApproval failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {locked ? (
        <div className="rounded-md border bg-muted/30 p-3 space-y-1 text-sm">
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Locked context (from Go Live)
          </div>
          <div><strong>Module:</strong> <code className="font-mono">{effModule}</code></div>
          <div><strong>Event:</strong> <code className="font-mono">{effEvent}</code></div>
          <div><strong>Channel:</strong> <code>{effChannel}</code></div>
          <div>
            <strong>Test recipient:</strong>{" "}
            {effRecipient ? maskEmail(effRecipient) : <span className="text-destructive">not resolved</span>}
            {lockedContext?.recipientSource && (
              <Badge variant="outline" className="ml-2 text-[10px]">
                {RECIPIENT_SOURCE_LABEL[lockedContext.recipientSource]}
              </Badge>
            )}
          </div>
          {lockedContext?.testDataSource && (
            <div><strong>Test-data source:</strong> {lockedContext.testDataSource}</div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Module Code</Label>
              <Input value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} />
            </div>
            <div>
              <Label>Event Code</Label>
              <Input value={eventCode} onChange={(e) => setEventCode(e.target.value)} />
            </div>
            <div>
              <Label>Channel</Label>
              <Input value={channel} onChange={(e) => setChannel(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>To Recipients (comma separated)</Label>
            <Input value={freeToRecipients} onChange={(e) => setFreeToRecipients(e.target.value)} />
          </div>
        </>
      )}

      {recipientMissing && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Recipient context changed</AlertTitle>
          <AlertDescription>
            The approved test recipient is not resolved. Re-check readiness before generating a preview.
          </AlertDescription>
        </Alert>
      )}
      {divergenceError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Recipient context changed</AlertTitle>
          <AlertDescription>{divergenceError}</AlertDescription>
        </Alert>
      )}

      <div>
        <Label>Approval Reason / Confirmation Note</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Required to approve or revoke a preview"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handlePrepare}
          disabled={busy !== null || recipientMissing}
          data-testid="preview-prepare"
        >
          {busy === "prepare" ? "Preparing…" : "Refresh Preview"}
        </Button>
        <Button
          onClick={handleApprove}
          disabled={!canApprovePreview}
          variant="default"
          data-testid="preview-approve"
          title={approvalBlockers[0] ?? "Approve this preview snapshot"}
        >
          {approvalInProgress ? "Approving…" : "Approve Preview"}
        </Button>

        <Button
          onClick={handleRevoke}
          disabled={!approval || approval.status !== "ACTIVE" || busy !== null}
          variant="destructive"
        >
          {busy === "revoke" ? "Revoking…" : "Revoke Approval"}
        </Button>
      </div>

      {snapshot && (
        <div className="border rounded-md p-3 space-y-2 bg-muted/30">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">Snapshot</Badge>
            <span className="text-xs font-mono">{snapshot.snapshot_id}</span>
            <Badge>{snapshot.status}</Badge>
            <span className="text-xs text-muted-foreground">
              generated {new Date().toLocaleTimeString()} · expires {new Date(snapshot.expires_at).toLocaleTimeString()}
            </span>
          </div>
          <div className="text-sm space-y-0.5">
            <div>
              <strong>Recipient:</strong>{" "}
              {(snapshot.to_recipients ?? []).map((r) => maskEmail(r)).join(", ") || "—"}
              {locked && lockedContext?.recipientSource && (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  {RECIPIENT_SOURCE_LABEL[lockedContext.recipientSource]}
                </Badge>
              )}
            </div>
            <div><strong>Template Version:</strong> {snapshot.template_version_id ?? "—"}</div>
            <div><strong>Sender Profile:</strong> {snapshot.sender_profile_id ?? "—"}</div>
            <div><strong>Recipient Policy v:</strong> {snapshot.recipient_policy_version ?? "—"}</div>
            <div><strong>Content Hash:</strong> <code className="text-xs">{snapshot.content_hash}</code></div>
            {locked && lockedContext?.testDataSource && (
              <div><strong>Test-data source:</strong> {lockedContext.testDataSource}</div>
            )}
          </div>
          {(snapshot.unresolved_variables ?? []).length > 0 && (
            <div className="text-sm text-destructive">
              <strong>Unresolved variables:</strong>{" "}
              {(snapshot.unresolved_variables ?? []).join(", ")}
            </div>
          )}
          <div className="pt-2">
            <div className="text-xs font-semibold mb-1">Rendered Subject</div>
            <div className="text-sm p-2 bg-background border rounded">{snapshot.rendered_subject ?? "(no subject)"}</div>
          </div>
          <div>
            <div className="text-xs font-semibold mb-1">Rendered Body (HTML)</div>
            <div
              className="text-sm p-2 bg-background border rounded max-h-64 overflow-auto"
              // Rendered by the server; the frontend only displays it.
              dangerouslySetInnerHTML={{ __html: snapshot.rendered_body_html ?? "" }}
            />
          </div>
        </div>
      )}

      {approval && (
        <div className="border rounded-md p-3 bg-muted/30">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">Approval</Badge>
            <span className="text-xs font-mono">{approval.approval_id}</span>
            <Badge variant={approval.status === "ACTIVE" ? "default" : "destructive"}>
              {approval.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              expires {new Date(approval.expires_at).toLocaleTimeString()}
            </span>
            {locked && effRecipient && (
              <span className="text-xs text-muted-foreground">
                · bound to {maskEmail(effRecipient)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
