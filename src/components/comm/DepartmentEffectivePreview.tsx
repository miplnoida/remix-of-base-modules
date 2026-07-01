/**
 * Department Effective Preview
 *
 * Runtime preview of the resolved communication/branding output for a
 * single department. Uses the central `resolveDepartmentEffective` plus
 * `coreTemplateResolverService.resolveRenderContext` — no hardcoded data.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ExternalLink, AlertTriangle, CheckCircle2, Info, Smartphone, Monitor, FileText, RefreshCw } from "lucide-react";
import {
  resolveDepartmentEffective,
  resolveTemplateForDepartment,
  type DepartmentEffectiveResult,
  type ResolutionTraceEntry,
} from "@/lib/comm/departmentEffectiveResolver";
import { supabase } from "@/integrations/supabase/client";
import { coreTemplateResolverService } from "@/services/coreTemplateResolverService";

const sb = supabase as any;

interface Props {
  departmentCode: string;
  departmentName?: string;
}

export function DepartmentEffectivePreview({ departmentCode, departmentName }: Props) {
  const { data, isLoading, refetch, isFetching } = useQuery<DepartmentEffectiveResult>({
    queryKey: ["dept-effective-preview", departmentCode],
    queryFn: () => resolveDepartmentEffective(departmentCode),
    enabled: !!departmentCode,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Resolving effective configuration…
      </div>
    );
  }

  const { context, trace, warnings } = data;
  const errorCount = warnings.filter(w => w.severity === "error").length;
  const warnCount = warnings.filter(w => w.severity === "warning").length;

  return (
    <div className="space-y-3">
      {/* Header actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs text-muted-foreground mr-auto">
          Effective preview for <span className="font-medium text-foreground">{data.departmentName}</span>
          {data.organizationName && <> · {data.organizationName}</>}
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
          Re-resolve
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link to={`/admin/organization/configuration-center?scope=DEPARTMENT&department=${departmentCode}`}>
            <ExternalLink className="h-3 w-3 mr-1" /> Configuration Center
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link to="/admin/organization/organization-profile">
            <ExternalLink className="h-3 w-3 mr-1" /> Organization Defaults
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link to="/admin/organization/enterprise-health">
            <ExternalLink className="h-3 w-3 mr-1" /> Validation Report
          </Link>
        </Button>
      </div>

      {(errorCount > 0 || warnCount > 0) && (
        <Alert variant={errorCount > 0 ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {errorCount > 0 && `${errorCount} error${errorCount === 1 ? "" : "s"}`}
            {errorCount > 0 && warnCount > 0 && " · "}
            {warnCount > 0 && `${warnCount} warning${warnCount === 1 ? "" : "s"}`}
          </AlertTitle>
          <AlertDescription className="text-xs">
            Some resolved values are missing or inactive. See the Health tab for details.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="letter">Letter / PDF</TabsTrigger>
          <TabsTrigger value="notification">Notifications</TabsTrigger>
          <TabsTrigger value="template">Template Resolution</TabsTrigger>
          <TabsTrigger value="trace">Trace</TabsTrigger>
          <TabsTrigger value="health">Health {warnings.length > 0 && <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">{warnings.length}</Badge>}</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="mt-3">
          <BrandingPanel result={data} />
        </TabsContent>
        <TabsContent value="email" className="mt-3">
          <EmailPanel result={data} />
        </TabsContent>
        <TabsContent value="letter" className="mt-3">
          <LetterPanel result={data} />
        </TabsContent>
        <TabsContent value="notification" className="mt-3">
          <NotificationPanel result={data} />
        </TabsContent>
        <TabsContent value="template" className="mt-3">
          <TemplateResolutionPanel departmentCode={departmentCode} defaultLanguage={context.organization.language || "en"} />
        </TabsContent>
        <TabsContent value="trace" className="mt-3">
          <TracePanel trace={trace} />
        </TabsContent>
        <TabsContent value="health" className="mt-3">
          <HealthPanel warnings={warnings} trace={trace} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------- Branding ----------------

function sourceBadge(source: string) {
  const map: Record<string, { label: string; variant: any }> = {
    department_override: { label: "Department override", variant: "default" },
    organization_default: { label: "Organization default", variant: "secondary" },
    module_default: { label: "Module default", variant: "secondary" },
    workflow_default: { label: "Workflow default", variant: "secondary" },
    event_default: { label: "Event default", variant: "secondary" },
    template_override: { label: "Template override", variant: "default" },
    none: { label: "Unresolved", variant: "destructive" },
  };
  const cfg = map[source] || map.none;
  return <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>;
}

function BrandingPanel({ result }: { result: DepartmentEffectiveResult }) {
  const { context, trace } = result;
  const rows: Array<{ label: string; value: React.ReactNode; traceKey: string }> = [
    { label: "Logo", traceKey: "asset.logo", value: context.organization.primaryLogoUrl ? <img src={context.organization.primaryLogoUrl} alt="logo" className="h-10" /> : <em>—</em> },
    { label: "Seal", traceKey: "asset.seal", value: context.organization.sealUrl ? <img src={context.organization.sealUrl} alt="seal" className="h-10" /> : <em>—</em> },
    { label: "Letterhead", traceKey: "letterhead", value: <span>{trace.find(t => t.key === "letterhead")?.effectiveName || "—"}</span> },
    { label: "Email Signature", traceKey: "email_signature", value: <div className="text-xs whitespace-pre-line line-clamp-3">{context.email.signatureText || (context.email.signatureHtml ? "(HTML)" : "—")}</div> },
    { label: "Disclaimer", traceKey: "disclaimer", value: <div className="text-xs line-clamp-3">{context.disclaimer.name || context.disclaimer.standard || "—"}</div> },
    { label: "Print Footer", traceKey: "print_footer", value: <div className="text-xs line-clamp-2">{context.print.footer || context.print.pageFooter || "—"}</div> },
    { label: "Watermark", traceKey: "asset.watermark", value: context.print.watermark ? <img src={context.print.watermark} alt="wm" className="h-10 opacity-50" /> : <em>—</em> },
    { label: "Default Language", traceKey: "language", value: <span>{context.organization.language || "—"}</span> },
  ];
  return (
    <Card><CardContent className="p-4">
      <div className="grid md:grid-cols-2 gap-3">
        {rows.map(r => {
          const t = trace.find(tr => tr.key === r.traceKey);
          return (
            <div key={r.label} className="border rounded p-3 space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{r.label}</Label>
                <div className="flex items-center gap-1">
                  {t && sourceBadge(t.source)}
                  {t?.overrideExists && <Badge variant="outline" className="text-[10px]">Override</Badge>}
                  {t && !t.active && t.effectiveId && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                </div>
              </div>
              <div>{r.value}</div>
            </div>
          );
        })}
      </div>
    </CardContent></Card>
  );
}

// ---------------- Email ----------------

function EmailPanel({ result }: { result: DepartmentEffectiveResult }) {
  const [mode, setMode] = useState<"desktop" | "mobile" | "plain">("desktop");
  const { context } = result;
  const subject = `[${context.organization.shortName || context.organization.name || "Org"}] Sample notification from ${context.department.name}`;
  const body = `Dear Sir/Madam,

This is a sample email rendered with the effective configuration of the ${context.department.name}.

If you have any questions please contact ${context.location.email || "us"}.

Kind regards`;

  const emailHtml = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#111;">
      ${context.organization.primaryLogoUrl ? `<div style="padding:12px 16px;border-bottom:1px solid #eee;"><img src="${context.organization.primaryLogoUrl}" style="height:38px"/></div>` : ""}
      <div style="padding:16px;">
        <div style="font-weight:600;margin-bottom:8px">${subject}</div>
        <div style="white-space:pre-line">${body}</div>
        <div style="margin-top:16px;color:#333;">${context.email.signatureHtml || context.email.signatureText.replace(/\n/g, "<br/>") || ""}</div>
      </div>
      ${context.print.footer ? `<div style="padding:12px 16px;border-top:1px solid #eee;font-size:12px;color:#555;">${context.print.footer}</div>` : ""}
      ${context.disclaimer.standard ? `<div style="padding:8px 16px;font-size:11px;color:#888;font-style:italic;">${context.disclaimer.standard}</div>` : ""}
    </div>`;

  const plain = `Subject: ${subject}\n\n${body}\n\n${context.email.signatureText}\n\n${context.disclaimer.standard}`;

  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Button size="sm" variant={mode === "desktop" ? "default" : "outline"} onClick={() => setMode("desktop")}><Monitor className="h-3 w-3 mr-1" />Desktop</Button>
        <Button size="sm" variant={mode === "mobile" ? "default" : "outline"} onClick={() => setMode("mobile")}><Smartphone className="h-3 w-3 mr-1" />Mobile</Button>
        <Button size="sm" variant={mode === "plain" ? "default" : "outline"} onClick={() => setMode("plain")}><FileText className="h-3 w-3 mr-1" />Plain text</Button>
        <span className="text-xs text-muted-foreground ml-auto">From: {context.email.senderEmail || context.location.email || "(unset)"}</span>
      </div>
      {mode === "plain" ? (
        <pre className="text-xs bg-muted p-3 rounded whitespace-pre-wrap">{plain}</pre>
      ) : (
        <div className={`mx-auto border rounded bg-white overflow-hidden ${mode === "mobile" ? "max-w-[380px]" : "max-w-[720px]"}`}>
          <div dangerouslySetInnerHTML={{ __html: emailHtml }} />
        </div>
      )}
    </CardContent></Card>
  );
}

// ---------------- Letter / PDF ----------------

function LetterPanel({ result }: { result: DepartmentEffectiveResult }) {
  const { context } = result;
  return (
    <Card><CardContent className="p-4">
      <div className="mx-auto max-w-[820px] bg-white border shadow-sm relative" style={{ aspectRatio: "1 / 1.414" }}>
        {context.print.watermark && (
          <img src={context.print.watermark} alt="watermark" className="absolute inset-0 m-auto opacity-10 max-h-[60%] pointer-events-none" />
        )}
        <div className="p-8 h-full flex flex-col text-xs text-black">
          <div className="flex items-start justify-between border-b pb-3">
            {context.organization.primaryLogoUrl && <img src={context.organization.primaryLogoUrl} alt="logo" className="h-14" />}
            <div className="text-right leading-tight">
              <div className="font-bold text-sm">{context.organization.name}</div>
              <div>{context.department.name}</div>
              <div className="whitespace-pre-line">{context.location.addressBlock}</div>
              {context.location.phone && <div>Tel: {context.location.phone}</div>}
              {context.location.email && <div>{context.location.email}</div>}
            </div>
          </div>
          {context.letterhead.header && (
            <div className="pt-3" dangerouslySetInnerHTML={{ __html: context.letterhead.header }} />
          )}
          <div className="pt-4 space-y-2">
            <div>Ref: SAMPLE/{new Date().getFullYear()}/0001</div>
            <div>Date: {new Date().toLocaleDateString()}</div>
            <div className="pt-2">To,<br/>The Recipient<br/>Sample Address</div>
            <div className="pt-2 font-semibold">Subject: Sample official letter</div>
            <div className="pt-2">Dear Sir/Madam,</div>
            <div>This is a sample letter rendered using the effective letterhead, branding and configuration of the {context.department.name}. All content is resolved at render time — nothing is copied into templates.</div>
            <div className="pt-4">Yours faithfully,</div>
            <div className="pt-2" dangerouslySetInnerHTML={{ __html: context.email.signatureHtml || (context.email.signatureText || "").replace(/\n/g, "<br/>") }} />
          </div>
          <div className="mt-auto pt-3 border-t text-[10px] text-muted-foreground">
            {context.letterhead.footer && <div dangerouslySetInnerHTML={{ __html: context.letterhead.footer }} />}
            {context.print.footer && <div dangerouslySetInnerHTML={{ __html: context.print.footer }} />}
            {context.disclaimer.standard && <div className="italic mt-1">{context.disclaimer.standard}</div>}
          </div>
        </div>
      </div>
    </CardContent></Card>
  );
}

// ---------------- Notifications ----------------

function NotificationPanel({ result }: { result: DepartmentEffectiveResult }) {
  const { context } = result;
  const smsBody = `${context.organization.shortName || context.organization.name}: Your request with ${context.department.name} has been received. Ref SAMPLE-0001. Reply STOP to opt out.`;
  return (
    <div className="grid md:grid-cols-3 gap-3">
      <Card><CardContent className="p-4 space-y-2">
        <Label className="text-xs">SMS</Label>
        <div className="border rounded p-3 bg-muted/30 text-xs">{smsBody}</div>
        <div className="text-[10px] text-muted-foreground">{smsBody.length} chars · Language {context.organization.language || "en"}</div>
      </CardContent></Card>
      <Card><CardContent className="p-4 space-y-2">
        <Label className="text-xs">WhatsApp</Label>
        <div className="border rounded p-3 bg-[#dcf8c6] text-xs">
          <div className="font-semibold text-[11px] mb-1">{context.organization.name}</div>
          {smsBody}
        </div>
      </CardContent></Card>
      <Card><CardContent className="p-4 space-y-2">
        <Label className="text-xs">In-app</Label>
        <div className="border rounded p-3 bg-background text-xs flex gap-2">
          {context.organization.primaryLogoUrl && <img src={context.organization.primaryLogoUrl} className="h-8 w-8 rounded" alt="" />}
          <div>
            <div className="font-medium">Update from {context.department.name}</div>
            <div className="text-muted-foreground">Your request SAMPLE-0001 has been received.</div>
          </div>
        </div>
      </CardContent></Card>
    </div>
  );
}

// ---------------- Template Resolution ----------------

function TemplateResolutionPanel({ departmentCode, defaultLanguage }: { departmentCode: string; defaultLanguage: string }) {
  const [templateCode, setTemplateCode] = useState("");
  const [channel, setChannel] = useState("EMAIL");
  const [language, setLanguage] = useState(defaultLanguage || "en");
  const [module, setModule] = useState("");
  const [event, setEvent] = useState("");
  const [stage, setStage] = useState("");

  const { data: templates = [] } = useQuery({
    queryKey: ["core-templates-list"],
    queryFn: async () => {
      const { data } = await sb.from("core_template").select("code, name, module_code, template_type").eq("is_active", true).order("code").limit(500);
      return data || [];
    },
  });

  const { data: ctx, isFetching } = useQuery({
    queryKey: ["template-resolve", templateCode, channel, language, departmentCode, module, event, stage],
    queryFn: () => resolveTemplateForDepartment({
      templateCode,
      departmentCode,
      language,
      channel,
      moduleCode: module || undefined,
      businessEvent: event || undefined,
      workflowStage: stage || undefined,
    }),
    enabled: !!templateCode,
  });

  const composed = useMemo(() => ctx ? coreTemplateResolverService.composeFinalHtml(ctx) : "", [ctx]);

  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="grid md:grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Template</Label>
          <select className="w-full border rounded h-9 px-2 bg-background text-xs" value={templateCode} onChange={e => setTemplateCode(e.target.value)}>
            <option value="">— Select —</option>
            {templates.map((t: any) => <option key={t.code} value={t.code}>{t.code} · {t.name}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Channel</Label>
          <select className="w-full border rounded h-9 px-2 bg-background text-xs" value={channel} onChange={e => setChannel(e.target.value)}>
            {["EMAIL","PRINT_LETTER","PDF","SMS","WHATSAPP","PORTAL_MSG"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Language</Label>
          <Input value={language} onChange={e => setLanguage(e.target.value)} className="h-9 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Module code (optional)</Label>
          <Input value={module} onChange={e => setModule(e.target.value)} className="h-9 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Business event (optional)</Label>
          <Input value={event} onChange={e => setEvent(e.target.value)} className="h-9 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Workflow stage (optional)</Label>
          <Input value={stage} onChange={e => setStage(e.target.value)} className="h-9 text-xs" />
        </div>
      </div>

      {!templateCode ? (
        <div className="text-xs text-muted-foreground">Choose a template to see the resolved letterhead, layout, signature, footer and disclaimer.</div>
      ) : isFetching ? (
        <div className="text-xs text-muted-foreground flex items-center"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Resolving…</div>
      ) : !ctx ? (
        <div className="text-xs text-destructive">Template not found for country / language.</div>
      ) : (
        <div className="space-y-3">
          <div className="grid md:grid-cols-2 gap-2 text-xs">
            <ResolveRow label="Template" value={`${ctx.template.code} · ${ctx.template.name}`} />
            <ResolveRow label="Active version" value={(() => { const v: any = ctx.version; return v?.version_label || (v?.version_number != null ? `v${v.version_number}` : "—"); })()} />
            <ResolveRow label="Base layout" value={ctx.layout?.name || "— (unstyled fallback)"} />
            <ResolveRow label="Letterhead" value={ctx.letterhead ? `${ctx.letterhead.name} (${ctx.letterhead.source})` : "— none"} />
            <ResolveRow label="Signature" value={ctx.signature.resolved ? ctx.signature.source : "— unresolved"} />
            <ResolveRow label="Footer" value={ctx.footer ? `${ctx.footer.name} (${ctx.footer.source})` : "— none"} />
            <ResolveRow label="Disclaimer" value={ctx.disclaimer ? `${ctx.disclaimer.name} (${ctx.disclaimer.source})` : "— none"} />
          </div>
          {ctx.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Missing items</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 text-xs">{ctx.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </AlertDescription>
            </Alert>
          )}
          {composed && (
            <div className="border rounded bg-white p-3 max-h-[300px] overflow-auto text-xs">
              <div dangerouslySetInnerHTML={{ __html: composed }} />
            </div>
          )}
        </div>
      )}
    </CardContent></Card>
  );
}

function ResolveRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 border rounded px-2 py-1">
      <span className="text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}

// ---------------- Trace ----------------

function TracePanel({ trace }: { trace: ResolutionTraceEntry[] }) {
  return (
    <Card><CardContent className="p-4">
      <div className="space-y-2">
        {trace.map(t => (
          <div key={t.key} className="border rounded p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-medium">{t.label}</div>
              <div className="flex items-center gap-1">
                {sourceBadge(t.source)}
                {t.overrideExists && <Badge variant="outline" className="text-[10px]">Override</Badge>}
                {t.effectiveId && !t.active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Effective: <span className="text-foreground">{t.effectiveName || t.effectiveId || "(unresolved)"}</span>
            </div>
            <ol className="mt-1 text-[11px] text-muted-foreground list-decimal pl-4 space-y-0.5">
              {t.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>
        ))}
      </div>
    </CardContent></Card>
  );
}

// ---------------- Health ----------------

function HealthPanel({ warnings, trace }: { warnings: DepartmentEffectiveResult["warnings"]; trace: ResolutionTraceEntry[] }) {
  if (warnings.length === 0) {
    return (
      <Card><CardContent className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        All configuration items resolved successfully.
      </CardContent></Card>
    );
  }
  return (
    <Card><CardContent className="p-4 space-y-2">
      {warnings.map((w, i) => (
        <Alert key={i} variant={w.severity === "error" ? "destructive" : "default"}>
          {w.severity === "error" ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
          <AlertDescription className="text-xs">{w.message}</AlertDescription>
        </Alert>
      ))}
      <div className="text-[11px] text-muted-foreground pt-2">
        {trace.length} configuration slot(s) evaluated · {warnings.filter(w => w.severity === "error").length} error(s) · {warnings.filter(w => w.severity === "warning").length} warning(s)
      </div>
    </CardContent></Card>
  );
}

export default DepartmentEffectivePreview;
