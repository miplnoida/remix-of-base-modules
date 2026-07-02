import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { ExplorerDatasetDescriptor } from "../types";

interface Props<T> { dataset: ExplorerDatasetDescriptor<T>; rows: T[]; onRowClick?: (row: T) => void }

/** Basic map view: renders a bounding-box SVG with plotted points.
 * Full tile-based mapping (Leaflet/Mapbox) can be wired later per dataset. */
export function ExplorerMapView<T extends Record<string, any>>({ dataset, rows, onRowClick }: Props<T>) {
  const cfg = dataset.map;
  const points = useMemo(() => {
    if (!cfg) return [];
    return rows
      .map((r) => ({ r, lat: Number((r as any)[cfg.latField]), lng: Number((r as any)[cfg.lngField]) }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  }, [rows, cfg]);

  if (!cfg) return <div className="text-sm text-muted-foreground py-6 text-center">Map not configured for this dataset.</div>;
  if (!points.length) return <div className="text-sm text-muted-foreground py-6 text-center">No rows have geo coordinates.</div>;

  const lats = points.map((p) => p.lat), lngs = points.map((p) => p.lng);
  const [latMin, latMax] = [Math.min(...lats), Math.max(...lats)];
  const [lngMin, lngMax] = [Math.min(...lngs), Math.max(...lngs)];
  const w = 800, h = 400, pad = 20;
  const sx = (lng: number) => pad + (w - pad * 2) * ((lng - lngMin) / (lngMax - lngMin || 1));
  const sy = (lat: number) => pad + (h - pad * 2) * (1 - (lat - latMin) / (latMax - latMin || 1));

  return (
    <Card>
      <CardContent className="p-2">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto bg-muted/20 rounded">
          {points.map((p, i) => (
            <circle key={i} cx={sx(p.lng)} cy={sy(p.lat)} r={5} fill="hsl(var(--primary))" opacity={0.7}
              className="cursor-pointer" onClick={() => onRowClick?.(p.r)}>
              <title>{String((p.r as any)[cfg.titleField || String(dataset.rowKey)] ?? "-")}</title>
            </circle>
          ))}
        </svg>
        <div className="text-xs text-muted-foreground text-center mt-2">{points.length} georeferenced items</div>
      </CardContent>
    </Card>
  );
}
