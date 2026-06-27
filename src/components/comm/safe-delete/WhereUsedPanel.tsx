import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWhereUsed } from "@/hooks/comm/useSafeDelete";
import { groupHits } from "@/lib/comm/referenceScanner";
import type { CommEntityType } from "@/lib/comm/referenceRegistry";

interface Props {
  entityType: CommEntityType;
  entityId: string;
  /** For text blocks, pass the text_block_code instead of row id when scanning */
  matchKey?: string;
}

export function WhereUsedPanel({ entityType, entityId, matchKey }: Props) {
  const { data, isLoading } = useWhereUsed(entityType, entityId, matchKey);

  if (isLoading) return <div className="text-sm text-muted-foreground py-4">Scanning references…</div>;
  if (!data) return null;

  const grouped = groupHits(data.hits);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm">
          {data.hits.length === 0 ? (
            <span className="text-emerald-600 font-medium">No references found — safe to delete.</span>
          ) : (
            <span><strong>{data.hits.length}</strong> reference{data.hits.length === 1 ? "" : "s"} found.</span>
          )}
        </p>
        {data.reasons.length > 0 && (
          <Badge variant="destructive" className="text-[10px]">Delete blocked</Badge>
        )}
      </div>

      {data.reasons.length > 0 && (
        <ul className="text-xs text-destructive list-disc pl-5 space-y-0.5">
          {data.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}

      {grouped.length > 0 && (
        <ScrollArea className="h-64 rounded border">
          <div className="p-3 space-y-3">
            {grouped.map(([group, hits]) => (
              <div key={group}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">{group}</Badge>
                  <span className="text-xs text-muted-foreground">{hits.length}</span>
                </div>
                <ul className="space-y-1">
                  {hits.map((h, i) => (
                    <li key={`${h.source.table}-${h.recordId}-${i}`} className="flex items-start justify-between gap-2 text-xs border-l-2 border-muted pl-2 py-1">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{h.recordLabel ?? h.recordId ?? "(unnamed)"}</div>
                        <div className="text-muted-foreground truncate">{h.source.label}</div>
                      </div>
                      {h.route && (
                        <Button size="sm" variant="ghost" asChild className="h-6 px-2 shrink-0">
                          <a href={h.route} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
