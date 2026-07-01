/**
 * Brand Assets → Letterheads
 * ---------------------------------------------------------------
 * Structured letterhead master. Letterheads store LAYOUT only:
 *   - page size / orientation / margins
 *   - asset references (logo, seal, header, footer, watermark, signature)
 *   - which head/branch location to show and which fields to include
 *   - which text block to use for the footer note
 *
 * Letterheads DO NOT store branch phone numbers, addresses, emails, faxes
 * or organization contact details. Those values are resolved live from:
 *   - core_organization        (name, tagline fallback)
 *   - office_locations         (head / branch office contact block)
 *   - core_text_block          (footer note)
 * Update a location or org profile — the letterhead preview refreshes
 * without any letterhead edit.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Loader2, Search, Ruler, Plus, Pencil, Copy, Archive, Eye, Send, FileEdit } from "lucide-react";
import { toast } from "sonner";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { LetterheadPreview } from "@/components/comm/LetterheadPreview";
import { WhereUsedButton } from "@/components/comm/WhereUsedDialog";
import { AssetPickerField } from "@/components/comm/AssetPickerField";
import { useOfficeLocations } from "@/hooks/comm/useOrgManagement";
import { useTextBlocks } from "@/hooks/org/useTextBlock";
import type { CommMediaAsset, CommAssetCategory } from "@/hooks/comm/useMediaAssets";

const sb = supabase as any;

const MODULE_OPTIONS = ["ORG", "BENEFITS", "COMPLIANCE", "LEGAL", "PAYMENTS", "EMPLOYER", "MEMBER", "FINANCE", "HR", "REPORTS"];
const DOC_TYPE_OPTIONS = ["letter", "notice", "certificate", "statement", "receipt", "order", "memo", "report"];
const CATEGORY_OPTIONS: Array<{ value: string; sub: string[] }> = [
  { value: "Official Letters", sub: ["General", "Award", "Denial", "Determination", "Response"] },
  { value: "Notices",          sub: ["Compliance", "Legal", "Payment", "Reminder", "Warning"] },
  { value: "Certificates",     sub: ["Registration", "Contribution", "Compliance", "Membership"] },
  { value: "Statements",       sub: ["Contribution", "Benefit", "Account", "Employer"] },
  { value: "Receipts",         sub: ["Payment", "Refund", "Adjustment"] },
  { value: "Orders",           sub: ["Court", "Recovery", "Instalment", "Discharge"] },
  { value: "Memos",            sub: ["Internal", "External", "Directive"] },
  { value: "Reports",          sub: ["Summary", "Detail", "Statutory"] },
  { value: "Other",            sub: ["Other"] },
];
const PAGE_SIZES = ["A4", "A5", "Letter", "Legal"];
const ORIENTATIONS = ["portrait", "landscape"];
const OFFICE_LAYOUTS: Array<{ value: string; label: string }> = [
  { value: "left_right",  label: "Head Office (left) · Branch Office (right)" },
  { value: "stacked",     label: "Stacked (Head Office above Branch Office)" },
  { value: "header_only", label: "Header only (no office blocks)" },
  { value: "none",        label: "None (hide office blocks)" },
];

interface LetterheadRow {
  id: string;
  code: string | null;
  name: string;
  category: string | null;
  subcategory: string | null;
  module_code: string | null;
  document_type: string | null;
  is_active: boolean;
  design_config: any;
}

function useLetterheads() {
  return useQuery({
    queryKey: ["comm_letterhead", "structured-list"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("comm_letterhead")
        .select("id,code,name,category,subcategory,module_code,document_type,is_active,design_config")
        .order("module_code", { ascending: true, nullsFirst: false })
        .order("code");
      if (error) throw error;
      return (data ?? []) as LetterheadRow[];
    },
    staleTime: 60_000,
  });
}

function AssetChip({ label, code }: { label: string; code?: string | null }) {
  if (!code) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] mr-1 mb-1">
      <span className="text-muted-foreground">{label}:</span>
      <code className="font-mono">{code}</code>
    </span>
  );
}

/** Local editor state — layout only. No duplicated org / branch contact text. */
interface EditorState {
  id?: string;
  code: string | null;
  name: string;
  category: string;
  subcategory: string;
  module_code: string;
  document_type: string;
  is_active: boolean;

