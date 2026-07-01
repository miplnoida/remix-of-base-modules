/**
 * Grouped default-asset picker used on Organization Profile → Comm Defaults.
 * Renders a native <select> with <optgroup>s per module and a compact
 * "chip" preview beside the field summarising the selected asset (code,
 * name, module, status) with Preview / Open Master / Test Resolve actions.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, ExternalLink, Zap } from "lucide-react";
import { toast } from "sonner";

export interface DefaultAssetOption {
  id: string;
  name: string;
  code?: string | null;
  module_code?: string | null;
  category?: string | null;
  is_active?: boolean;
  is_default?: boolean;
}

interface Props {
  label: string;
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  options: DefaultAssetOption[];
  /** Master screen path for "Open Master" link. */
  masterPath: string;
  /** Render live preview for the selected option (called on Preview click). */
  renderPreview?: (opt: DefaultAssetOption) => React.ReactNode;
  /** Resolver test (should hit the same runtime resolver). */
  onTestResolve?: (opt: DefaultAssetOption) => Promise<{ resolved: string; source: string } | null>;
  hint?: string;
}

/** Group order used on all defaults dropdowns. */
const MODULE_ORDER = [
  "ORG", "BENEFITS", "COMPLIANCE", "LEGAL", "PAYMENTS", "EMPLOYER",
  "MEMBER", "FINANCE", "HR", "REPORTS", "SHARED",
];

function moduleLabel(code: string | null | undefined): string {
  const c = (code ?? "").toUpperCase();
  if (!c) return "Other / Custom";
  if (c === "ORG") return "Organization Default";
  return `Module: ${c}`;
}

export function DefaultAssetPicker({ label, value, onChange, options, masterPath, renderPreview, onTestResolve, hint }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const selected = options.find((o) => o.id === value) ?? null;

  const grouped = useMemo(() => {
    const map = new Map<string, DefaultAssetOption[]>();
    options.forEach((o) => {
      const key = (o.module_code ?? "").toUpperCase() || "SHARED";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    });
    // Sort keys by preferred order, then alpha for anything else
    return Array.from(map.entries()).sort(([a], [b]) => {
      const ia = MODULE_ORDER.indexOf(a);
      const ib = MODULE_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }).map(([k, list]) => ({
      key: k,
      label: moduleLabel(k === "SHARED" ? null : k),
      items: list.sort((x, y) => x.name.localeCompare(y.name)),
    }));
  }, [options]);

  const handleTest = async () => {
    if (!selected || !onTestResolve) return;
    try {
      const r = await onTestResolve(selected);
      if (r) toast.success(`Resolved: ${r.resolved} (source: ${r.source})`);
      else toast.info("Resolver returned no result");
    } catch (e: any) {
      toast.error(e?.message ?? "Resolve failed");
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="grid gap-2 md:grid-cols-[1fr_auto] items-start">
        <select
          className="w-full border rounded h-10 px-2 bg-background text-sm"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">— None —</option>
          {grouped.map((g) => (
            <optgroup key={g.key} label={g.label}>
              {g.items.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                  {o.code ? ` · ${o.code}` : ""}
                  {o.is_active === false ? " (inactive)" : ""}
                  {o.is_default ? " ★" : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {selected && (
          <div className="flex flex-col gap-1 border rounded p-2 bg-muted/40 min-w-[220px]">
            <div className="flex items-center gap-1 flex-wrap">
              {selected.code && <Badge variant="outline" className="font-mono text-[10px]">{selected.code}</Badge>}
              {selected.module_code && <Badge variant="secondary" className="text-[10px]">{selected.module_code}</Badge>}
              {selected.category && <Badge variant="outline" className="text-[10px]">{selected.category}</Badge>}
              <Badge variant={selected.is_active === false ? "outline" : "default"} className="text-[10px]">
                {selected.is_active === false ? "Inactive" : "Active"}
              </Badge>
              {selected.is_default && <Badge className="text-[10px]">Default</Badge>}
            </div>
            <div className="text-[11px] font-medium truncate" title={selected.name}>{selected.name}</div>
            <div className="flex gap-1 flex-wrap">
              {renderPreview && (
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => setPreviewOpen(true)}>
                  <Eye className="h-3 w-3 mr-1" /> Preview
                </Button>
              )}
              <Button asChild size="sm" variant="ghost" className="h-6 px-2 text-[11px]">
                <Link to={masterPath}><ExternalLink className="h-3 w-3 mr-1" /> Master</Link>
              </Button>
              {onTestResolve && (
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={handleTest}>
                  <Zap className="h-3 w-3 mr-1" /> Test Resolve
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}

      {selected && renderPreview && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>{label}: {selected.name}</DialogTitle></DialogHeader>
            <div className="max-h-[70vh] overflow-auto">{renderPreview(selected)}</div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default DefaultAssetPicker;
