/**
 * Base Layout Editor — the redesigned admin-friendly editor.
 *
 * Admins configure a layout by picking reusable master components
 * (logo, header/footer images, letterhead, signature, print footer,
 * disclaimer, theme, font). Raw HTML editing is hidden inside an
 * "Advanced HTML" collapsible for power users only.
 *
 * At save time, HTML slot fields (`header_html`, `footer_html`,
 * `body_placeholder_html`, `signature_slot`, `footer_slot`,
 * `disclaimer_slot`) are synthesized from the picks so the existing
 * runtime resolver keeps working. When Advanced HTML is edited, those
 * user values override the synthesized ones.
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, Monitor, Smartphone, ChevronDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  MediaAssetPicker, LetterheadPicker, SignaturePicker, PrintFooterPicker,
  DisclaimerPicker, ThemePicker, FontFamilyPicker, ColorPickerField,
  resolveFontStack, checkActive,
} from "./LayoutComponentPickers";
import { composeEmailFromLayout, composeChannelBodyFromLayout } from "@/lib/enterprise/resolvers/emailBrandingResolver";

const sb = supabase as any;

type Kind =
  | "EMAIL" | "SMS" | "WHATSAPP" | "IN_APP" | "PUSH"
  | "LETTER" | "NOTICE" | "CERTIFICATE" | "STATEMENT" | "RECEIPT" | "REPORT";

export interface BaseLayoutRow {
  id?: string;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  layout_kind: Kind;
  is_base_layout?: boolean;
  is_active?: boolean;
  mobile_responsive?: boolean | null;

  /* Component references (new) */
  logo_asset_id?: string | null;
  header_asset_id?: string | null;
  footer_asset_id?: string | null;
  letterhead_id?: string | null;
  email_signature_id?: string | null;
  print_footer_id?: string | null;
  disclaimer_text_block_code?: string | null;
  theme_id?: string | null;
  font_family_code?: string | null;

  /* Direct styling */
  email_max_width?: number | null;
  email_background_hex?: string | null;
  email_font_family?: string | null;
  logo_position?: string | null;
  page_size?: string | null;
  orientation?: string | null;

  /* Advanced raw HTML overrides */
  header_html?: string | null;
  footer_html?: string | null;
  body_placeholder_html?: string | null;
  signature_slot?: string | null;
  footer_slot?: string | null;
  disclaimer_slot?: string | null;
}

const IS_EMAIL = (k: Kind) => k === "EMAIL";
const IS_DOCUMENT = (k: Kind) => ["LETTER","NOTICE","CERTIFICATE","STATEMENT","RECEIPT","REPORT"].includes(k);

/* ------------------------------------------------------------------ */
/* Sample resolved content for the preview                             */
/* ------------------------------------------------------------------ */

const SAMPLE_BODY = "<p>Dear {{recipient.name}},</p><p>This is a preview of your business content. Signature, footer and disclaimer are inherited from organization / department / module defaults — you do not edit them here.</p><p>Regards,<br/>{{sender.name}}</p>";
const SAMPLE_SIG = "<p><strong>Jane Doe</strong><br/>Director, Registration<br/>Social Security Board</p>";
const SAMPLE_FOOT = "<div>Social Security Board · Church Street · Basseterre, St. Kitts</div>";
const SAMPLE_DISC = "<div style=\"color:#888;font-size:11px\">This email is intended solely for the addressee and may contain confidential information.</div>";

/* ------------------------------------------------------------------ */
/* Auto-synthesize HTML from picks                                     */
/* ------------------------------------------------------------------ */

async function fetchMediaUrl(id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const { data } = await sb.from("comm_media_asset").select("preview_url,external_url").eq("id", id).maybeSingle();
  return (data?.preview_url as string | null) || (data?.external_url as string | null) || null;
}

