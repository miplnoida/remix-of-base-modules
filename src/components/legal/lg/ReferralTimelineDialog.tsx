import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { legalReferralCollaborationService } from "@/services/legal/legalReferralCollaborationService";
import { Clock, FileText, MessageSquare, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  referralId: string;
  referralNo?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EVENT_STYLES: Record<string, { color: string; icon: any }> = {
  REFERRAL_CREATED: { color: "bg-blue-100 text-blue-800", icon: FileText },
  INFO_REQUESTED: { color: "bg-amber-100 text-amber-800", icon: AlertCircle },
  INFO_RESPONDED: { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  INFO_REQUEST_RESPONDED: { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
};

export function ReferralTimelineDialog({ referralId, referralNo, open, onOpenChange }: Props) {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["referral-timeline", referralId],
    queryFn: () => legalReferralCollaborationService.getReferralStatusTimeline(referralId),
    enabled: open && !!referralId,
  });

  const sorted = [...entries].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Referral Timeline
          </DialogTitle>
          <DialogDescription>
            {referralNo ? <Badge variant="outline">{referralNo}</Badge> : null} Complete history of events for this legal referral.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          {isLoading && <div className="text-sm text-muted-foreground py-6 text-center">Loading...</div>}
          {!isLoading && sorted.length === 0 && (
            <div className="text-sm text-muted-foreground py-6 text-center">No events yet.</div>
          )}
          <ol className="relative border-l border-border ml-3 space-y-4 py-2">
            {sorted.map((e, idx) => {
              const code = e.event_code?.replace(/^STATUS_/, "") ?? "EVENT";
              const style = EVENT_STYLES[code] ?? EVENT_STYLES[e.event_code] ?? { color: "bg-muted text-foreground", icon: MessageSquare };
              const Icon = style.icon;
              return (
                <li key={idx} className="ml-4">
                  <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-background border">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge className={style.color}>{code.replace(/_/g, " ")}</Badge>
                    <Badge variant="outline" className="text-xs">{e.event_module}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.at).toLocaleString()}
                    </span>
                    {e.actor && <span className="text-xs text-muted-foreground">· {e.actor}</span>}
                  </div>
                  {e.notes && (
                    <div className="text-sm whitespace-pre-wrap bg-muted/40 rounded p-2">{e.notes}</div>
                  )}
                  {e.metadata?.document_count > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {e.metadata.document_count} document(s) attached
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
