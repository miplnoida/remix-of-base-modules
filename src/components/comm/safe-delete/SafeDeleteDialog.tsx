import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { WhereUsedPanel } from "./WhereUsedPanel";
import { useWhereUsed, useSafeDelete, useArchive } from "@/hooks/comm/useSafeDelete";
import { ENTITY_LABEL, type CommEntityType } from "@/lib/comm/referenceRegistry";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entityType: CommEntityType;
  entityId: string;
  entityName?: string;
  matchKey?: string;
  /** Called after a successful delete/archive */
  onCompleted?: () => void;
}

export function SafeDeleteDialog({ open, onOpenChange, entityType, entityId, entityName, matchKey, onCompleted }: Props) {
  const [reason, setReason] = useState("");
  const { data } = useWhereUsed(entityType, open ? entityId : null, matchKey);
  const del = useSafeDelete(entityType);
  const arch = useArchive(entityType);
  const busy = del.isPending || arch.isPending;
  const allowed = !!data?.allowed;
  const reasonOk = reason.trim().length >= 4;

  const handleDelete = async () => {
    if (!reasonOk || !allowed) return;
    await del.mutateAsync({ id: entityId, reason: reason.trim(), matchKey });
    onOpenChange(false);
    setReason("");
    onCompleted?.();
  };
  const handleArchive = async () => {
    if (!reasonOk) return;
    await arch.mutateAsync({ id: entityId, reason: reason.trim() });
    onOpenChange(false);
    setReason("");
    onCompleted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Delete {ENTITY_LABEL[entityType]}{entityName ? ` — ${entityName}` : ""}</DialogTitle>
          <DialogDescription>
            Deletion is permitted only when no references remain. Otherwise use Archive, or open Replace References first.
          </DialogDescription>
        </DialogHeader>

        <WhereUsedPanel entityType={entityType} entityId={entityId} matchKey={matchKey} />

        <div className="space-y-1.5">
          <Label htmlFor="sd-reason">Reason (required, audited)</Label>
          <Textarea id="sd-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this item being removed?" rows={3} />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button variant="secondary" onClick={handleArchive} disabled={!reasonOk || busy}>
            {arch.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Archive
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={!allowed || !reasonOk || busy}>
            {del.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {allowed ? "Delete permanently" : "Cannot Delete — In Use"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
