import { useEffect, useState } from "react";
import { getSignedUrl, type CommMediaAsset } from "@/hooks/comm/useMediaAssets";
import { ImageIcon } from "lucide-react";

export function AssetPreview({ asset, className = "h-24 w-24" }: { asset: CommMediaAsset; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (asset.source === "external_url") {
        setUrl(asset.external_url);
      } else if (asset.storage_path) {
        const signed = await getSignedUrl(asset.storage_path);
        if (!cancelled) setUrl(signed ?? null);
      }
    })();
    return () => { cancelled = true; };
  }, [asset.id, asset.source, asset.storage_path, asset.external_url]);

  const isImage = (asset.mime_type ?? "").startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|svg|ico|bmp)$/i.test(asset.external_url ?? asset.storage_path ?? "");

  if (!url) {
    return (
      <div className={`${className} flex items-center justify-center rounded border bg-muted text-muted-foreground`}>
        <ImageIcon className="h-5 w-5" />
      </div>
    );
  }

  if (isImage) {
    return (
      <img
        src={url}
        alt={asset.name}
        className={`${className} rounded border object-contain bg-background`}
        onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
      />
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className={`${className} flex items-center justify-center rounded border text-xs underline`}>
      Open file
    </a>
  );
}
