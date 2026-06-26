import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ImageOff, Replace, X } from "lucide-react";
import { AssetPreview } from "@/components/comm/AssetPreview";
import { AssetPickerDialog } from "@/components/comm/AssetPickerDialog";
import type { CommMediaAsset, CommAssetCategory } from "@/hooks/comm/useMediaAssets";

const sb = supabase as any;

interface Props {
  label: string;
  category: CommAssetCategory;
  /** asset id currently bound */
  value: string | null | undefined;
  onChange: (assetId: string | null, asset: CommMediaAsset | null) => void;
  hint?: string;
  allowClear?: boolean;
}

/**
 * Single-asset slot picker. Shows current asset preview and a "Change / Pick"
 * button that opens the 3-way AssetPickerDialog (upload / library / URL).
 */
export function AssetPickerField({ label, category, value, onChange, hint, allowClear = true }: Props) {
  const [open, setOpen] = useState(false);
  const [asset, setAsset] = useState<CommMediaAsset | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!value) { setAsset(null); return; }
      const { data } = await sb.from("comm_media_asset").select("*").eq("id", value).maybeSingle();
      if (!cancelled) setAsset(data ?? null);
    })();
    return () => { cancelled = true; };
  }, [value]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <Badge variant="outline" className="text-[10px]">{category}</Badge>
      </div>
      <div className="flex items-center gap-3 rounded-md border p-2">
        {asset ? (
          <AssetPreview asset={asset} className="h-14 w-20" />
        ) : (
          <div className="h-14 w-20 flex items-center justify-center rounded border bg-muted text-muted-foreground">
            <ImageOff className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{asset?.name ?? <span className="text-muted-foreground italic">No asset bound</span>}</div>
          {asset && <div className="text-[11px] text-muted-foreground truncate">{asset.source} · v{asset.version} · {asset.approval_status}</div>}
        </div>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Replace className="h-3.5 w-3.5 mr-1" /> {asset ? "Change" : "Pick"}
          </Button>
          {asset && allowClear && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null, null)} title="Clear">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}

      <AssetPickerDialog
        open={open}
        onOpenChange={setOpen}
        category={category}
        slotLabel={label}
        onPicked={(a) => { setAsset(a); onChange(a.id, a); }}
      />
    </div>
  );
}
