import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAssetWhereUsed } from "@/hooks/comm/useApprovedAssets";
import { Eye, Loader2 } from "lucide-react";

export function WhereUsedButton({ assetId, assetName }: { assetId: string | null; assetName?: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" variant="ghost" disabled={!assetId} onClick={() => setOpen(true)} title="Where used">
        <Eye className="h-3.5 w-3.5" />
      </Button>
      {open && assetId && <WhereUsedDialog assetId={assetId} assetName={assetName} onClose={() => setOpen(false)} />}
    </>
  );
}

function WhereUsedDialog({ assetId, assetName, onClose }: { assetId: string; assetName?: string | null; onClose: () => void }) {
  const { data, isLoading } = useAssetWhereUsed(assetId);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Where used — {assetName ?? assetId.slice(0, 8)}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Not referenced anywhere. Safe to delete or archive.</p>
        ) : (
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {data.map((row, i) => (
              <div key={i} className="flex items-center gap-2 border rounded px-2 py-1.5 text-sm">
                <Badge variant="outline" className="text-[10px]">{row.scope}</Badge>
                <span className="font-medium truncate">{row.ref_name ?? row.ref_code ?? row.ref_id}</span>
                {row.detail && <span className="text-xs text-muted-foreground truncate">· {row.detail}</span>}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
