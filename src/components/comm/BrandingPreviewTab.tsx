/**
 * Organization Profile → Branding Preview
 * Renders effective organization-level branding using the currently-selected
 * defaults (letterhead, signature, disclaimer, print footer). Uses the same
 * resolvers the runtime uses — no hardcoded asset paths — so what you see
 * here is what will render at document/email generation time.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LetterheadPreview } from "@/components/comm/LetterheadPreview";
import { FileText, Mail, Printer, Loader2, AlertCircle } from "lucide-react";

const sb = supabase as any;

interface Props {
  letterheadId?: string | null;
  signatureId?: string | null;
  disclaimerId?: string | null;
  footerId?: string | null;
  orgName?: string;
}

function useAssetById(table: string, id?: string | null) {
  return useQuery({
    queryKey: [table, "brand-preview", id ?? "none"],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await sb.from(table).select("*").eq("id", id).maybeSingle();
      return data;
    },
  });
}

function useDisclaimerBody(disclaimerId?: string | null) {
  return useQuery({
    queryKey: ["comm_disclaimer", "resolved-body", disclaimerId ?? "none"],
    enabled: !!disclaimerId,
    queryFn: async () => {
      const { data: disc } = await sb
        .from("comm_disclaimer")
        .select("id,name,body,text_block_id")
        .eq("id", disclaimerId).maybeSingle();
      if (!disc) return null;
      // Prefer linked text block — single source of truth
      if (disc.text_block_id) {
        const { data: tb } = await sb
          .from("core_text_block")
          .select("content_html, content_text, body_html, body_text, name")
          .eq("id", disc.text_block_id).maybeSingle();
        return {
          name: disc.name,
          html: tb?.content_html || tb?.body_html || null,
          text: tb?.content_text || tb?.body_text || disc.body,
          sourced: "text_block" as const,
        };
      }
      return { name: disc.name, html: null, text: disc.body, sourced: "inline" as const };
    },
  });
}

export function BrandingPreviewTab({ letterheadId, signatureId, disclaimerId, footerId, orgName }: Props) {
  const lh = useAssetById("comm_letterhead", letterheadId);
  const sig = useAssetById("comm_email_signature", signatureId);
  const ft = useAssetById("comm_print_footer", footerId);
  const disc = useDisclaimerBody(disclaimerId);

  const design = useMemo(() => {
    const d = lh.data?.design_config ?? {};
    return {
      page_size: d.page_size ?? "A4",
      orientation: d.orientation ?? "portrait",
      margins: d.margins,
      header_asset_code: d.header_asset_code,
      footer_asset_code: d.footer_asset_code,
      logo_asset_code: d.logo_asset_code,
      seal_asset_code: d.seal_asset_code,
      watermark_asset_code: d.watermark_asset_code,
      signature_code: sig.data?.code ?? undefined,
    };
  }, [lh.data, sig.data]);

  const anyMissing = !letterheadId && !signatureId && !footerId && !disclaimerId;

  if (anyMissing) {
    return (
      <div className="flex items-start gap-3 p-6 border rounded bg-muted/30">
        <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div className="text-sm text-muted-foreground">
          Pick at least one default (letterhead, signature, footer or disclaimer) on the <strong>Comm Defaults</strong> tab
          to see the branded output preview.
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="document" className="space-y-3">
      <TabsList>
        <TabsTrigger value="document"><FileText className="h-4 w-4 mr-1" /> Document</TabsTrigger>
        <TabsTrigger value="email"><Mail className="h-4 w-4 mr-1" /> Email</TabsTrigger>
        <TabsTrigger value="footer"><Printer className="h-4 w-4 mr-1" /> Print Footer</TabsTrigger>
      </TabsList>

      {/* ---------------- DOCUMENT ---------------- */}
      <TabsContent value="document">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Document / Letter preview</span>
              {lh.data && <Badge variant="secondary" className="text-[10px]">{lh.data.code ?? lh.data.name}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lh.isLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : !lh.data ? (
              <EmptySlot label="No default letterhead selected" />
            ) : (
              <div className="space-y-3">
                <MetaRow asset={lh.data} moduleField="module_code" />
                <LetterheadPreview
                  design={design}
                  bodyHtml={sampleLetterBody({
                    orgName,
                    disclaimerHtml: disc.data?.html || (disc.data?.text ? `<p>${escapeHtml(disc.data.text)}</p>` : ""),
                  })}
                />
                <p className="text-[11px] text-muted-foreground text-center">
                  Uses the same resolver runtime documents use — assets, signature and footer paths come from central masters.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ---------------- EMAIL ---------------- */}
      <TabsContent value="email">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Email preview</span>
              {sig.data && <Badge variant="secondary" className="text-[10px]">{sig.data.code ?? sig.data.name}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sig.data && <MetaRow asset={sig.data} moduleField="scope_code" moduleLabel="Scope" />}
            <div className="border rounded bg-white text-black p-6 max-w-2xl mx-auto space-y-3 text-sm" style={{ fontFamily: "Segoe UI, Helvetica, Arial, sans-serif" }}>
              <div className="text-xs text-muted-foreground border-b pb-1">
                <strong>From:</strong> no-reply@{(orgName ?? "organization").toLowerCase().replace(/\s+/g, "")}.gov &nbsp;·&nbsp;
                <strong>Subject:</strong> Communication from {orgName ?? "the organization"}
              </div>
              <p>Dear Recipient,</p>
              <p>
                This is a sample email body used to demonstrate how the selected default signature and disclaimer
                will render in outbound organization communications. The real content is populated by the template
                at send time.
              </p>
              <p>Best regards,</p>
              {sig.data ? (
                <div className="border-t pt-2" dangerouslySetInnerHTML={{
                  __html: sig.data.html_signature
                    || `<pre style="font-family:inherit;margin:0">${escapeHtml(sig.data.plain_text_signature ?? sig.data.name ?? "")}</pre>`,
                }} />
              ) : (
                <EmptySlot label="No default email signature selected" small />
              )}
              {disc.data && (
                <div className="mt-4 pt-2 border-t text-[10px] text-muted-foreground italic">
                  {disc.data.html ? <div dangerouslySetInnerHTML={{ __html: disc.data.html }} /> : disc.data.text}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ---------------- PRINT FOOTER ---------------- */}
      <TabsContent value="footer">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Print footer preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!ft.data ? (
              <EmptySlot label="No default print footer selected" />
            ) : (
              <>
                <MetaRow asset={ft.data} />
                <div className="border rounded bg-white text-black mx-auto" style={{ maxWidth: 620 }}>
                  <div className="p-6 text-sm text-muted-foreground text-center italic">— Document body area —</div>
                  <div className="border-t p-3 text-xs" dangerouslySetInnerHTML={{
                    __html: ft.data.footer_html || `<div style="text-align:center">${escapeHtml(ft.data.page_footer ?? ft.data.name ?? "")}</div>`,
                  }} />
                  {ft.data.watermark_url && (
                    <div className="p-2 text-[10px] text-center text-muted-foreground">
                      Watermark configured · <code>{ft.data.watermark_url.slice(0, 60)}</code>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function MetaRow({ asset, moduleField = "module_code", moduleLabel = "Module" }: { asset: any; moduleField?: string; moduleLabel?: string }) {
  return (
    <div className="flex flex-wrap gap-2 text-[11px]">
      {asset.code && <Badge variant="outline" className="font-mono">{asset.code}</Badge>}
      {asset[moduleField] && <Badge variant="secondary">{moduleLabel}: {asset[moduleField]}</Badge>}
      {asset.category && <Badge variant="outline">{asset.category}</Badge>}
      <Badge variant={asset.is_active === false ? "outline" : "default"}>
        {asset.is_active === false ? "Inactive" : "Active"}
      </Badge>
    </div>
  );
}

function EmptySlot({ label, small = false }: { label: string; small?: boolean }) {
  return (
    <div className={`text-center text-muted-foreground border border-dashed rounded ${small ? "p-3 text-xs" : "p-8 text-sm"}`}>
      {label}
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function sampleLetterBody({ orgName, disclaimerHtml }: { orgName?: string; disclaimerHtml?: string }) {
  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  return `
    <p style="margin:0 0 6px 0;text-align:right;font-size:10pt">${today}</p>
    <p style="margin:0 0 4px 0">To: <strong>[Recipient Name]</strong><br/>[Address Line 1]<br/>[City, Country]</p>
    <p style="margin:8px 0 4px 0">Reference: <strong>DOC-${new Date().getFullYear()}-000123</strong></p>
    <p style="margin:8px 0 4px 0"><strong>Subject: Official communication from ${orgName ?? "the Organization"}</strong></p>
    <p style="margin:8px 0">Dear Sir / Madam,</p>
    <p style="margin:0 0 8px 0">
      This is a preview of how documents generated with the currently selected organization defaults will look.
      The header, logo, seal, watermark and footer are rendered from the effective letterhead master; the closing
      signature block is rendered from the effective email signature master.
    </p>
    <p style="margin:0 0 8px 0">Yours faithfully,</p>
    ${disclaimerHtml ? `<div style="margin-top:16px;padding-top:6px;border-top:1px solid #ccc;font-size:8pt;color:#555;font-style:italic">${disclaimerHtml}</div>` : ""}
  `;
}

export default BrandingPreviewTab;
