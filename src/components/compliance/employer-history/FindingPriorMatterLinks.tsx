/**
 * FindingPriorMatterLinks
 * Per-finding affordance: opens a popover panel listing the employer's
 * compliance history with "Link" buttons that attach to this finding.
 * Also shows what's already linked.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { Link2, X } from 'lucide-react';
import {
  listPriorMatterLinksForFinding,
  deactivatePriorMatterLink,
} from '@/services/auditPriorMatterLinkService';
import { EmployerComplianceHistoryPanel } from '@/components/compliance/employer-history/EmployerComplianceHistoryPanel';
import { toast } from 'sonner';

interface Props {
  findingId: string;
  employerId: string;
}

export function FindingPriorMatterLinks({ findingId, employerId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const queryKey = ['ce_apml_finding', findingId];

  const { data: links = [] } = useQuery({
    queryKey,
    queryFn: () => listPriorMatterLinksForFinding(findingId),
    enabled: !!findingId,
    staleTime: 30_000,
  });

  const refresh = () => qc.invalidateQueries({ queryKey });

  const handleUnlink = async (id: string) => {
    try {
      await deactivatePriorMatterLink(id);
      toast.success('Unlinked');
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to unlink');
    }
  };

  return (
    <div className="pt-2 border-t space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Linked prior matters {links.length > 0 && `(${links.length})`}
        </span>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <Link2 className="h-3 w-3 mr-1" />Link prior matter
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Link prior matter to this finding</SheetTitle>
              <SheetDescription>
                Browse the employer's compliance history and click <span className="font-medium">Link</span>
                {' '}on any item to attach it to this finding.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4">
              <EmployerComplianceHistoryPanel
                employerId={employerId}
                findingId={findingId}
                onLinked={refresh}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {links.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {links.map(l => (
            <div
              key={l.id}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/60 text-xs"
              title={l.relevance_note ?? undefined}
            >
              <Badge variant="outline" className="text-[10px] px-1 py-0">{l.matter_type}</Badge>
              <span className="font-medium truncate max-w-[180px]">{l.matter_label ?? l.matter_id}</span>
              <button
                type="button"
                onClick={() => handleUnlink(l.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Unlink"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
