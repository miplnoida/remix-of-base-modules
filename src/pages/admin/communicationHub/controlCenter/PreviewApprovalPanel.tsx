/**
 * CH-SIMPLE-P3C — Server-Verifiable Preview & Approval reusable panel.
 *
 * Reads the server-rendered snapshot; the browser is never authoritative.
 * Designed for embedding in the future unified Go Live workflow — this
 * panel is intentionally NOT registered as a top-level navigation item.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  preparePreview, approvePreview, revokePreviewApproval,
  type PreviewSnapshot, type PreviewApprovalRecord,
} from "@/platform/communication-hub/previewApprovalService";

interface Props {
  defaultModuleCode?: string;
  defaultEventCode?: string;
  defaultChannel?: string;
}

export default function PreviewApprovalPanel({
  defaultModuleCode = "BENEFITS",
  defaultEventCode = "AWARD_ISSUED",
  defaultChannel = "email",
}: Props) {
  const [moduleCode, setModuleCode] = useState(defaultModuleCode);
  const [eventCode, setEventCode] = useState(defaultEventCode);
  const [channel, setChannel] = useState(defaultChannel);
  const [toRecipients, setToRecipients] = useState("");
  const [reason, setReason] = useState("");
  const [snapshot, setSnapshot] = useState<PreviewSnapshot | null>(null);
  const [approval, setApproval] = useState<PreviewApprovalRecord | null>(null);
  const [busy, setBusy] = useState<null | "prepare" | "approve" | "revoke">(null);

  async function handlePrepare() {
    setBusy("prepare");
    try {
      const snap = await preparePreview({
        moduleCode, eventCode, channel,
        sendContext: "preview",
        toRecipients: toRecipients.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean),
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
    setBusy("approve");
    try {
      const rec = await approvePreview({
        snapshotId: snapshot.snapshot_id,
        approvalReason: reason.trim(),
        expectedContentHash: snapshot.content_hash,
      });
      setApproval(rec);
      toast.success(`Preview approved (approval ${rec.approval_id.slice(0, 8)}…)`);
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
      setApproval({ ...approval, status: "REVOKED" });
      toast.success("Approval revoked");
    } catch (e: any) {
      toast.error(e?.message ?? "revokePreviewApproval failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
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
        <Input value={toRecipients} onChange={(e) => setToRecipients(e.target.value)} />
      </div>
      <div>
        <Label>Approval Reason / Confirmation Note</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Required to approve or revoke a preview"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={handlePrepare} disabled={busy !== null}>
          {busy === "prepare" ? "Preparing…" : "Refresh Preview"}
        </Button>
        <Button
          onClick={handleApprove}
          disabled={!snapshot || busy !== null || (snapshot?.unresolved_variables?.length ?? 0) > 0}
          variant="default"
        >
          {busy === "approve" ? "Approving…" : "Approve Preview"}
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
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Snapshot</Badge>
            <span className="text-xs font-mono">{snapshot.snapshot_id}</span>
            <Badge>{snapshot.status}</Badge>
            <span className="text-xs text-muted-foreground">
              expires {new Date(snapshot.expires_at).toLocaleTimeString()}
            </span>
          </div>
          <div className="text-sm">
            <div><strong>To:</strong> {(snapshot.to_recipients ?? []).join(", ") || "—"}</div>
            <div><strong>Template Version:</strong> {snapshot.template_version_id ?? "—"}</div>
            <div><strong>Sender Profile:</strong> {snapshot.sender_profile_id ?? "—"}</div>
            <div><strong>Recipient Policy v:</strong> {snapshot.recipient_policy_version ?? "—"}</div>
            <div><strong>Content Hash:</strong> <code className="text-xs">{snapshot.content_hash}</code></div>
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
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Approval</Badge>
            <span className="text-xs font-mono">{approval.approval_id}</span>
            <Badge variant={approval.status === "ACTIVE" ? "default" : "destructive"}>
              {approval.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              expires {new Date(approval.expires_at).toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
