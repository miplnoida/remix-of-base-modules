import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Loader2 } from "lucide-react";
import { useLgTaskAudit } from "@/hooks/legal/useLgWorkflow";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task: any;
}

const ACTION_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  CREATED: "secondary",
  UPDATED: "outline",
  ASSIGNED: "outline",
  STATUS_CHANGED: "outline",
  COMPLETED: "default",
  CLOSED: "default",
  CANCELLED: "destructive",
  ESCALATED: "destructive",
  REOPENED: "secondary",
  ASSIGN_NOTE: "outline",
};

function formatDelta(from: any, to: any): string {
  if (!from && !to) return "";
  try {
    const keys = new Set<string>([...(from ? Object.keys(from) : []), ...(to ? Object.keys(to) : [])]);
    return Array.from(keys).map((k) => {
      const f = from?.[k];
      const t = to?.[k];
      if (f === undefined) return `${k}: → ${JSON.stringify(t)}`;
      if (t === undefined) return `${k}: ${JSON.stringify(f)} →`;
      return `${k}: ${JSON.stringify(f)} → ${JSON.stringify(t)}`;
    }).join(" · ");
  } catch { return ""; }
}

export function LgTaskAuditDialog({ open, onOpenChange, task }: Props) {
  const { data = [], isLoading } = useLgTaskAudit(task?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Task History</DialogTitle>
          <DialogDescription className="truncate">{task?.title}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading history…
            </div>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No audit entries yet.</p>
          ) : (
            <ol className="relative border-l ml-3 space-y-3 py-2">
              {data.map((a) => (
                <li key={a.id} className="ml-4">
                  <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-primary" />
                  <div className="flex items-center gap-2">
                    <Badge variant={ACTION_TONE[a.action] ?? "outline"}>{a.action}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.performed_at).toLocaleString()}
                      {a.performed_by ? ` · ${a.performed_by}` : ""}
                    </span>
                  </div>
                  {(a.from_value || a.to_value) && (
                    <div className="text-xs mt-1 text-muted-foreground break-all">{formatDelta(a.from_value, a.to_value)}</div>
                  )}
                  {a.note && <div className="text-sm mt-1">{a.note}</div>}
                </li>
              ))}
            </ol>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default LgTaskAuditDialog;
