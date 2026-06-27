import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Upload, Loader2, Crown, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadMasterLogo, generateAllDerivedAssets } from "@/lib/comm/logoGenerator";
import { SSB_MASTER_SLOT, DERIVED_ASSET_SPECS } from "@/lib/comm/derivedAssetSpecs";
import { getSignedUrl } from "@/hooks/comm/useMediaAssets";

const sb = supabase as any;

function useMaster() {
  return useQuery({
    queryKey: ["comm_media_asset", "master", SSB_MASTER_SLOT],
    queryFn: async () => {
      const { data } = await sb
        .from("comm_media_asset")
        .select("id, name, storage_path, version_no, generated_at, checksum_sha256, updated_at")
        .eq("usage_slot", SSB_MASTER_SLOT)
        .maybeSingle();
      if (!data) return null;
      const url = data.storage_path ? await getSignedUrl(data.storage_path, 3600) : null;
      return { ...data, url };
    },
    staleTime: 60_000,
  });
}

function useDerivedCount() {
  return useQuery({
    queryKey: ["comm_media_asset", "derived_count"],
    queryFn: async () => {
      const { count } = await sb
        .from("comm_media_asset")
        .select("id", { count: "exact", head: true })
        .eq("asset_type", "DERIVED")
        .eq("is_active", true)
        .eq("is_default", true);
      return count ?? 0;
    },
    staleTime: 30_000,
  });
}

export function MasterLogoCard() {
  const qc = useQueryClient();
  const { data: master, isLoading } = useMaster();
  const { data: derivedActive = 0 } = useDerivedCount();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; current?: string } | null>(null);

  const handleUpload = async () => {
    if (!file) { toast.error("Choose the official SSB logo PNG."); return; }
    try {
      setBusy(true);
      await uploadMasterLogo(file);
      toast.success("Master logo uploaded.");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["comm_media_asset"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally { setBusy(false); }
  };

  const handleGenerate = async () => {
    try {
      setBusy(true);
      setProgress({ done: 0, total: DERIVED_ASSET_SPECS.length });
      const result = await generateAllDerivedAssets({
        onProgress: (p) => setProgress(p),
      });
      toast.success(`Generated ${result.generated.length} derived assets · archived ${result.archived} placeholders.`);
      qc.invalidateQueries({ queryKey: ["comm_media_asset"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Generation failed");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Official SSB Master Logo
                {master && <Badge variant="secondary" className="text-[10px]">v{master.version_no ?? 1}</Badge>}
              </CardTitle>
              <CardDescription className="text-xs mt-1 max-w-xl">
                Upload the official Social Security Board logo <strong>once</strong>. The system auto-generates all {DERIVED_ASSET_SPECS.length} derived branding assets (logos, favicons, app icons, letterheads, watermarks, portal banners) and wires them into organization defaults.
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-[10px]">{SSB_MASTER_SLOT}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-[180px_1fr] gap-4 items-start">
          <div className="aspect-square rounded-lg border bg-muted/40 flex items-center justify-center overflow-hidden">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> :
              master?.url ? <img src={master.url} alt="SSB master logo" className="max-h-full max-w-full object-contain p-3" /> :
              <span className="text-xs text-muted-foreground px-3 text-center">No master logo yet.</span>}
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded border p-2">
                <p className="text-muted-foreground">Master version</p>
                <p className="font-semibold">{master ? `v${master.version_no ?? 1}` : "—"}</p>
              </div>
              <div className="rounded border p-2">
                <p className="text-muted-foreground">Active derived defaults</p>
                <p className="font-semibold">{derivedActive} / {DERIVED_ASSET_SPECS.length}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Replace master logo (PNG recommended)</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="h-9 max-w-xs"
                  disabled={busy}
                />
                <Button size="sm" variant="outline" onClick={handleUpload} disabled={!file || busy}>
                  <Upload className="h-3.5 w-3.5 mr-1" /> Upload Master
                </Button>
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={!master || busy}
                  className="bg-primary"
                >
                  {derivedActive > 0
                    ? <><RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerate Derived Assets</>
                    : <><Sparkles className="h-3.5 w-3.5 mr-1" /> Generate Derived Assets</>}
                </Button>
              </div>
              {!master && <p className="text-[11px] text-muted-foreground">Upload the master logo first — derived assets will not generate without it.</p>}
              {progress && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate">{progress.current ?? "Working…"}</span>
                    <span className="font-mono">{progress.done}/{progress.total}</span>
                  </div>
                  <Progress value={(progress.done / Math.max(1, progress.total)) * 100} className="h-1.5" />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