  page_size: string;
  orientation: string;
  margins: { top: number; bottom: number; left: number; right: number };

  layout_variant: "ssb_standard" | "image_bands";

  // Header display flags
  show_organization_name: boolean;
  show_tagline: boolean;
  tagline: string;
  divider_color: string;

  // Office block layout & source
  office_block_layout: "left_right" | "stacked" | "header_only" | "none";
  show_head_office_block: boolean;
  head_office_location_role: "PRIMARY" | "HEAD_OFFICE" | "SPECIFIC";
  head_office_location_id: string | null;
  head_office_label: string;

  show_branch_office_block: boolean;
  branch_office_location_role: "FIRST_BRANCH" | "SPECIFIC" | "NONE";
  branch_office_location_id: string | null;
  branch_office_label: string;

  // Which fields to render inside each office block
  show_address: boolean;
  show_phone: boolean;
  show_fax: boolean;
  show_email: boolean;
  show_website: boolean;

  // Footer note – prefer text block
  footer_note_text_block_code: string | null;

  // Assets
  logo_id: string | null;
  seal_id: string | null;
  header_id: string | null;
  footer_id: string | null;
  watermark_id: string | null;
  signature_id: string | null;
  logo_code: string | null;
  seal_code: string | null;
  header_code: string | null;
  footer_code: string | null;
  watermark_code: string | null;
  signature_code: string | null;
}

const DEFAULT_DIVIDER = "#2E7D32";
const DEFAULT_TAGLINE = "\"Striving for Social Justice\"";

const EMPTY_EDITOR: EditorState = {
  code: null, name: "", category: "Official Letters", subcategory: "General",
  module_code: "ORG", document_type: "letter", is_active: false,
  page_size: "A4", orientation: "portrait",
  margins: { top: 20, bottom: 20, left: 20, right: 20 },
  layout_variant: "ssb_standard",
  show_organization_name: true, show_tagline: true,
  tagline: DEFAULT_TAGLINE, divider_color: DEFAULT_DIVIDER,
  office_block_layout: "left_right",
  show_head_office_block: true,
  head_office_location_role: "PRIMARY", head_office_location_id: null,
  head_office_label: "Head Office:",
  show_branch_office_block: true,
  branch_office_location_role: "FIRST_BRANCH", branch_office_location_id: null,
  branch_office_label: "Branch Office:",
  show_address: true, show_phone: true, show_fax: true, show_email: false, show_website: false,
  footer_note_text_block_code: null,
  logo_id: null, seal_id: null, header_id: null, footer_id: null, watermark_id: null, signature_id: null,
  logo_code: null, seal_code: null, header_code: null, footer_code: null, watermark_code: null, signature_code: null,
};

async function idsForCodes(codes: (string | null | undefined)[]): Promise<Record<string, string>> {
  const filtered = Array.from(new Set(codes.filter((c): c is string => !!c)));
  if (!filtered.length) return {};
  const { data } = await sb.from("comm_media_asset")
    .select("id, asset_code, is_active")
    .in("asset_code", filtered);
  const map: Record<string, string> = {};
  (data ?? []).sort((a: any, b: any) => Number(b.is_active) - Number(a.is_active))
    .forEach((r: any) => { if (!map[r.asset_code]) map[r.asset_code] = r.id; });
  return map;
}

