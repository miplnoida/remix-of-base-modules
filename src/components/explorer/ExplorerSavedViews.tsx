import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Pin, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useExplorerSavedViews, useSaveExplorerView, useDeleteExplorerView, type ExplorerSavedView } from "@/hooks/explorer/useExplorerSavedViews";
import type { ExplorerViewState } from "./types";

interface Props {
  datasetKey: string;
  state: ExplorerViewState;
  onLoad: (state: ExplorerViewState) => void;
}

export function ExplorerSavedViewsControl({ datasetKey, state, onLoad }: Props) {
  const { data: views = [], isLoading } = useExplorerSavedViews(datasetKey);
  const save = useSaveExplorerView();
  const del = useDeleteExplorerView();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"personal" | "role" | "global">("personal");

  const applyView = (v: ExplorerSavedView) => { onLoad(v.view_state); toast({ title: `Loaded view "${v.name}"` }); };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      await save.mutateAsync({ dataset_key: datasetKey, name: name.trim(), scope, view_state: state });
      toast({ title: "View saved" });
      setOpen(false); setName("");
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm"><Bookmark className="h-4 w-4 mr-1" />Saved views{views.length ? ` (${views.length})` : ""}</Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 bg-background z-50">
          <div className="text-xs font-medium mb-2">Saved views</div>
          {isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
          {!isLoading && !views.length && <div className="text-xs text-muted-foreground">No saved views yet.</div>}
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {views.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-2 border rounded px-2 py-1.5 hover:bg-muted/40">
                <button className="text-left flex-1 min-w-0" onClick={() => applyView(v)}>
                  <div className="text-sm font-medium truncate flex items-center gap-1">{v.is_pinned && <Pin className="h-3 w-3" />}{v.name}</div>
                  <div className="text-[10px] text-muted-foreground">{v.scope} • {new Date(v.updated_at).toLocaleDateString()}</div>
                </button>
                <Badge variant="outline" className="text-[10px]">{v.scope}</Badge>
                <button onClick={() => del.mutate({ id: v.id, dataset_key: datasetKey })} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Save className="h-4 w-4 mr-1" />Save view</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save current view</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My open cases" /></div>
            <div><Label>Scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal (only me)</SelectItem>
                  <SelectItem value="role">Role (my team)</SelectItem>
                  <SelectItem value="global">Global (everyone)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim() || save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