interface Synth {
  header_html: string | null;
  footer_html: string | null;
  body_placeholder_html: string;
  signature_slot: string;
  footer_slot: string;
  disclaimer_slot: string;
}

async function synthesizeSlots(row: BaseLayoutRow): Promise<Synth> {
  const logo = await fetchMediaUrl(row.logo_asset_id);
  const headerImg = await fetchMediaUrl(row.header_asset_id);
  const footerImg = await fetchMediaUrl(row.footer_asset_id);
  const fontStack = resolveFontStack(row.font_family_code) || row.email_font_family || "Arial, sans-serif";

  const bg = row.email_background_hex || "#ffffff";

  const headerParts: string[] = [];
  if (headerImg) headerParts.push(`<img src="${headerImg}" alt="header" style="max-width:100%;display:block" />`);
  else if (logo) headerParts.push(`<img src="${logo}" alt="logo" style="max-height:60px" />`);
  const header_html = headerParts.length
    ? `<div style="padding:16px;background:${bg};font-family:${fontStack};">${headerParts.join("")}</div>`
    : null;

  const footerParts: string[] = [];
  if (footerImg) footerParts.push(`<img src="${footerImg}" alt="footer" style="max-width:100%;display:block" />`);
  footerParts.push('{{FOOTER_BLOCK}}');
  footerParts.push('{{DISCLAIMER_BLOCK}}');
  const footer_html = `<div style="padding:16px;background:${bg};font-family:${fontStack};font-size:12px;color:#555;">${footerParts.join("")}</div>`;

  return {
    header_html,
    footer_html,
    body_placeholder_html: `<div style="padding:24px;font-family:${fontStack};color:#222;">{{BODY}}</div>`,
    signature_slot: "{{SIGNATURE_BLOCK}}",
    footer_slot: "{{FOOTER_BLOCK}}",
    disclaimer_slot: "{{DISCLAIMER_BLOCK}}",
  };
}

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