async function rowToEditor(r: LetterheadRow | null): Promise<EditorState> {
  if (!r) return EMPTY_EDITOR;
  const dc = r.design_config ?? {};
  const rawM = dc.margins ?? {};
  // legacy sometimes stored "25mm" strings — coerce to number
  const num = (v: any, d: number) => {
    if (typeof v === "number") return v;
    if (typeof v === "string") { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; }
    return d;
  };
  const codes = {
    logo: dc.logo_asset_code ?? null,
    seal: dc.seal_asset_code ?? null,
    header: dc.header_asset_code ?? null,
    footer: dc.footer_asset_code ?? null,
    watermark: dc.watermark_asset_code ?? null,
    signature: dc.signature_asset_code ?? null,
  };
  const ids = await idsForCodes(Object.values(codes));
  return {
    id: r.id, code: r.code ?? null, name: r.name ?? "",
    category: r.category ?? "Official Letters", subcategory: r.subcategory ?? "General",
    module_code: r.module_code ?? "ORG", document_type: r.document_type ?? "letter",
    is_active: r.is_active ?? false,
    page_size: dc.page_size ?? "A4", orientation: dc.orientation ?? "portrait",
    margins: {
      top: num(rawM.top, 20), bottom: num(rawM.bottom, 20),
      left: num(rawM.left, 20), right: num(rawM.right, 20),
    },
    layout_variant: (dc.layout_variant ?? (codes.header ? "image_bands" : "ssb_standard")) as any,
    show_organization_name: dc.show_organization_name !== false,
    show_tagline: dc.show_tagline !== false,
    tagline: dc.tagline ?? DEFAULT_TAGLINE,
    divider_color: dc.divider_color ?? DEFAULT_DIVIDER,
    office_block_layout: (dc.office_block_layout ?? "left_right") as any,
    show_head_office_block: dc.show_head_office_block !== false,
    head_office_location_role: (dc.head_office_location_role ?? "PRIMARY") as any,
    head_office_location_id: dc.head_office_location_id ?? null,
    head_office_label: dc.head_office_label ?? dc.head_office?.label ?? "Head Office:",
    show_branch_office_block: dc.show_branch_office_block !== false,
    branch_office_location_role: (dc.branch_office_location_role ?? "FIRST_BRANCH") as any,
    branch_office_location_id: dc.branch_office_location_id ?? null,
    branch_office_label: dc.branch_office_label ?? dc.branch_office?.label ?? "Branch Office:",
    show_address: dc.show_address !== false,
    show_phone: dc.show_phone !== false,
    show_fax: dc.show_fax !== false,
    show_email: !!dc.show_email,
    show_website: !!dc.show_website,
    footer_note_text_block_code: dc.footer_note_text_block_code ?? null,
    logo_id: codes.logo ? ids[codes.logo] ?? null : null,
    seal_id: codes.seal ? ids[codes.seal] ?? null : null,
    header_id: codes.header ? ids[codes.header] ?? null : null,
    footer_id: codes.footer ? ids[codes.footer] ?? null : null,
    watermark_id: codes.watermark ? ids[codes.watermark] ?? null : null,
    signature_id: codes.signature ? ids[codes.signature] ?? null : null,
    logo_code: codes.logo, seal_code: codes.seal, header_code: codes.header,
    footer_code: codes.footer, watermark_code: codes.watermark, signature_code: codes.signature,
  };
}

function editorToPayload(e: EditorState, publish: boolean) {
  const isSSB = e.layout_variant === "ssb_standard";
  return {
    code: e.code || null,
    name: e.name,
    category: e.category || null,
    subcategory: e.subcategory || null,
    module_code: e.module_code || null,
    document_type: e.document_type || null,
    is_active: publish ? true : e.is_active,
    design_config: {
      layout_variant: e.layout_variant,
      page_size: e.page_size,
      orientation: e.orientation,
      margins: e.margins,

      logo_asset_code: e.logo_code,
      seal_asset_code: isSSB ? null : e.seal_code,
      header_asset_code: isSSB ? null : e.header_code,
      footer_asset_code: e.footer_code,
      watermark_asset_code: e.watermark_code,
      signature_asset_code: e.signature_code,

      // header flags
      show_organization_name: e.show_organization_name,
      show_tagline: e.show_tagline,
      tagline: e.tagline || null,
      divider_color: e.divider_color || null,

      // office block layout + source (no contact text stored)
      office_block_layout: e.office_block_layout,
      show_head_office_block: e.show_head_office_block,
      head_office_location_role: e.head_office_location_role,
      head_office_location_id: e.head_office_location_role === "SPECIFIC" ? e.head_office_location_id : null,
      head_office_label: e.head_office_label || null,

      show_branch_office_block: e.show_branch_office_block,
      branch_office_location_role: e.branch_office_location_role,
      branch_office_location_id: e.branch_office_location_role === "SPECIFIC" ? e.branch_office_location_id : null,
      branch_office_label: e.branch_office_label || null,

      show_address: e.show_address,
      show_phone: e.show_phone,
      show_fax: e.show_fax,
      show_email: e.show_email,
      show_website: e.show_website,

      footer_note_text_block_code: e.footer_note_text_block_code || null,
    },
  };
}

