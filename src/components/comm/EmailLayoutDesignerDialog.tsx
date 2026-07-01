import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Save, Monitor, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { composeEmailFromLayout, type EmailLayout } from "@/lib/enterprise/resolvers/emailBrandingResolver";

const sb = supabase as any;

const SAMPLE_BODY =
  "<p>Dear {{recipient.name}},</p><p>This is a preview of your business content. Signature, footer and disclaimer are inherited from organization / department / module defaults — you do not edit them here.</p><p>Regards,<br/>{{sender.name}}</p>";
const SAMPLE_SIG = "<p><strong>Jane Doe</strong><br/>Director, Registration<br/>Social Security Board</p>";
const SAMPLE_FOOT = "<div>Social Security Board · Church Street · Basseterre, St. Kitts</div>";
const SAMPLE_DISC = "<div style=\"color:#888;font-size:11px\">This email is intended solely for the addressee and may contain confidential information.</div>";

interface Row extends Partial<EmailLayout> {
  description?: string | null;
  is_base_layout?: boolean;
  layout_kind?: string;
}

export function EmailLayoutDesignerDialog({
  open, onOpenChange, initial,
}: { open: boolean; onOpenChange: (v: boolean) => void; initial?: Row | null }) {
  const qc = useQueryClient();
  const [row, setRow] = useState<Row>({});
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    setRow(
      initial ?? {
        layout_kind: "EMAIL" as any,
        is_active: true,
        is_base_layout: false,
        mobile_responsive: true,
        email_max_width: 640,
        email_background_hex: "#f4f4f4",
        email_font_family: "Arial, Helvetica, sans-serif",
        body_placeholder_html: '<div style="padding:24px;color:#222">{{BODY}}</div>',
        signature_slot: "{{SIGNATURE_BLOCK}}",
        footer_slot: "{{FOOTER_BLOCK}}",
        disclaimer_slot: "{{DISCLAIMER_BLOCK}}",
        logo_position: "header-left",
      },
    );
  }, [initial, open]);

  const set = (k: keyof Row, v: any) => setRow((r) => ({ ...r, [k]: v }));

  const buttonStyle = useMemo(() => {
    try {
      return typeof row.email_button_style_json === "string"
        ? row.email_button_style_json
        : JSON.stringify(row.email_button_style_json ?? {}, null, 2);
    } catch { return "{}"; }
  }, [row.email_button_style_json]);

  const dividerStyle = useMemo(() => {
    try {
      return typeof row.email_divider_style_json === "string"
        ? row.email_divider_style_json
        : JSON.stringify(row.email_divider_style_json ?? {}, null, 2);
    } catch { return "{}"; }
  }, [row.email_divider_style_json]);

  const save = useMutation({
    mutationFn: async () => {
      if (!row.code?.trim()) throw new Error("Code is required");
      if (!row.name?.trim()) throw new Error("Name is required");
      const payload: any = { ...row, layout_kind: "EMAIL" };
      // parse JSON strings back
      try { payload.email_button_style_json = typeof buttonStyle === "string" ? JSON.parse(buttonStyle || "{}") : buttonStyle; } catch { throw new Error("Button style JSON is invalid"); }
      try { payload.email_divider_style_json = typeof dividerStyle === "string" ? JSON.parse(dividerStyle || "{}") : dividerStyle; } catch { throw new Error("Divider style JSON is invalid"); }
      if (row.id) {
        const { error } = await sb.from("core_template_layout").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("core_template_layout").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email_layouts"] });
      toast.success("Email layout saved");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const previewHtml = useMemo(() => {
    const layout: EmailLayout = {
      id: "preview",
      code: row.code ?? "PREVIEW",
      name: row.name ?? "",
      header_html: row.header_html ?? "",
      footer_html: row.footer_html ?? "",
      body_placeholder_html: row.body_placeholder_html ?? "{{BODY}}",
      signature_slot: row.signature_slot ?? null,
      footer_slot: row.footer_slot ?? null,
      disclaimer_slot: row.disclaimer_slot ?? null,
      logo_position: row.logo_position ?? null,
      email_max_width: row.email_max_width ?? 640,
      email_background_hex: row.email_background_hex ?? "#f4f4f4",
      email_font_family: row.email_font_family ?? "Arial, sans-serif",
      email_button_style_json: null,
      email_divider_style_json: null,
      mobile_responsive: row.mobile_responsive ?? true,
      is_active: row.is_active ?? true,
    };
    return composeEmailFromLayout({
      layout,
      bodyHtml: SAMPLE_BODY,
      signatureHtml: SAMPLE_SIG,
      footerHtml: SAMPLE_FOOT,
      disclaimerHtml: SAMPLE_DISC,
    });
  }, [row]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            {row.id ? "Edit" : "New"} Email Base Layout
            {row.is_base_layout && <Badge variant="secondary" className="ml-2">System base</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4 max-h-[72vh] overflow-y-auto pr-1">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Code</Label><Input value={row.code ?? ""} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="BASE_EMAIL_CUSTOM" /></div>
              <div><Label>Name</Label><Input value={row.name ?? ""} onChange={(e) => set("name", e.target.value)} /></div>
            </div>
            <div><Label>Description</Label><Input value={row.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>

            <div className="grid grid-cols-3 gap-2">
              <div><Label>Max width (px)</Label><Input type="number" value={row.email_max_width ?? 640} onChange={(e) => set("email_max_width", Number(e.target.value))} /></div>
              <div><Label>Background</Label><Input value={row.email_background_hex ?? ""} onChange={(e) => set("email_background_hex", e.target.value)} placeholder="#f4f4f4" /></div>
              <div><Label>Font family</Label><Input value={row.email_font_family ?? ""} onChange={(e) => set("email_font_family", e.target.value)} /></div>
            </div>

            <div>
              <Label>Header HTML <span className="text-[11px] text-muted-foreground">Tokens: {"{{org.name}}, {{asset.PRIMARY_LOGO}}"}</span></Label>
              <Textarea rows={4} value={row.header_html ?? ""} onChange={(e) => set("header_html", e.target.value)} />
            </div>

            <div>
              <Label>Body placeholder <span className="text-[11px] text-muted-foreground">Must contain {"{{BODY}}"}</span></Label>
              <Textarea rows={3} value={row.body_placeholder_html ?? ""} onChange={(e) => set("body_placeholder_html", e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div><Label>Signature slot</Label><Input value={row.signature_slot ?? ""} onChange={(e) => set("signature_slot", e.target.value)} placeholder="{{SIGNATURE_BLOCK}}" /></div>
              <div><Label>Footer slot</Label><Input value={row.footer_slot ?? ""} onChange={(e) => set("footer_slot", e.target.value)} placeholder="{{FOOTER_BLOCK}}" /></div>
              <div><Label>Disclaimer slot</Label><Input value={row.disclaimer_slot ?? ""} onChange={(e) => set("disclaimer_slot", e.target.value)} placeholder="{{DISCLAIMER_BLOCK}}" /></div>
            </div>

            <div>
              <Label>Footer HTML <span className="text-[11px] text-muted-foreground">Reference {"{{FOOTER_BLOCK}}"} and {"{{DISCLAIMER_BLOCK}}"}</span></Label>
              <Textarea rows={4} value={row.footer_html ?? ""} onChange={(e) => set("footer_html", e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Button style JSON</Label>
                <Textarea rows={4} className="font-mono text-xs" value={buttonStyle} onChange={(e) => set("email_button_style_json" as any, e.target.value)} />
              </div>
              <div>
                <Label>Divider style JSON</Label>
                <Textarea rows={4} className="font-mono text-xs" value={dividerStyle} onChange={(e) => set("email_divider_style_json" as any, e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between rounded-md border p-2">
                <Label>Mobile responsive</Label>
                <Switch checked={row.mobile_responsive ?? true} onCheckedChange={(v) => set("mobile_responsive", v)} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-2">
                <Label>Active</Label>
                <Switch checked={row.is_active ?? true} onCheckedChange={(v) => set("is_active", v)} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Tabs value={device} onValueChange={(v) => setDevice(v as any)}>
              <TabsList>
                <TabsTrigger value="desktop"><Monitor className="h-3.5 w-3.5 mr-1" /> Desktop</TabsTrigger>
                <TabsTrigger value="mobile"><Smartphone className="h-3.5 w-3.5 mr-1" /> Mobile</TabsTrigger>
              </TabsList>
              <TabsContent value="desktop" className="mt-2">
                <iframe title="preview-desktop" className="w-full h-[640px] rounded-md border bg-white" srcDoc={previewHtml} />
              </TabsContent>
              <TabsContent value="mobile" className="mt-2 flex justify-center">
                <iframe title="preview-mobile" style={{ width: 375 }} className="h-[640px] rounded-md border bg-white" srcDoc={previewHtml} />
              </TabsContent>
            </Tabs>
            <p className="text-[11px] text-muted-foreground">Sample signature / footer / disclaimer shown are placeholders — real content is injected at send time by the branding resolver.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save layout</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
