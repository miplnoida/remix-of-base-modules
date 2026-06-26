/**
 * LegalMatterAiSummary
 *
 * Renders the structured AI context built by legalMatterWorkspaceService.buildAiContext.
 * This is the canonical "prompt context" surface — any AI feature in Legal can copy
 * this JSON into its prompt, or pass it through programmatically via useLegalMatterAiContext.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { legalMatterWorkspaceService } from "@/services/legal/legalMatterWorkspaceService";

interface Props {
  matterId: string | null | undefined;
}

export function LegalMatterAiSummary({ matterId }: Props) {
  const { toast } = useToast();
  const [ctx, setCtx] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!matterId) { setCtx(null); return; }
    setLoading(true);
    legalMatterWorkspaceService.buildAiContext(matterId)
      .then((c) => { if (!cancelled) setCtx(c); })
      .catch(() => { if (!cancelled) setCtx(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [matterId]);

  if (!matterId) return null;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> AI Matter Context
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          disabled={!ctx}
          onClick={() => {
            if (!ctx) return;
            navigator.clipboard.writeText(JSON.stringify(ctx, null, 2));
            toast({ title: "Copied", description: "AI context copied to clipboard." });
          }}
        >
          <Copy className="h-3 w-3 mr-1" /> Copy
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Building context…
          </div>
        ) : ctx ? (
          <pre className="text-[11px] bg-muted/40 rounded p-2 overflow-x-auto max-h-64">
{JSON.stringify(ctx, null, 2)}
          </pre>
        ) : (
          <div className="text-xs text-muted-foreground">No AI context available for this matter.</div>
        )}
      </CardContent>
    </Card>
  );
}

export default LegalMatterAiSummary;
