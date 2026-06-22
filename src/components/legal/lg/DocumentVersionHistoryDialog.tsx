import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, History } from "lucide-react";
import { coreDmsService } from "@/services/core/coreDmsService";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  dmsDocumentId: string | null;
  title?: string | null;
}

export function DocumentVersionHistoryDialog({ open, onOpenChange, dmsDocumentId, title }: Props) {
  const q = useQuery({
    queryKey: ["lg_doc_versions", dmsDocumentId],
    enabled: open && !!dmsDocumentId,
    queryFn: () => coreDmsService.getVersionHistory(dmsDocumentId!),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Version history</DialogTitle>
          <DialogDescription>{title || dmsDocumentId || "—"}</DialogDescription>
        </DialogHeader>
        {q.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : !q.data?.length ? (
          <p className="text-sm text-muted-foreground">No version history.</p>
        ) : (
          <div className="border rounded">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-2">v</th>
                  <th className="text-left p-2">File</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-right p-2">Size</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">By</th>
                  <th className="text-left p-2">When</th>
                </tr>
              </thead>
              <tbody>
                {q.data.map((v: any) => (
                  <tr key={v.id} className="border-t">
                    <td className="p-2 font-mono">{v.version_no}</td>
                    <td className="p-2">{v.file_name || "—"}</td>
                    <td className="p-2 text-xs text-muted-foreground">{v.mime_type || "—"}</td>
                    <td className="p-2 text-right">{v.size_bytes ? `${(v.size_bytes / 1024).toFixed(1)} KB` : "—"}</td>
                    <td className="p-2"><Badge variant="outline">{v.upload_status}</Badge></td>
                    <td className="p-2">{v.uploaded_by || "—"}</td>
                    <td className="p-2">{v.uploaded_at ? new Date(v.uploaded_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
