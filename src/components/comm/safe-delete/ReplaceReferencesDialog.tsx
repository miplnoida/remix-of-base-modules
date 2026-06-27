import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useReplaceReferences, useWhereUsed } from "@/hooks/comm/useSafeDelete";
import { WhereUsedPanel } from "./WhereUsedPanel";
import { ENTITY_LABEL, type CommEntityType } from "@/lib/comm/referenceRegistry";

const sb = supabase as any;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entityType: CommEntityType;
  entityId: string;
  entityName?: string;
  onCompleted?: () => void;
}

export function ReplaceReferencesDialog({ open, onOpenChange, entityType, entityId, entityName, onCompleted }: Props) {
  const [reason, setReason] = useState("");
  const [newId, setNewId] = useState<string>("");
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
  const replace = useReplaceReferences(entityType);
  const { refetch } = useWhereUsed(entityType, open ? entityId : null);

  useEffect(() => {
    if (!open) return;
    const labelCol = entityType === "core_text_block" ? "name" : "name";
    sb.from(entityType)
      .select(`id, ${labelCol}`)
      .eq("is_active", true)
      .neq("id", entityId)
      .order(labelCol)
      .limit(200)
      .then(({ data }: any) => {
        setOptions((data ?? []).map((r: any) => ({ id: r.id, label: r[labelCol] ?? r.id })));
      });
  }, [open, entityType, entityId]);

  const reasonOk = reason.trim().length >= 4;

  const handleReplace = async () => {
    if (!newId || !reasonOk) return;
    await replace.mutateAsync({ oldId: entityId, newId, reason: reason.trim() });
    await refetch();
    onOpenChange(false);
    setReason("");
    setNewId("");
    onCompleted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Replace References — {ENTITY_LABEL[entityType]}{entityName ? ` (${entityName})` : ""}</DialogTitle>
          <DialogDescription>
            Rewrite every replaceable reference from this item to another active item of the same type.
            Historical generated documents are never rewritten.
          </DialogDescription>
        </DialogHeader>

        <WhereUsedPanel entityType={entityType} entityId={entityId} />

        <div className="space-y-1.5">
          <Label>Replace with</Label>
          <Select value={newId} onValueChange={setNewId}>
            <SelectTrigger><SelectValue placeholder="Choose replacement…" /></SelectTrigger>
            <SelectContent>
              {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rr-reason">Reason (required, audited)</Label>
          <Textarea id="rr-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={replace.isPending}>Cancel</Button>
          <Button onClick={handleReplace} disabled={!newId || !reasonOk || replace.isPending}>
            {replace.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Rewrite references
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