function LetterheadDesignerDialog({
  row, onClose, onSaved,
}: { row: LetterheadRow | null | "new"; onClose: () => void; onSaved: () => void }) {
  const [state, setState] = useState<EditorState | null>(null);
  const [tab, setTab] = useState("general");
  const { data: locations = [] } = useOfficeLocations();
  const { data: textBlocks = [] } = useTextBlocks({ activeOnly: true });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const initial = row === "new" ? EMPTY_EDITOR : await rowToEditor(row as LetterheadRow);
      if (!cancelled) setState(initial);
    })();
    return () => { cancelled = true; };
  }, [row]);

  const set = (patch: Partial<EditorState>) => setState((s) => (s ? { ...s, ...patch } : s));
  const setAsset = (slot: "logo" | "seal" | "header" | "footer" | "watermark" | "signature") =>
    (id: string | null, asset: CommMediaAsset | null) => {
      setState((s) => s ? {
        ...s,
        [`${slot}_id`]: id, [`${slot}_code`]: asset?.asset_code ?? null,
      } as EditorState : s);
    };

  const save = useMutation({
    mutationFn: async ({ publish }: { publish: boolean }) => {
      if (!state) throw new Error("Not ready");
      const payload = editorToPayload(state, publish);
      if (!state.id && !payload.code) {
        const { generateAutoCode } = await import("@/hooks/useAutoCode");
        payload.code = await generateAutoCode({ entityKey: "LETTERHEAD", departmentCode: state.module_code });
      }
      const { error } = state.id
        ? await sb.from("comm_letterhead").update(payload).eq("id", state.id)
        : await sb.from("comm_letterhead").insert([payload]);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { toast.success(v.publish ? "Published" : "Draft saved"); onSaved(); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const subOptions = useMemo(
    () => CATEGORY_OPTIONS.find((c) => c.value === state?.category)?.sub ?? ["General"],
    [state?.category],
  );

  if (!state) {
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md"><div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div></DialogContent>
      </Dialog>
    );
  }

  const previewDesign = {
    layout_variant: state.layout_variant,
    page_size: state.page_size as "A4" | "Letter" | "Legal",
    orientation: state.orientation as "portrait" | "landscape",
    margins: state.margins,
    header_asset_code: state.layout_variant === "ssb_standard" ? undefined : state.header_code ?? undefined,
    footer_asset_code: state.footer_code ?? undefined,
    logo_asset_code: state.logo_code ?? undefined,
    seal_asset_code: state.layout_variant === "ssb_standard" ? undefined : state.seal_code ?? undefined,
    watermark_asset_code: state.watermark_code ?? undefined,
    signature_asset_code: state.signature_code ?? undefined,
    show_organization_name: state.show_organization_name,
    show_tagline: state.show_tagline,
    tagline: state.tagline,
    divider_color: state.divider_color,
    office_block_layout: state.office_block_layout,
    show_head_office_block: state.show_head_office_block,
    head_office_location_role: state.head_office_location_role,
    head_office_location_id: state.head_office_location_id,
    head_office_label: state.head_office_label,
    show_branch_office_block: state.show_branch_office_block,
    branch_office_location_role: state.branch_office_location_role,
    branch_office_location_id: state.branch_office_location_id,
    branch_office_label: state.branch_office_label,
    show_address: state.show_address,
    show_phone: state.show_phone,
    show_fax: state.show_fax,
    show_email: state.show_email,
    show_website: state.show_website,
    footer_note_text_block_code: state.footer_note_text_block_code,
  };

  const footerBlocks = textBlocks.filter((b) =>
    (b.category ?? "").toLowerCase().includes("footer")
    || (b.text_block_code ?? "").toUpperCase().includes("FOOTER"));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{state.id ? `Edit letterhead${state.code ? ` — ${state.code}` : ""}` : "New letterhead"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-4">
          {/* LEFT: form */}
          <div className="col-span-7">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="layout">Layout</TabsTrigger>
                <TabsTrigger value="header">Header &amp; Offices</TabsTrigger>
                <TabsTrigger value="assets">Assets</TabsTrigger>
              </TabsList>

              {/* GENERAL */}
              <TabsContent value="general" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Code</Label>
                    <Input readOnly value={state.code ?? "AUTO — generated on save"} className="font-mono bg-muted" />
                    <p className="text-[11px] text-muted-foreground mt-1">Auto-generated via central numbering (LETTERHEAD sequence).</p>
                  </div>
                  <div>
                    <Label>Name *</Label>
                    <Input value={state.name} onChange={(e) => set({ name: e.target.value })} placeholder="Standard Benefits Letterhead" />
                  </div>
                  <div>
                    <Label>Category *</Label>
                    <Select value={state.category} onValueChange={(v) => set({ category: v, subcategory: CATEGORY_OPTIONS.find((c) => c.value === v)?.sub[0] ?? "General" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORY_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.value}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subcategory</Label>
                    <Select value={state.subcategory} onValueChange={(v) => set({ subcategory: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{subOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Module *</Label>
                    <Select value={state.module_code} onValueChange={(v) => set({ module_code: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{MODULE_OPTIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Document type *</Label>
                    <Select value={state.document_type} onValueChange={(v) => set({ document_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DOC_TYPE_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 pt-2">
                    <Switch checked={state.is_active} onCheckedChange={(v) => set({ is_active: v })} />
                    <Label>Active / Published</Label>
                    <Badge variant={state.is_active ? "default" : "outline"} className="ml-1">
                      {state.is_active ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </div>
              </TabsContent>

              {/* LAYOUT */}
              <TabsContent value="layout" className="space-y-3 pt-3">
                <div>
                  <Label>Layout variant</Label>
                  <Select value={state.layout_variant} onValueChange={(v) => set({ layout_variant: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ssb_standard">SSB Standard (logo left · heading · office blocks)</SelectItem>
                      <SelectItem value="image_bands">Image bands (pre-composed header / footer images)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Page size</Label>
                    <Select value={state.page_size} onValueChange={(v) => set({ page_size: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PAGE_SIZES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Orientation</Label>
                    <Select value={state.orientation} onValueChange={(v) => set({ orientation: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ORIENTATIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Margins (mm)</Label>
                  <div className="grid grid-cols-4 gap-3 mt-1">
                    {(["top", "bottom", "left", "right"] as const).map((k) => (
                      <div key={k}>
                        <Label className="text-[11px] capitalize text-muted-foreground">{k}</Label>
                        <Input type="number" min={0} max={80} value={state.margins[k]}
                               onChange={(e) => set({ margins: { ...state.margins, [k]: Number(e.target.value) || 0 } })} />
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* HEADER & OFFICES — layout only, no contact typing */}
              <TabsContent value="header" className="space-y-4 pt-3">
                <div className="rounded border bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
                  Letterhead controls <b>where</b> the office blocks appear and <b>which fields</b> to show.
                  The actual organization name, address, phone, fax and email are pulled live from{" "}
                  <Link to="/admin/org/foundation/organization" className="underline text-primary">Organization Profile</Link>{" "}
                  and <Link to="/admin/org/foundation/locations" className="underline text-primary">Locations / Branches</Link>.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 mt-1">
                    <Switch checked={state.show_organization_name}
                            onCheckedChange={(v) => set({ show_organization_name: v })} />
                    <Label>Show organization name (from Organization Profile)</Label>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Switch checked={state.show_tagline}
                            onCheckedChange={(v) => set({ show_tagline: v })} />
                    <Label>Show tagline</Label>
                  </div>
                  {state.show_tagline && (
                    <div className="col-span-2">
                      <Label>Tagline (small text under logo)</Label>
                      <Input value={state.tagline} onChange={(e) => set({ tagline: e.target.value })} />
                    </div>
                  )}
                  <div>
                    <Label>Divider colour</Label>
                    <div className="flex gap-2">
                      <Input type="color" className="w-14 p-1 h-9" value={state.divider_color}
                             onChange={(e) => set({ divider_color: e.target.value })} />
                      <Input value={state.divider_color}
                             onChange={(e) => set({ divider_color: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Office block layout</Label>
                    <Select value={state.office_block_layout}
                            onValueChange={(v) => set({ office_block_layout: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OFFICE_LAYOUTS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {state.office_block_layout !== "none" && state.office_block_layout !== "header_only" && (
                  <>
                    {/* Head office */}
                    <div className="rounded border p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Switch checked={state.show_head_office_block}
                                onCheckedChange={(v) => set({ show_head_office_block: v })} />
                        <Label className="font-medium">Head Office block</Label>
                      </div>
                      {state.show_head_office_block && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Source</Label>
                            <Select value={state.head_office_location_role}
                                    onValueChange={(v) => set({ head_office_location_role: v as any })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PRIMARY">Use primary location</SelectItem>
                                <SelectItem value="HEAD_OFFICE">Use HEAD_OFFICE type</SelectItem>
                                <SelectItem value="SPECIFIC">Pick a specific location…</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {state.head_office_location_role === "SPECIFIC" && (
                            <div>
                              <Label className="text-xs">Location</Label>
                              <Select value={state.head_office_location_id ?? ""}
                                      onValueChange={(v) => set({ head_office_location_id: v || null })}>
                                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                                <SelectContent>
                                  {locations.map((l) => (
                                    <SelectItem key={l.id} value={l.id}>
                                      {l.branch_name} {l.location_type ? `· ${l.location_type}` : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <div>
                            <Label className="text-xs">Label</Label>
                            <Input value={state.head_office_label}
                                   onChange={(e) => set({ head_office_label: e.target.value })} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Branch office */}
                    <div className="rounded border p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Switch checked={state.show_branch_office_block}
                                onCheckedChange={(v) => set({ show_branch_office_block: v })} />
                        <Label className="font-medium">Branch Office block</Label>
                      </div>
                      {state.show_branch_office_block && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Source</Label>
                            <Select value={state.branch_office_location_role}
                                    onValueChange={(v) => set({ branch_office_location_role: v as any })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="FIRST_BRANCH">Use first active branch</SelectItem>
                                <SelectItem value="SPECIFIC">Pick a specific location…</SelectItem>
                                <SelectItem value="NONE">Hide branch block</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {state.branch_office_location_role === "SPECIFIC" && (
                            <div>
                              <Label className="text-xs">Location</Label>
                              <Select value={state.branch_office_location_id ?? ""}
                                      onValueChange={(v) => set({ branch_office_location_id: v || null })}>
                                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                                <SelectContent>
                                  {locations.map((l) => (
                                    <SelectItem key={l.id} value={l.id}>
                                      {l.branch_name} {l.location_type ? `· ${l.location_type}` : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <div>
                            <Label className="text-xs">Label</Label>
                            <Input value={state.branch_office_label}
                                   onChange={(e) => set({ branch_office_label: e.target.value })} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Field toggles */}
                    <div className="rounded border p-3">
                      <Label className="font-medium">Fields to show inside each office block</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                        {([
                          ["show_address", "Address"],
                          ["show_phone", "Phone"],
                          ["show_fax", "Fax"],
                          ["show_email", "Email"],
                          ["show_website", "Website"],
                        ] as const).map(([k, lbl]) => (
                          <label key={k} className="flex items-center gap-1.5">
                            <Switch checked={(state as any)[k]}
                                    onCheckedChange={(v) => set({ [k]: v } as any)} />
                            {lbl}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Footer note = Text Block */}
                <div className="rounded border p-3 space-y-2">
                  <Label className="font-medium">Footer note</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Reuse a Text Block so the same footer can be updated everywhere at once.
                    Leave empty to hide the footer note.
                  </p>
                  <Select value={state.footer_note_text_block_code ?? "__none"}
                          onValueChange={(v) => set({ footer_note_text_block_code: v === "__none" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="Select a text block…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— No footer note —</SelectItem>
                      {footerBlocks.map((b) => (
                        <SelectItem key={b.text_block_code} value={b.text_block_code}>
                          {b.name} · {b.text_block_code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* ASSETS */}
              <TabsContent value="assets" className="space-y-3 pt-3">
                <p className="text-[11px] text-muted-foreground">
                  Pick from the Media Library. Each slot is filtered by category.
                  <Link to="/admin/org/assets/media" className="underline text-primary ml-1">Open Media Library</Link>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <AssetPickerField label="Logo" category={"logo" as CommAssetCategory}
                                    value={state.logo_id} onChange={setAsset("logo")} />
                  <AssetPickerField label="Seal / Stamp" category={"seal" as CommAssetCategory}
                                    value={state.seal_id} onChange={setAsset("seal")} />
                  <AssetPickerField label="Header banner" category={"letterhead_header" as CommAssetCategory}
                                    value={state.header_id} onChange={setAsset("header")} />
                  <AssetPickerField label="Footer banner" category={"letterhead_footer" as CommAssetCategory}
                                    value={state.footer_id} onChange={setAsset("footer")} />
                  <AssetPickerField label="Watermark" category={"watermark" as CommAssetCategory}
                                    value={state.watermark_id} onChange={setAsset("watermark")} />
                  <AssetPickerField label="Signature (optional)" category={"signature" as CommAssetCategory}
                                    value={state.signature_id} onChange={setAsset("signature")} />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT: live preview */}
          <div className="col-span-5">
            <div className="sticky top-0">
              <Label className="text-xs">Live preview</Label>
              <div className="bg-muted/40 rounded p-3 mt-1 overflow-auto max-h-[70vh]">
                <LetterheadPreview design={previewDesign as any} width={400} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Office details come from Locations / Branches — edit there to update every letterhead.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-wrap gap-2 justify-between sm:justify-between">
          <div className="text-[11px] text-muted-foreground self-center">
            Layout only — organization &amp; branch data are pulled live at render time.
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="secondary" disabled={!state.name || save.isPending}
                    onClick={() => save.mutate({ publish: false })}>
              <FileEdit className="h-4 w-4 mr-1" /> Save as Draft
            </Button>
            <Button disabled={!state.name || save.isPending}
                    onClick={() => save.mutate({ publish: true })}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Publish
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Inner() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useLetterheads();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<LetterheadRow | "new" | null>(null);
  const [previewing, setPreviewing] = useState<LetterheadRow | null>(null);

  const archive = useMutation({
    mutationFn: async (r: LetterheadRow) => {
      const { error } = await sb.from("comm_letterhead").update({ is_active: !r.is_active }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: (_d, r) => { toast.success(r.is_active ? "Archived" : "Restored"); qc.invalidateQueries({ queryKey: ["comm_letterhead"] }); },
    onError: (e: any) => toast.error(e.message ?? "Update failed"),
  });

  const clone = useMutation({
    mutationFn: async (r: LetterheadRow) => {
      const { generateAutoCode } = await import("@/hooks/useAutoCode");
      const code = await generateAutoCode({ entityKey: "LETTERHEAD", departmentCode: r.module_code ?? undefined });
      const { error } = await sb.from("comm_letterhead").insert([{
        code, name: `${r.name} (copy)`, category: r.category, subcategory: r.subcategory,
        module_code: r.module_code, document_type: r.document_type, is_active: false,
        design_config: r.design_config ?? {},
      }]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cloned as draft"); qc.invalidateQueries({ queryKey: ["comm_letterhead"] }); },
    onError: (e: any) => toast.error(e.message ?? "Clone failed"),
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => [r.code, r.name, r.module_code, r.category, r.subcategory, r.document_type].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [rows, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, LetterheadRow[]>();
    filtered.forEach((r) => { const k = r.module_code ?? "ORG"; if (!map.has(k)) map.set(k, []); map.get(k)!.push(r); });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div className="flex items-start gap-3">
        <Ruler className="h-6 w-6 text-primary mt-1" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Letterheads</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Letterheads store <b>layout only</b> — page, margins, assets and where the head/branch
            office blocks appear. The actual organization name, address, phone and email come
            live from{" "}
            <Link to="/admin/org/foundation/organization" className="underline text-primary">Organization Profile</Link>{" "}
            and <Link to="/admin/org/foundation/locations" className="underline text-primary">Locations / Branches</Link>.
            Assign a letterhead in{" "}
            <Link to="/admin/org/configuration-center?domain=branding" className="underline text-primary">Configuration Center → Branding</Link>.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> New Letterhead</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input placeholder="Search letterheads…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card><CardContent className="flex justify-center p-12"><Loader2 className="animate-spin" /></CardContent></Card>
      ) : grouped.length === 0 ? (
        <Card><CardContent className="p-8 text-sm text-muted-foreground text-center">No letterheads found.</CardContent></Card>
      ) : grouped.map(([moduleCode, list]) => (
        <Card key={moduleCode}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/40">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm">Module: {moduleCode}</h2>
                <Badge variant="secondary" className="text-xs">{list.length}</Badge>
              </div>
            </div>
            <Table sticky>
              <TableHeader>
                <TableRow>
                  <TableHead>Code / Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Doc Type</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Office layout</TableHead>
                  <TableHead>Asset References</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[240px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => {
                  const dc = r.design_config ?? {};
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-mono text-xs">{r.code ?? "—"}</div>
                        <div className="text-sm">{r.name}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.category ?? "—"}
                        {r.subcategory && <div className="text-muted-foreground">{r.subcategory}</div>}
                      </TableCell>
                      <TableCell className="text-xs">{r.document_type ?? "—"}</TableCell>
                      <TableCell className="text-xs">{(dc.page_size ?? "A4")} · {(dc.orientation ?? "portrait")}</TableCell>
                      <TableCell className="text-xs">
                        <div>{dc.office_block_layout ?? "left_right"}</div>
                        <div className="text-muted-foreground">
                          H: {dc.head_office_location_role ?? "PRIMARY"} · B: {dc.branch_office_location_role ?? "FIRST_BRANCH"}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <AssetChip label="header" code={dc.header_asset_code} />
                        <AssetChip label="footer" code={dc.footer_asset_code} />
                        <AssetChip label="logo" code={dc.logo_asset_code} />
                        <AssetChip label="seal" code={dc.seal_asset_code} />
                        <AssetChip label="watermark" code={dc.watermark_asset_code} />
                      </TableCell>
                      <TableCell>
                        {r.is_active ? <Badge variant="default">Published</Badge> : <Badge variant="outline">Draft / Archived</Badge>}
                      </TableCell>
                      <TableCell className="flex flex-wrap gap-1">
                        <Button size="sm" variant="ghost" title="Edit" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" title="Clone" onClick={() => clone.mutate(r)}><Copy className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" title="Preview" onClick={() => setPreviewing(r)}><Eye className="h-3.5 w-3.5" /></Button>
                        <WhereUsedButton assetId={r.id} assetName={r.name} />
                        <Button size="sm" variant="ghost" title={r.is_active ? "Archive" : "Restore"} onClick={() => archive.mutate(r)}>
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {editing && (
        <LetterheadDesignerDialog
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["comm_letterhead"] }); setEditing(null); }}
        />
      )}

      {previewing && (
        <Dialog open onOpenChange={(o) => !o && setPreviewing(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Preview — {previewing.name}</DialogTitle>
            </DialogHeader>
            <div className="bg-muted/40 p-4 rounded overflow-auto max-h-[75vh]">
              <LetterheadPreview design={previewing.design_config ?? {}} />
            </div>
            <p className="text-xs text-muted-foreground">
              Office details resolved live from Locations / Branches. Update a location to see it here instantly.
            </p>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function LetterheadsPage() {
  return <PermissionWrapper moduleName="org_letterheads"><Inner /></PermissionWrapper>;
}
