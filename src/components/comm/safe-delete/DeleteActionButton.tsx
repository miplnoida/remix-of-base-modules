import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Replace, Archive } from "lucide-react";
import { SafeDeleteDialog } from "./SafeDeleteDialog";
import { ReplaceReferencesDialog } from "./ReplaceReferencesDialog";
import { useWhereUsed } from "@/hooks/comm/useSafeDelete";
import { useIsAdmin } from "@/hooks/useNavigationMenu";
import type { CommEntityType } from "@/lib/comm/referenceRegistry";

interface Props {
  entityType: CommEntityType;
  entityId: string;
  entityName?: string;
  matchKey?: string;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "destructive";
  showReplace?: boolean;
  onCompleted?: () => void;
}

/**
 * Drop-in delete control with safe-delete, archive and replace-references workflows.
 * Admin-only by default.
 */
export function DeleteActionButton({
  entityType,
  entityId,
  entityName,
  matchKey,
  size = "sm",
  variant = "outline",
  showReplace = true,
  onCompleted,
}: Props) {
  const isAdmin = useIsAdmin();
  const [delOpen, setDelOpen] = useState(false);
  const [repOpen, setRepOpen] = useState(false);
  const { data } = useWhereUsed(entityType, entityId, matchKey);

  if (!isAdmin) return null;

  const blocked = !!data && !data.allowed;
  const refCount = data?.hits.length ?? 0;

  return (
    <>
      <div className="flex gap-1">
        <Button
          size={size}
          variant={blocked ? "outline" : variant}
          title={blocked ? `Cannot delete — used in ${refCount} place(s)` : "Delete"}
          onClick={() => setDelOpen(true)}
        >
          {blocked ? <Archive className="h-3.5 w-3.5 mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
          {blocked ? `In Use (${refCount})` : "Delete"}
        </Button>
        {showReplace && blocked && (
          <Button size={size} variant="outline" title="Replace references" onClick={() => setRepOpen(true)}>
            <Replace className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <SafeDeleteDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        matchKey={matchKey}
        onCompleted={onCompleted}
      />
      <ReplaceReferencesDialog
        open={repOpen}
        onOpenChange={setRepOpen}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        onCompleted={onCompleted}
      />
    </>
  );
}