export function BaseLayoutEditorDialog({
  open, onOpenChange, initial, kind,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: BaseLayoutRow | null;
  kind: Kind;
}) {
  const qc = useQueryClient();
  const [row, setRow] = useState<BaseLayoutRow>({ layout_kind: kind });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedTouched, setAdvancedTouched] = useState(false);
  const [device, setDevice] = useState<"desktop"|"mobile">("desktop");
  const [previewMode, setPreviewMode] = useState<"resolved"|"raw">("resolved");
  const [synth, setSynth] = useState<Synth | null>(null);

  useEffect(() => {
    setRow(initial ?? {
      layout_kind: kind,
      is_active: true,
      mobile_responsive: true,
      email_max_width: 640,
      email_background_hex: "#f4f4f4",
      font_family_code: "ARIAL",
      logo_position: "header-left",
    });
    setAdvancedOpen(false);
    setAdvancedTouched(false);
  }, [initial, open, kind]);

  const set = <K extends keyof BaseLayoutRow>(k: K, v: BaseLayoutRow[K]) =>
    setRow((r) => ({ ...r, [k]: v }));

  /* --- Live synthesis for preview --- */
  useEffect(() => {
    let cancelled = false;
    synthesizeSlots(row).then((s) => { if (!cancelled) setSynth(s); });
    return () => { cancelled = true; };
  }, [row.logo_asset_id, row.header_asset_id, row.footer_asset_id, row.email_background_hex, row.font_family_code, row.email_font_family]);

  /* --- Preview HTML --- */
  const previewHtml = useMemo(() => {
    if (!synth) return "";
    const effective = advancedTouched
      ? {
          header_html: row.header_html ?? synth.header_html,
          footer_html: row.footer_html ?? synth.footer_html,
          body_placeholder_html: row.body_placeholder_html ?? synth.body_placeholder_html,
          signature_slot: row.signature_slot ?? synth.signature_slot,
          footer_slot: row.footer_slot ?? synth.footer_slot,
          disclaimer_slot: row.disclaimer_slot ?? synth.disclaimer_slot,
        }
      : synth;

    if (IS_EMAIL(kind)) {
      return composeEmailFromLayout({
        layout: {
          id: "preview",
          code: row.code ?? "PREVIEW",
          name: row.name ?? "",
          header_html: effective.header_html,
          footer_html: effective.footer_html,
          body_placeholder_html: effective.body_placeholder_html,
          signature_slot: effective.signature_slot,
          footer_slot: effective.footer_slot,
          disclaimer_slot: effective.disclaimer_slot,
          logo_position: row.logo_position ?? null,
          email_max_width: row.email_max_width ?? 640,
          email_background_hex: row.email_background_hex ?? "#f4f4f4",
          email_font_family: resolveFontStack(row.font_family_code) || row.email_font_family || "Arial, sans-serif",
          email_button_style_json: null,
          email_divider_style_json: null,
          mobile_responsive: row.mobile_responsive ?? true,
          is_active: row.is_active ?? true,
        },
        bodyHtml: previewMode === "resolved" ? SAMPLE_BODY : "<em>Raw business content only — no shell.</em>",
        signatureHtml: previewMode === "resolved" ? SAMPLE_SIG : "",
        footerHtml: previewMode === "resolved" ? SAMPLE_FOOT : "",
        disclaimerHtml: previewMode === "resolved" ? SAMPLE_DISC : "",
      });
    }

    // Non-email channels: text-oriented preview via composeChannelBodyFromLayout
    const body = composeChannelBodyFromLayout({
      layout: {
        body_placeholder_html: effective.body_placeholder_html,
        signature_slot: effective.signature_slot,
        footer_slot: effective.footer_slot,
        disclaimer_slot: effective.disclaimer_slot,
      },
      bodyContent: previewMode === "resolved" ? "«Business content goes here»" : "«Raw content»",
      signature: previewMode === "resolved" ? "Signature block from org/dept" : "",
      footer: previewMode === "resolved" ? "Footer block from org" : "",
      disclaimer: previewMode === "resolved" ? "Disclaimer from Text Blocks" : "",
    });
    return `<!doctype html><html><body style="font-family:${resolveFontStack(row.font_family_code) ?? "sans-serif"};padding:16px;white-space:pre-wrap">${body}</body></html>`;
  }, [row, synth, kind, previewMode, advancedTouched]);

  /* --- Validation --- */
  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (!row.name?.trim()) errs.push("Name is required");
    if (!row.code?.trim() && !row.id) errs.push("Code will be auto-assigned; leave blank to auto-generate");
    if (IS_EMAIL(kind)) {
      if (!row.header_asset_id && !row.logo_asset_id) errs.push("Email layout requires a logo or header image");
    }
    if (IS_DOCUMENT(kind) && !row.letterhead_id && !row.header_asset_id) {
      errs.push("Document layout requires a letterhead or header image");
    }
    if (advancedTouched) {
      const adv = [row.body_placeholder_html, row.footer_html, row.header_html].filter(Boolean).join(" ");
      if (row.body_placeholder_html && !row.body_placeholder_html.includes("{{BODY}}")) {
        errs.push("Advanced body placeholder must contain {{BODY}}");
      }
      const knownSlots = ["{{BODY}}","{{SIGNATURE_BLOCK}}","{{FOOTER_BLOCK}}","{{DISCLAIMER_BLOCK}}"];
      const unknown = (adv.match(/\{\{[A-Z_]+\}\}/g) ?? []).filter((t) => !knownSlots.includes(t));
      if (unknown.length) errs.push(`Advanced HTML references unknown slot(s): ${[...new Set(unknown)].join(", ")}`);
    }
    return errs;
  }, [row, kind, advancedTouched]);

  /* --- Save --- */
  const save = useMutation({
    mutationFn: async () => {
      if (validationErrors.length) throw new Error(validationErrors[0]);
      // Active checks for referenced masters
      const checks = await Promise.all([
        checkActive("comm_media_asset", row.logo_asset_id),
        checkActive("comm_media_asset", row.header_asset_id),
        checkActive("comm_media_asset", row.footer_asset_id),
        checkActive("comm_letterhead", row.letterhead_id),
        checkActive("comm_email_signature", row.email_signature_id),
        checkActive("comm_print_footer", row.print_footer_id),
      ]);
      const labels = ["Logo","Header image","Footer image","Letterhead","Signature","Print footer"];
      const inactive = checks.map((v, i) => v === false ? labels[i] : null).filter(Boolean);
      if (inactive.length) throw new Error(`Selected component is inactive: ${inactive.join(", ")}`);

      const s = await synthesizeSlots(row);
      const payload: any = {
        name: row.name,
        description: row.description ?? null,
        layout_kind: kind,
        is_active: row.is_active ?? true,
        mobile_responsive: row.mobile_responsive ?? true,
        logo_asset_id: row.logo_asset_id ?? null,
        header_asset_id: row.header_asset_id ?? null,
        footer_asset_id: row.footer_asset_id ?? null,
        letterhead_id: row.letterhead_id ?? null,
        email_signature_id: row.email_signature_id ?? null,
        print_footer_id: row.print_footer_id ?? null,
        disclaimer_text_block_code: row.disclaimer_text_block_code ?? null,
        theme_id: row.theme_id ?? null,
        font_family_code: row.font_family_code ?? null,
        email_max_width: row.email_max_width ?? null,
        email_background_hex: row.email_background_hex ?? null,
        email_font_family: resolveFontStack(row.font_family_code) || row.email_font_family || null,
        logo_position: row.logo_position ?? null,
        // Synthesized HTML slots (advanced overrides win)
        header_html: advancedTouched ? (row.header_html ?? s.header_html) : s.header_html,
        footer_html: advancedTouched ? (row.footer_html ?? s.footer_html) : s.footer_html,
        body_placeholder_html: advancedTouched ? (row.body_placeholder_html ?? s.body_placeholder_html) : s.body_placeholder_html,
        signature_slot: advancedTouched ? (row.signature_slot ?? s.signature_slot) : s.signature_slot,
        footer_slot: advancedTouched ? (row.footer_slot ?? s.footer_slot) : s.footer_slot,
        disclaimer_slot: advancedTouched ? (row.disclaimer_slot ?? s.disclaimer_slot) : s.disclaimer_slot,
      };
      if (row.id) {
        const { error } = await sb.from("core_template_layout").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        payload.code = row.code || null;
        const { error } = await sb.from("core_template_layout").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["base_layouts_all"] });
      qc.invalidateQueries({ queryKey: ["email_layouts"] });
      toast.success("Layout saved");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const canSave = validationErrors.length === 0 && !save.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {row.id ? "Edit" : "New"} {kind} Base Layout
            {row.is_base_layout && <Badge variant="secondary">System base</Badge>}
          </DialogTitle>
          <DialogDescription>
            Pick reusable components — do not write HTML unless you must. Raw HTML lives under <em>Advanced</em>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4 flex-1 overflow-hidden">
          {/* -------- Left: form -------- */}
          <div className="space-y-4 overflow-y-auto pr-2">
            {/* Identity */}
            <section className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Name *</Label>
                  <Input value={row.name ?? ""} onChange={(e) => set("name", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Code {row.id ? "" : "(auto-assigned if blank)"}</Label>
                  <Input value={row.code ?? ""} disabled={!!row.id} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="Auto" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Input value={row.description ?? ""} onChange={(e) => set("description", e.target.value)} />
              </div>
            </section>

            {/* Branding slot components */}
            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">Header & branding</h3>
              <MediaAssetPicker
                label="Logo" categories={["logo","organization_logo","letterhead_header"]}
                value={row.logo_asset_id} onChange={(v) => set("logo_asset_id", v)}
                hint="Choose an image from Media Library."
              />
              {IS_EMAIL(kind) || IS_DOCUMENT(kind) ? (
                <MediaAssetPicker
                  label="Header image" categories={["letterhead_header","email_header","header"]}
                  value={row.header_asset_id} onChange={(v) => set("header_asset_id", v)}
                />
              ) : null}
              {IS_DOCUMENT(kind) && (
                <LetterheadPicker
                  label="Letterhead" required
                  value={row.letterhead_id} onChange={(v) => set("letterhead_id", v)}
                  hint="Letterhead defines full-page framing."
                />
              )}
            </section>

            {/* Body / typography */}
            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">Body & typography</h3>
              <div className="grid grid-cols-2 gap-2">
                <FontFamilyPicker
                  label="Font family"
                  value={row.font_family_code}
                  onChange={(v) => set("font_family_code", v)}
                />
                <ColorPickerField
                  label="Background colour"
                  value={row.email_background_hex}
                  onChange={(v) => set("email_background_hex", v)}
                />
              </div>
              {IS_EMAIL(kind) && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Max width (px)</Label>
                    <Input type="number" value={row.email_max_width ?? 640} onChange={(e) => set("email_max_width", Number(e.target.value))} />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex items-center gap-2 h-9">
                      <Switch checked={row.mobile_responsive ?? true} onCheckedChange={(v) => set("mobile_responsive", v)} />
                      <Label className="text-xs">Mobile responsive</Label>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Signature / footer / disclaimer */}
            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">Signature, footer, disclaimer</h3>
              <SignaturePicker
                label="Signature (default rule)"
                value={row.email_signature_id} onChange={(v) => set("email_signature_id", v)}
                hint="If unset, resolver walks organization → department → module."
                inherited={!row.email_signature_id}
                onReset={() => set("email_signature_id", null)}
              />
              <PrintFooterPicker
                label="Footer component"
                value={row.print_footer_id} onChange={(v) => set("print_footer_id", v)}
                inherited={!row.print_footer_id}
                onReset={() => set("print_footer_id", null)}
              />
              <MediaAssetPicker
                label="Footer image (optional)"
                categories={["letterhead_footer","email_footer","footer"]}
                value={row.footer_asset_id} onChange={(v) => set("footer_asset_id", v)}
              />
              <DisclaimerPicker
                label="Disclaimer"
                value={row.disclaimer_text_block_code}
                onChange={(v) => set("disclaimer_text_block_code", v)}
                inherited={!row.disclaimer_text_block_code}
                onReset={() => set("disclaimer_text_block_code", null)}
              />
            </section>

            {/* Theme */}
            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">Theme</h3>
              <ThemePicker
                label="Theme"
                value={row.theme_id} onChange={(v) => set("theme_id", v)}
                inherited={!row.theme_id}
                onReset={() => set("theme_id", null)}
              />
            </section>

            {/* Document-only settings */}
            {IS_DOCUMENT(kind) && (
              <section className="space-y-2 rounded-md border p-3">
                <h3 className="text-sm font-semibold">Page setup</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Page size</Label>
                    <select className="h-9 w-full rounded border bg-background px-2 text-sm" value={row.page_size ?? "A4"} onChange={(e) => set("page_size", e.target.value)}>
                      <option value="A4">A4</option><option value="LETTER">Letter</option><option value="LEGAL">Legal</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Orientation</Label>
                    <select className="h-9 w-full rounded border bg-background px-2 text-sm" value={row.orientation ?? "PORTRAIT"} onChange={(e) => set("orientation", e.target.value)}>
                      <option value="PORTRAIT">Portrait</option><option value="LANDSCAPE">Landscape</option>
                    </select>
                  </div>
                </div>
              </section>
            )}

            {/* Advanced */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span>Advanced HTML (power users)</span>
                  <ChevronDown className={`h-4 w-4 transition ${advancedOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {advancedTouched && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Advanced HTML overrides visual slot configuration. Preview reflects the raw HTML you entered.
                    </AlertDescription>
                  </Alert>
                )}
                <div>
                  <Label className="text-xs">Header HTML</Label>
                  <Textarea rows={3} className="font-mono text-xs" value={row.header_html ?? ""}
                    onChange={(e) => { set("header_html", e.target.value); setAdvancedTouched(true); }} />
                </div>
                <div>
                  <Label className="text-xs">Body placeholder (must contain {"{{BODY}}"})</Label>
                  <Textarea rows={2} className="font-mono text-xs" value={row.body_placeholder_html ?? ""}
                    onChange={(e) => { set("body_placeholder_html", e.target.value); setAdvancedTouched(true); }} />
                </div>
                <div>
                  <Label className="text-xs">Footer HTML</Label>
                  <Textarea rows={3} className="font-mono text-xs" value={row.footer_html ?? ""}
                    onChange={(e) => { set("footer_html", e.target.value); setAdvancedTouched(true); }} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Signature slot</Label>
                    <Input className="font-mono text-xs" value={row.signature_slot ?? ""} placeholder="{{SIGNATURE_BLOCK}}"
                      onChange={(e) => { set("signature_slot", e.target.value); setAdvancedTouched(true); }} />
                  </div>
                  <div>
                    <Label className="text-xs">Footer slot</Label>
                    <Input className="font-mono text-xs" value={row.footer_slot ?? ""} placeholder="{{FOOTER_BLOCK}}"
                      onChange={(e) => { set("footer_slot", e.target.value); setAdvancedTouched(true); }} />
                  </div>
                  <div>
                    <Label className="text-xs">Disclaimer slot</Label>
                    <Input className="font-mono text-xs" value={row.disclaimer_slot ?? ""} placeholder="{{DISCLAIMER_BLOCK}}"
                      onChange={(e) => { set("disclaimer_slot", e.target.value); setAdvancedTouched(true); }} />
                  </div>
                </div>
                {advancedTouched && (
                  <Button size="sm" variant="ghost" onClick={() => {
                    setAdvancedTouched(false);
                    setRow((r) => ({ ...r, header_html: null, footer_html: null, body_placeholder_html: null, signature_slot: null, footer_slot: null, disclaimer_slot: null }));
                  }}>Reset advanced overrides</Button>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Status */}
            <div className="flex items-center gap-2 pt-1">
              <Switch checked={row.is_active ?? true} onCheckedChange={(v) => set("is_active", v)} />
              <Label className="text-xs">Active</Label>
            </div>

            {/* Validation summary */}
            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <ul className="list-disc pl-4">{validationErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* -------- Right: preview -------- */}
          <div className="flex flex-col gap-2 overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <Tabs value={device} onValueChange={(v) => setDevice(v as any)}>
                <TabsList>
                  <TabsTrigger value="desktop"><Monitor className="h-3.5 w-3.5 mr-1" /> Desktop</TabsTrigger>
                  <TabsTrigger value="mobile"><Smartphone className="h-3.5 w-3.5 mr-1" /> Mobile</TabsTrigger>
                </TabsList>
              </Tabs>
              <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)}>
                <TabsList>
                  <TabsTrigger value="resolved">Fully resolved</TabsTrigger>
                  <TabsTrigger value="raw">Raw content</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className={`flex-1 border rounded bg-white overflow-auto ${device === "mobile" ? "flex justify-center" : ""}`}>
              <iframe
                title="layout-preview"
                srcDoc={previewHtml}
                className="bg-white"
                style={{ width: device === "mobile" ? 390 : "100%", height: "100%", minHeight: 500, border: 0 }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Sample signature / footer / disclaimer are placeholders; real content is injected at send time by the branding resolver.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!canSave}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save layout</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
