/**
 * Layout Block Editor
 * -------------------
 * Visual builder for `comm_layout_block` records. No raw HTML in the
 * main flow — Advanced HTML is a collapsed opt-in that overrides
 * the structured config.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Save, Loader2, Plus, Trash2, ChevronDown, ChevronUp,
  AlertTriangle, Monitor, Smartphone, Printer, ArrowUp, ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  MediaAssetPicker, ThemePicker, ColorPickerField,
} from "./LayoutComponentPickers";
import {
  BlockConfig, BlockRow, BlockColumn, BlockComponent,
  renderBlockConfig, resolveBlockContext, ChannelSurface,
} from "@/lib/enterprise/layoutBlockRenderer";

const sb = supabase as any;

export const BLOCK_KINDS = [
  "EMAIL_HEADER","EMAIL_FOOTER",
  "DOCUMENT_HEADER","DOCUMENT_FOOTER",
  "LETTER_HEADER","LETTER_FOOTER",
  "REPORT_HEADER","REPORT_FOOTER",
  "RECEIPT_HEADER","RECEIPT_FOOTER",
  "NOTICE_HEADER","NOTICE_FOOTER",
  "CERTIFICATE_HEADER","CERTIFICATE_FOOTER",
  "STATEMENT_HEADER","STATEMENT_FOOTER",
  "IN_APP_HEADER","IN_APP_FOOTER",
  "SMS_FOOTER","WHATSAPP_FOOTER","PUSH_FOOTER",
] as const;
export type BlockKind = typeof BLOCK_KINDS[number];

const COMPONENT_TYPES: { value: BlockComponent["type"]; label: string }[] = [
  { value: "logo", label: "Logo (org / asset)" },
  { value: "media_asset", label: "Media asset" },
  { value: "org_name", label: "Organization name" },
  { value: "org_tagline", label: "Organization tagline" },
  { value: "org_contact", label: "Organization contact" },
  { value: "location_block", label: "Head office / location" },
  { value: "text_block", label: "Text block" },
  { value: "disclaimer", label: "Disclaimer" },
  { value: "divider", label: "Divider" },
  { value: "spacer", label: "Spacer" },
  { value: "social_links", label: "Social links" },
  { value: "qr_code", label: "QR / verification code" },
  { value: "signature_ref", label: "Signature slot" },
  { value: "custom_text", label: "Custom text" },
];

function uid(prefix: string) { return `${prefix}${Math.random().toString(36).slice(2, 8)}`; }

function emptyConfig(): BlockConfig {
  return { version: 1, rows: [] };
}

function newRow(): BlockRow {
  return {
    id: uid("r"),
    visibility: { email: true, print: true, mobile: true },
    padding: { top: 12, right: 16, bottom: 12, left: 16 },
    columns: [newColumn(100)],
  };
}
function newColumn(width = 100): BlockColumn {
  return { id: uid("c"), width, align: "left", components: [] };
}
function newComponent(type: BlockComponent["type"] = "custom_text"): BlockComponent {
  const c: BlockComponent = { id: uid("cmp"), type };
  if (type === "custom_text") c.text = "Custom text";
  if (type === "logo") c.source = "org_primary_logo";
  if (type === "org_contact") c.fields = ["address", "email", "phone", "website"];
  if (type === "disclaimer") c.source = "default";
  if (type === "spacer") c.height = 12;
  return c;
}

export interface LayoutBlockRow {
  id?: string;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  block_kind: BlockKind;
  module_code?: string | null;
  language_code?: string | null;
  lifecycle_state?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  is_system?: boolean;
  is_active?: boolean;
  config?: BlockConfig | null;
  advanced_html?: string | null;
}

export function LayoutBlockEditorDialog({
  open, onOpenChange, initial, defaultKind,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: LayoutBlockRow | null;
  defaultKind?: BlockKind;
}) {
  const qc = useQueryClient();
  const [row, setRow] = useState<LayoutBlockRow>({ block_kind: defaultKind ?? "EMAIL_HEADER", is_active: true, lifecycle_state: "PUBLISHED", config: emptyConfig() });
  const [themeId, setThemeId] = useState<string | null>(null);
  const [device, setDevice] = useState<ChannelSurface>("email");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (initial) {
      setRow({ ...initial, config: initial.config ?? emptyConfig() });
    } else {
      setRow({ block_kind: defaultKind ?? "EMAIL_HEADER", is_active: true, lifecycle_state: "PUBLISHED", config: emptyConfig() });
    }
    setAdvancedOpen(false);
  }, [initial, open, defaultKind]);

  const cfg: BlockConfig = row.config ?? emptyConfig();
  const setCfg = (next: BlockConfig) => setRow((r) => ({ ...r, config: next }));

  /* ---- structural mutations ---- */
  const addRow = () => setCfg({ ...cfg, rows: [...cfg.rows, newRow()] });
  const removeRow = (rid: string) => setCfg({ ...cfg, rows: cfg.rows.filter((r) => r.id !== rid) });
  const moveRow = (rid: string, dir: -1 | 1) => {
    const idx = cfg.rows.findIndex((r) => r.id === rid);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= cfg.rows.length) return;
    const rows = [...cfg.rows];
    [rows[idx], rows[j]] = [rows[j], rows[idx]];
    setCfg({ ...cfg, rows });
  };
  const patchRow = (rid: string, patch: Partial<BlockRow>) =>
    setCfg({ ...cfg, rows: cfg.rows.map((r) => r.id === rid ? { ...r, ...patch } : r) });

  const addColumn = (rid: string) => patchRow(rid, {
    columns: [...(cfg.rows.find((r) => r.id === rid)?.columns ?? []), newColumn(Math.max(10, Math.floor(100 / ((cfg.rows.find((r) => r.id === rid)?.columns.length ?? 0) + 1))))],
  });
  const removeColumn = (rid: string, cid: string) => {
    const r = cfg.rows.find((x) => x.id === rid);
    if (!r) return;
    patchRow(rid, { columns: r.columns.filter((c) => c.id !== cid) });
  };
  const patchColumn = (rid: string, cid: string, patch: Partial<BlockColumn>) => {
    const r = cfg.rows.find((x) => x.id === rid);
    if (!r) return;
    patchRow(rid, { columns: r.columns.map((c) => c.id === cid ? { ...c, ...patch } : c) });
  };

  const addComponent = (rid: string, cid: string, type: BlockComponent["type"]) => {
    const col = cfg.rows.find((r) => r.id === rid)?.columns.find((c) => c.id === cid);
    if (!col) return;
    patchColumn(rid, cid, { components: [...col.components, newComponent(type)] });
  };
  const removeComponent = (rid: string, cid: string, cmpId: string) => {
    const col = cfg.rows.find((r) => r.id === rid)?.columns.find((c) => c.id === cid);
    if (!col) return;
    patchColumn(rid, cid, { components: col.components.filter((c) => c.id !== cmpId) });
  };
  const moveComponent = (rid: string, cid: string, cmpId: string, dir: -1 | 1) => {
    const col = cfg.rows.find((r) => r.id === rid)?.columns.find((c) => c.id === cid);
    if (!col) return;
    const idx = col.components.findIndex((c) => c.id === cmpId);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= col.components.length) return;
    const comps = [...col.components];
    [comps[idx], comps[j]] = [comps[j], comps[idx]];
    patchColumn(rid, cid, { components: comps });
  };
  const patchComponent = (rid: string, cid: string, cmpId: string, patch: Partial<BlockComponent>) => {
    const col = cfg.rows.find((r) => r.id === rid)?.columns.find((c) => c.id === cid);
    if (!col) return;
    patchColumn(rid, cid, {
      components: col.components.map((c) => c.id === cmpId ? { ...c, ...patch } : c),
    });
  };

  /* ---- preview ---- */
  const previewQuery = useQuery({
    queryKey: ["layout_block_preview_ctx", themeId, device, JSON.stringify(cfg)],
    queryFn: () => resolveBlockContext({ channel: device, config: cfg, themeId }),
    staleTime: 0,
  });
  const previewHtml = useMemo(() => {
    if (row.advanced_html && row.advanced_html.trim()) return row.advanced_html;
    if (!previewQuery.data) return "";
    return renderBlockConfig(cfg, previewQuery.data);
  }, [previewQuery.data, cfg, row.advanced_html]);

  const previewDoc = useMemo(() => {
    const bg = previewQuery.data?.theme?.background ?? "#ffffff";
    const font = previewQuery.data?.theme?.font_family ?? "Arial, sans-serif";
    return `<!doctype html><html><body style="margin:0;padding:16px;background:${bg};font-family:${font}">${previewHtml || '<div style="color:#999;font-size:12px">Add rows and components to see a preview.</div>'}</body></html>`;
  }, [previewHtml, previewQuery.data]);

  /* ---- validation ---- */
  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (!row.name?.trim()) errs.push("Name is required");
    if (!row.block_kind) errs.push("Block kind is required");
    if (!row.advanced_html && !cfg.rows.some((r) => r.columns.some((c) => c.components.length > 0))) {
      errs.push("Add at least one component or provide Advanced HTML");
    }
    for (const r of cfg.rows) {
      const totalW = r.columns.reduce((s, c) => s + (c.width || 0), 0);
      if (r.columns.length > 0 && (totalW < 50 || totalW > 150)) {
        errs.push(`Row column widths should sum near 100% (currently ${totalW}%)`);
        break;
      }
    }
    return errs;
  }, [row, cfg]);

  const save = useMutation({
    mutationFn: async () => {
      if (validationErrors.length) throw new Error(validationErrors[0]);
      // Render cache using EMAIL channel by default; runtime re-renders with actual channel.
      const ctx = await resolveBlockContext({ channel: "email", config: cfg, themeId });
      const renderedHtml = row.advanced_html?.trim()
        ? row.advanced_html
        : renderBlockConfig(cfg, ctx);
      const payload: any = {
        name: row.name,
        description: row.description ?? null,
        block_kind: row.block_kind,
        module_code: row.module_code ?? null,
        language_code: row.language_code ?? "en",
        lifecycle_state: row.lifecycle_state ?? "PUBLISHED",
        is_active: row.is_active ?? true,
        config: cfg,
        advanced_html: row.advanced_html?.trim() || null,
        rendered_html: renderedHtml,
      };
      if (row.id) {
        const { error } = await sb.from("comm_layout_block").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        payload.code = row.code || `BLK_${Date.now().toString(36).toUpperCase()}`;
        const { error } = await sb.from("comm_layout_block").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["layout_blocks"] });
      toast.success("Layout block saved");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const canSave = validationErrors.length === 0 && !save.isPending && !row.is_system;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[97vw] w-[1500px] max-h-[94vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {row.id ? "Edit" : "New"} Layout Block
            {row.is_system && <Badge variant="secondary">System</Badge>}
          </DialogTitle>
          <DialogDescription>
            Compose reusable header/footer blocks from Organization data, Media Library, Text Blocks, and Disclaimers. No raw HTML required.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 flex-1 overflow-hidden">
          {/* --- left: builder --- */}
          <div className="overflow-y-auto pr-2 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={row.name ?? ""} disabled={!!row.is_system} onChange={(e) => setRow((r) => ({ ...r, name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Block kind *</Label>
                <select
                  className="h-9 w-full rounded border bg-background px-2 text-sm"
                  value={row.block_kind}
                  disabled={!!row.id}
                  onChange={(e) => setRow((r) => ({ ...r, block_kind: e.target.value as BlockKind }))}
                >
                  {BLOCK_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Language</Label>
                <Input value={row.language_code ?? "en"} disabled={!!row.is_system} onChange={(e) => setRow((r) => ({ ...r, language_code: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Lifecycle</Label>
                <select
                  className="h-9 w-full rounded border bg-background px-2 text-sm"
                  value={row.lifecycle_state ?? "PUBLISHED"}
                  disabled={!!row.is_system}
                  onChange={(e) => setRow((r) => ({ ...r, lifecycle_state: e.target.value as any }))}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Switch checked={row.is_active ?? true} disabled={!!row.is_system} onCheckedChange={(v) => setRow((r) => ({ ...r, is_active: v }))} />
                <Label className="text-xs">Active</Label>
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={row.description ?? ""} disabled={!!row.is_system} onChange={(e) => setRow((r) => ({ ...r, description: e.target.value }))} />
            </div>
            <ThemePicker label="Theme (preview)" value={themeId} onChange={setThemeId} inherited={!themeId} onReset={() => setThemeId(null)} />

            {/* Rows builder */}
            <div className="border rounded p-2 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Rows</div>
                <Button size="sm" variant="outline" disabled={!!row.is_system} onClick={addRow}>
                  <Plus className="h-3 w-3 mr-1" /> Row
                </Button>
              </div>
              {cfg.rows.length === 0 && (
                <div className="text-xs text-muted-foreground p-2">No rows yet. Add a row to start building.</div>
              )}
              {cfg.rows.map((r, ri) => (
                <RowEditor
                  key={r.id}
                  row={r}
                  disabled={!!row.is_system}
                  onPatch={(p) => patchRow(r.id, p)}
                  onRemove={() => removeRow(r.id)}
                  onMoveUp={() => moveRow(r.id, -1)}
                  onMoveDown={() => moveRow(r.id, 1)}
                  canUp={ri > 0}
                  canDown={ri < cfg.rows.length - 1}
                  onAddColumn={() => addColumn(r.id)}
                  onPatchColumn={(cid, p) => patchColumn(r.id, cid, p)}
                  onRemoveColumn={(cid) => removeColumn(r.id, cid)}
                  onAddComponent={(cid, t) => addComponent(r.id, cid, t)}
                  onPatchComponent={(cid, cmpId, p) => patchComponent(r.id, cid, cmpId, p)}
                  onRemoveComponent={(cid, cmpId) => removeComponent(r.id, cid, cmpId)}
                  onMoveComponent={(cid, cmpId, d) => moveComponent(r.id, cid, cmpId, d)}
                />
              ))}
            </div>

            {/* Advanced */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span>Advanced HTML (bypasses structured config)</span>
                  <ChevronDown className={`h-4 w-4 transition ${advancedOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {row.advanced_html && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      When Advanced HTML is set, the visual config above is ignored at render time.
                    </AlertDescription>
                  </Alert>
                )}
                <Textarea rows={6} className="font-mono text-xs" placeholder="<!-- optional -->"
                  disabled={!!row.is_system}
                  value={row.advanced_html ?? ""}
                  onChange={(e) => setRow((r) => ({ ...r, advanced_html: e.target.value }))} />
              </CollapsibleContent>
            </Collapsible>

            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <ul className="list-disc pl-4">{validationErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* --- right: preview --- */}
          <div className="flex flex-col gap-2 overflow-hidden">
            <Tabs value={device} onValueChange={(v) => setDevice(v as ChannelSurface)}>
              <TabsList>
                <TabsTrigger value="email"><Monitor className="h-3.5 w-3.5 mr-1" /> Email</TabsTrigger>
                <TabsTrigger value="print"><Printer className="h-3.5 w-3.5 mr-1" /> Print</TabsTrigger>
                <TabsTrigger value="mobile"><Smartphone className="h-3.5 w-3.5 mr-1" /> Mobile</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className={`flex-1 border rounded bg-white overflow-auto ${device === "mobile" ? "flex justify-center" : ""}`}>
              <iframe
                title="block-preview"
                srcDoc={previewDoc}
                className="bg-white"
                style={{ width: device === "mobile" ? 390 : "100%", height: "100%", minHeight: 500, border: 0 }}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!canSave}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save block</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
 * Row editor sub-component
 * ============================================================ */

function RowEditor(props: {
  row: BlockRow;
  disabled: boolean;
  onPatch: (p: Partial<BlockRow>) => void;
  onRemove: () => void;
  onMoveUp: () => void; onMoveDown: () => void; canUp: boolean; canDown: boolean;
  onAddColumn: () => void;
  onPatchColumn: (cid: string, p: Partial<BlockColumn>) => void;
  onRemoveColumn: (cid: string) => void;
  onAddComponent: (cid: string, t: BlockComponent["type"]) => void;
  onPatchComponent: (cid: string, cmpId: string, p: Partial<BlockComponent>) => void;
  onRemoveComponent: (cid: string, cmpId: string) => void;
  onMoveComponent: (cid: string, cmpId: string, d: -1 | 1) => void;
}) {
  const { row, disabled } = props;
  const [expanded, setExpanded] = useState(true);
  const vis = row.visibility ?? { email: true, print: true, mobile: true };
  const pad = row.padding ?? { top: 12, right: 16, bottom: 12, left: 16 };
  return (
    <div className="border rounded bg-background">
      <div className="flex items-center gap-2 p-2 border-b">
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
        <div className="text-xs font-medium flex-1">Row · {row.columns.length} column{row.columns.length !== 1 ? "s" : ""}</div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <label className="flex items-center gap-1"><input type="checkbox" checked={vis.email !== false} disabled={disabled} onChange={(e) => props.onPatch({ visibility: { ...vis, email: e.target.checked } })} /> Email</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={vis.print !== false} disabled={disabled} onChange={(e) => props.onPatch({ visibility: { ...vis, print: e.target.checked } })} /> Print</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={vis.mobile !== false} disabled={disabled} onChange={(e) => props.onPatch({ visibility: { ...vis, mobile: e.target.checked } })} /> Mobile</label>
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6" disabled={disabled || !props.canUp} onClick={props.onMoveUp}><ArrowUp className="h-3 w-3" /></Button>
        <Button size="icon" variant="ghost" className="h-6 w-6" disabled={disabled || !props.canDown} onClick={props.onMoveDown}><ArrowDown className="h-3 w-3" /></Button>
        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" disabled={disabled} onClick={props.onRemove}><Trash2 className="h-3 w-3" /></Button>
      </div>
      {expanded && (
        <div className="p-2 space-y-2">
          <div className="grid grid-cols-5 gap-2">
            <div>
              <Label className="text-[10px]">Pad top</Label>
              <Input type="number" className="h-8 text-xs" value={pad.top} disabled={disabled} onChange={(e) => props.onPatch({ padding: { ...pad, top: Number(e.target.value) } })} />
            </div>
            <div>
              <Label className="text-[10px]">Pad right</Label>
              <Input type="number" className="h-8 text-xs" value={pad.right} disabled={disabled} onChange={(e) => props.onPatch({ padding: { ...pad, right: Number(e.target.value) } })} />
            </div>
            <div>
              <Label className="text-[10px]">Pad bottom</Label>
              <Input type="number" className="h-8 text-xs" value={pad.bottom} disabled={disabled} onChange={(e) => props.onPatch({ padding: { ...pad, bottom: Number(e.target.value) } })} />
            </div>
            <div>
              <Label className="text-[10px]">Pad left</Label>
              <Input type="number" className="h-8 text-xs" value={pad.left} disabled={disabled} onChange={(e) => props.onPatch({ padding: { ...pad, left: Number(e.target.value) } })} />
            </div>
            <div>
              <Label className="text-[10px]">Background</Label>
              <ColorPickerField value={row.background_color ?? null} onChange={(v) => props.onPatch({ background_color: v })} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-muted-foreground">Columns</div>
            <Button size="sm" variant="outline" disabled={disabled} onClick={props.onAddColumn}><Plus className="h-3 w-3 mr-1" /> Column</Button>
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, row.columns.length)}, minmax(0, 1fr))` }}>
            {row.columns.map((col) => (
              <ColumnEditor
                key={col.id}
                col={col}
                disabled={disabled}
                onPatch={(p) => props.onPatchColumn(col.id, p)}
                onRemove={() => props.onRemoveColumn(col.id)}
                onAddComponent={(t) => props.onAddComponent(col.id, t)}
                onPatchComponent={(cmpId, p) => props.onPatchComponent(col.id, cmpId, p)}
                onRemoveComponent={(cmpId) => props.onRemoveComponent(col.id, cmpId)}
                onMoveComponent={(cmpId, d) => props.onMoveComponent(col.id, cmpId, d)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ColumnEditor(props: {
  col: BlockColumn;
  disabled: boolean;
  onPatch: (p: Partial<BlockColumn>) => void;
  onRemove: () => void;
  onAddComponent: (t: BlockComponent["type"]) => void;
  onPatchComponent: (cmpId: string, p: Partial<BlockComponent>) => void;
  onRemoveComponent: (cmpId: string) => void;
  onMoveComponent: (cmpId: string, d: -1 | 1) => void;
}) {
  const { col, disabled } = props;
  const [addType, setAddType] = useState<BlockComponent["type"]>("custom_text");
  const vis = col.visibility ?? {};
  return (
    <div className="border rounded p-2 bg-muted/20 space-y-2">
      <div className="flex items-center gap-1">
        <Input type="number" className="h-7 text-xs w-16" value={col.width} disabled={disabled} onChange={(e) => props.onPatch({ width: Number(e.target.value) })} />
        <span className="text-[10px] text-muted-foreground">%</span>
        <select className="h-7 rounded border bg-background px-1 text-xs" value={col.align ?? "left"} disabled={disabled} onChange={(e) => props.onPatch({ align: e.target.value as any })}>
          <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
        </select>
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground ml-auto">
          <label className="flex items-center gap-0.5"><input type="checkbox" checked={vis.email !== false} disabled={disabled} onChange={(e) => props.onPatch({ visibility: { ...vis, email: e.target.checked } })} /> E</label>
          <label className="flex items-center gap-0.5"><input type="checkbox" checked={vis.print !== false} disabled={disabled} onChange={(e) => props.onPatch({ visibility: { ...vis, print: e.target.checked } })} /> P</label>
          <label className="flex items-center gap-0.5"><input type="checkbox" checked={vis.mobile !== false} disabled={disabled} onChange={(e) => props.onPatch({ visibility: { ...vis, mobile: e.target.checked } })} /> M</label>
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" disabled={disabled} onClick={props.onRemove}><Trash2 className="h-3 w-3" /></Button>
      </div>

      <div className="space-y-1">
        {col.components.length === 0 && (
          <div className="text-[10px] text-muted-foreground italic">No components</div>
        )}
        {col.components.map((cmp, idx) => (
          <ComponentEditor
            key={cmp.id}
            cmp={cmp}
            disabled={disabled}
            onPatch={(p) => props.onPatchComponent(cmp.id, p)}
            onRemove={() => props.onRemoveComponent(cmp.id)}
            onMoveUp={() => props.onMoveComponent(cmp.id, -1)}
            onMoveDown={() => props.onMoveComponent(cmp.id, 1)}
            canUp={idx > 0}
            canDown={idx < col.components.length - 1}
          />
        ))}
      </div>

      <div className="flex gap-1">
        <select className="h-7 rounded border bg-background px-1 text-xs flex-1" value={addType} onChange={(e) => setAddType(e.target.value as any)}>
          {COMPONENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <Button size="sm" variant="outline" className="h-7" disabled={disabled} onClick={() => props.onAddComponent(addType)}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function ComponentEditor(props: {
  cmp: BlockComponent;
  disabled: boolean;
  onPatch: (p: Partial<BlockComponent>) => void;
  onRemove: () => void;
  onMoveUp: () => void; onMoveDown: () => void; canUp: boolean; canDown: boolean;
}) {
  const { cmp, disabled } = props;
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded bg-background/60 text-xs">
      <div className="flex items-center gap-1 p-1">
        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setOpen(!open)}>
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
        <div className="flex-1 truncate">
          <span className="font-medium">{COMPONENT_TYPES.find((t) => t.value === cmp.type)?.label ?? cmp.type}</span>
          {cmp.type === "custom_text" && cmp.text && <span className="text-muted-foreground"> · {cmp.text.slice(0, 30)}</span>}
        </div>
        <Button size="icon" variant="ghost" className="h-5 w-5" disabled={disabled || !props.canUp} onClick={props.onMoveUp}><ArrowUp className="h-3 w-3" /></Button>
        <Button size="icon" variant="ghost" className="h-5 w-5" disabled={disabled || !props.canDown} onClick={props.onMoveDown}><ArrowDown className="h-3 w-3" /></Button>
        <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" disabled={disabled} onClick={props.onRemove}><Trash2 className="h-3 w-3" /></Button>
      </div>
      {open && (
        <div className="p-2 border-t space-y-2">
          <div>
            <Label className="text-[10px]">Alignment</Label>
            <select className="h-7 w-full rounded border bg-background px-1 text-xs" value={cmp.align ?? ""} disabled={disabled} onChange={(e) => props.onPatch({ align: (e.target.value || null) as any })}>
              <option value="">— inherit —</option>
              <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
            </select>
          </div>
          {cmp.type === "custom_text" && (
            <>
              <div>
                <Label className="text-[10px]">Text</Label>
                <Textarea rows={2} className="text-xs" value={cmp.text ?? ""} disabled={disabled} onChange={(e) => props.onPatch({ text: e.target.value })} />
              </div>
              <div>
                <Label className="text-[10px]">Style</Label>
                <select className="h-7 w-full rounded border bg-background px-1 text-xs" value={cmp.style ?? "body"} disabled={disabled} onChange={(e) => props.onPatch({ style: e.target.value as any })}>
                  <option value="heading">Heading</option><option value="body">Body</option><option value="small">Small</option>
                </select>
              </div>
            </>
          )}
          {(cmp.type === "org_name" || cmp.type === "org_tagline") && (
            <div>
              <Label className="text-[10px]">Style</Label>
              <select className="h-7 w-full rounded border bg-background px-1 text-xs" value={cmp.style ?? "heading"} disabled={disabled} onChange={(e) => props.onPatch({ style: e.target.value as any })}>
                <option value="heading">Heading</option><option value="body">Body</option><option value="small">Small</option>
              </select>
            </div>
          )}
          {cmp.type === "org_contact" && (
            <div>
              <Label className="text-[10px]">Fields</Label>
              <div className="flex flex-wrap gap-2 text-[10px]">
                {["address", "email", "phone", "website"].map((f) => {
                  const checked = (cmp.fields ?? []).includes(f);
                  return (
                    <label key={f} className="flex items-center gap-1">
                      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => {
                        const set = new Set(cmp.fields ?? []);
                        if (e.target.checked) set.add(f); else set.delete(f);
                        props.onPatch({ fields: [...set] });
                      }} />
                      {f}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          {(cmp.type === "logo" || cmp.type === "media_asset") && (
            <>
              <MediaAssetPicker
                label="Asset"
                categories={cmp.type === "logo" ? ["logo","organization_logo"] : []}
                value={cmp.asset_id ?? null}
                onChange={(v) => props.onPatch({ asset_id: v })}
              />
              <div>
                <Label className="text-[10px]">Max height (px)</Label>
                <Input type="number" className="h-7 text-xs" value={cmp.max_height ?? (cmp.type === "logo" ? 60 : 80)} disabled={disabled} onChange={(e) => props.onPatch({ max_height: Number(e.target.value) })} />
              </div>
            </>
          )}
          {cmp.type === "spacer" && (
            <div>
              <Label className="text-[10px]">Height (px)</Label>
              <Input type="number" className="h-7 text-xs" value={cmp.height ?? 12} disabled={disabled} onChange={(e) => props.onPatch({ height: Number(e.target.value) })} />
            </div>
          )}
          {cmp.type === "text_block" && (
            <div>
              <Label className="text-[10px]">Text block code</Label>
              <Input className="h-7 text-xs" value={cmp.text_block_code ?? ""} disabled={disabled} onChange={(e) => props.onPatch({ text_block_code: e.target.value })} placeholder="e.g. LEGAL_FOOTER_EN" />
            </div>
          )}
          {cmp.type === "disclaimer" && (
            <div>
              <Label className="text-[10px]">Disclaimer source</Label>
              <Input className="h-7 text-xs" value={cmp.source ?? "default"} disabled={disabled} onChange={(e) => props.onPatch({ source: e.target.value })} placeholder="default | code" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
