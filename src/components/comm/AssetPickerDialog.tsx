import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Library, Link as LinkIcon, Search, Check } from "lucide-react";
import {
  useMediaAssets, useSaveMediaAsset, uploadAssetFile,
  type CommMediaAsset, type CommAssetCategory,
} from "@/hooks/comm/useMediaAssets";
import { AssetPreview } from "@/components/comm/AssetPreview";
import { useAssetCategoryMap, getCategoryConfig } from "@/hooks/comm/useAssetCategories";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: CommAssetCategory;
  slotLabel: string;
  /** Called with the picked/created asset. */
  onPicked: (asset: CommMediaAsset) => void;
}

/**
 * Unified 3-way asset picker:
 *   1. Upload a new file
 *   2. Pick an existing asset from the Communication Assets Library
 *   3. Paste an external URL
 * Always persists an entry in comm_media_asset so the asset stays auditable/versionable.
 */
export function AssetPickerDialog({ open, onOpenChange, category, slotLabel, onPicked }: Props) {
  const { data: assets = [], isLoading } = useMediaAssets({ activeOnly: true });
  const { map: catMap } = useAssetCategoryMap();
  const catRow = catMap.get(category);
  const { accept, maxFileSizeKb } = getCategoryConfig(catRow);
  const save = useSaveMediaAsset();
  const [q, setQ] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return assets.filter((a) =>
      (a.category === category || !needle) &&
      (!needle || a.name.toLowerCase().includes(needle))
    );
  }, [assets, q, category]);

  const finish = (asset: CommMediaAsset) => {
    onPicked(asset);
    onOpenChange(false);
    setFile(null); setName(""); setUrl(""); setPickedId(null); setQ("");
  };

  const doUpload = async () => {
    if (!file) { toast.error("Pick a file first"); return; }
    if (file.size > maxFileSizeKb * 1024) {
      toast.error(`File exceeds the ${maxFileSizeKb} KB limit for "${catRow?.category_name ?? category}".`);
      return;
    }
    setBusy(true);
    try {
      const { storage_path, mime_type, file_size_bytes } = await uploadAssetFile(file, category);
      const row: Partial<CommMediaAsset> = {
        name: name || file.name, category, source: "upload", scope: "global",
        storage_path, mime_type, file_size_bytes, is_active: true, version: 1,
        approval_status: "approved",
      };
      await new Promise<void>((resolve, reject) =>
        save.mutate(row, { onSuccess: () => resolve(), onError: reject as any })
      );
      // The mutation doesn't return the row; refetch list and pick by storage_path.
      toast.success("Uploaded and added to library");
      finish({ ...(row as CommMediaAsset), id: storage_path });
    } catch (e: any) { toast.error(e?.message ?? "Upload failed"); }
    finally { setBusy(false); }
  };

  const doExternal = async () => {
    if (!url.trim()) { toast.error("Paste a URL first"); return; }
    setBusy(true);
    try {
      const row: Partial<CommMediaAsset> = {
        name: name || url, category, source: "external_url", scope: "global",
        external_url: url, is_active: true, version: 1, approval_status: "approved",
      };
      await new Promise<void>((resolve, reject) =>
        save.mutate(row, { onSuccess: () => resolve(), onError: reject as any })
      );
      toast.success("External link added to library");
      finish({ ...(row as CommMediaAsset), id: url });
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
    finally { setBusy(false); }
  };

  const doPick = () => {
    const a = assets.find((x) => x.id === pickedId);
    if (!a) { toast.error("Select an asset"); return; }
    finish(a);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose asset for: {slotLabel}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="library">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="library"><Library className="h-4 w-4 mr-2" /> Pick from library</TabsTrigger>
            <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-2" /> Upload new</TabsTrigger>
            <TabsTrigger value="link"><LinkIcon className="h-4 w-4 mr-2" /> External link</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search assets…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="max-h-[360px] overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-2">
              {isLoading ? <div className="col-span-full flex justify-center p-6"><Loader2 className="animate-spin" /></div>
                : matches.length === 0 ? <div className="col-span-full text-center text-sm text-muted-foreground py-8">No matching assets.</div>
                : matches.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => setPickedId(a.id)}
                    className={`relative text-left rounded-md border p-2 hover:bg-muted ${pickedId === a.id ? "ring-2 ring-primary" : ""}`}
                  >
                    {pickedId === a.id && <Check className="absolute top-1 right-1 h-4 w-4 text-primary" />}
                    <AssetPreview asset={a} className="h-20 w-full" />
                    <div className="text-xs font-medium truncate mt-1.5">{a.name}</div>
                    <Badge variant="outline" className="text-[10px] mt-1">{a.category}</Badge>
                  </button>
                ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button disabled={!pickedId} onClick={doPick}>Use this asset</Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="upload" className="space-y-3">
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SSB Official Logo 2026" />
            </div>
            <div className="space-y-2">
              <Label>File</Label>
              <Input type="file" accept={accept} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <p className="text-[11px] text-muted-foreground">Accepted: {accept} · Max {maxFileSizeKb} KB{catRow?.recommended_size ? ` · Recommended ${catRow.recommended_size}` : ""}</p>
              {file && <div className="text-xs text-muted-foreground">{file.name} · {(file.size / 1024).toFixed(1)} KB</div>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={doUpload} disabled={!file || busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload & use"}</Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="link" className="space-y-3">
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CDN-hosted SSB header" />
            </div>
            <div className="space-y-2">
              <Label>External URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/banner.png" />
              <p className="text-xs text-muted-foreground">Tip: official documents should prefer uploaded files over external links.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={doExternal} disabled={!url.trim() || busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save link & use"}</Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
