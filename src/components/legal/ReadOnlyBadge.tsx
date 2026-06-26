import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLegalCapability } from "@/hooks/legal/useLegalCapability";

/** Renders a "Read-only access" pill when the current user has LEGAL_READ_ONLY. */
export function ReadOnlyBadge({ className }: { className?: string }) {
  const { capability } = useLegalCapability();
  if (!capability.isReadOnly) return null;
  return (
    <Badge variant="outline" className={`gap-1 border-amber-500/50 text-amber-700 dark:text-amber-400 ${className ?? ""}`}>
      <Eye className="h-3 w-3" />
      Read-only access
    </Badge>
  );
}

export default ReadOnlyBadge;
