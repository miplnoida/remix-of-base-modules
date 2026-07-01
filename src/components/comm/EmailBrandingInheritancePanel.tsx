import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Info } from "lucide-react";
import {
  resolveEmailBranding,
  loadBrandingContent,
  composeEmailFromLayout,
  htmlToPlainText,
  type EmailBrandingSource,
} from "@/lib/enterprise/resolvers/emailBrandingResolver";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const SOURCE_STYLES: Record<EmailBrandingSource, string> = {
  TEMPLATE_OVERRIDE: "bg-amber-100 text-amber-900 border-amber-300",
  BUSINESS_EVENT:    "bg-purple-100 text-purple-900 border-purple-300",
  WORKFLOW_STAGE:    "bg-purple-100 text-purple-900 border-purple-300",
  WORKFLOW:          "bg-purple-100 text-purple-900 border-purple-300",
  DEPARTMENT:        "bg-blue-100 text-blue-900 border-blue-300",
  MODULE:            "bg-indigo-100 text-indigo-900 border-indigo-300",
  ORGANIZATION:      "bg-slate-100 text-slate-800 border-slate-300",
  GLOBAL:            "bg-slate-100 text-slate-800 border-slate-300",
  MISSING:           "bg-red-100 text-red-900 border-red-300",
};

function SourceBadge({ source }: { source: EmailBrandingSource }) {
  return (
    <Badge variant="outline" className={`text-[10px] ${SOURCE_STYLES[source] ?? ""}`}>
      {source.replace("_", " ").toLowerCase()}
    </Badge>
  );
}

interface Props {
  moduleCode?: string | null;
  departmentCode?: string | null;
  templateId?: string | null;
  bodyHtml?: string;
}

export function EmailBrandingInheritancePanel({
  moduleCode, departmentCode, templateId, bodyHtml,
}: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["email_branding", moduleCode, departmentCode, templateId],
    queryFn: async () => {
      const branding = await resolveEmailBranding({ moduleCode, departmentCode, templateId });
      const content = await loadBrandingContent(branding);
      return { branding, content };
    },
    staleTime: 30_000,
  });

  if (isLoading || !data) {
    return (
      <Card><CardContent className="flex justify-center p-6"><Loader2 className="animate-spin h-4 w-4" /></CardContent></Card>
    );
  }

  const { branding, content } = data;

  const composed = composeEmailFromLayout({
    layout: branding.layout.value,
    bodyHtml: bodyHtml || "<p><em>(Enter body content to preview)</em></p>",
    signatureHtml: content.signatureHtml,
    footerHtml: content.footerHtml,
    disclaimerHtml: content.disclaimerHtml,
  });

  const rows: Array<[string, string | null | undefined, EmailBrandingSource]> = [
    ["Base layout", branding.layout.value?.name ?? branding.layout.value?.code ?? "— not set —", branding.layout.source],
    ["Signature",   branding.signatureId.value ?? "— none —",   branding.signatureId.source],
    ["Footer",      branding.footerId.value ?? "— none —",      branding.footerId.source],
    ["Disclaimer",  branding.disclaimerId.value ?? "— none —",  branding.disclaimerId.source],
    ["Sender name", branding.senderName.value ?? "— none —",    branding.senderName.source],
    ["Reply-to",    branding.replyTo.value ?? "— none —",       branding.replyTo.source],
    ["Language",    branding.language.value ?? "en",            branding.language.source],
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          Effective Email Branding
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Composed at render time. Each field's badge shows which layer supplied the value.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded border divide-y">
          {rows.map(([label, value, src]) => (
            <div key={label} className="flex items-center justify-between px-3 py-1.5 text-xs">
              <span className="text-muted-foreground w-28">{label}</span>
              <span className="flex-1 truncate font-mono">{value}</span>
              <SourceBadge source={src} />
            </div>
          ))}
        </div>

        <Tabs defaultValue="desktop">
          <TabsList className="h-8">
            <TabsTrigger value="desktop" className="text-xs h-6">Desktop</TabsTrigger>
            <TabsTrigger value="mobile" className="text-xs h-6">Mobile</TabsTrigger>
            <TabsTrigger value="text" className="text-xs h-6">Plain text</TabsTrigger>
          </TabsList>
          <TabsContent value="desktop" className="mt-2">
            <iframe title="branded-desktop" className="w-full h-[360px] rounded-md border bg-white" srcDoc={composed} />
          </TabsContent>
          <TabsContent value="mobile" className="mt-2 flex justify-center">
            <iframe title="branded-mobile" style={{ width: 360 }} className="h-[360px] rounded-md border bg-white" srcDoc={composed} />
          </TabsContent>
          <TabsContent value="text" className="mt-2">
            <pre className="w-full h-[360px] overflow-auto rounded-md border bg-muted p-3 text-xs whitespace-pre-wrap">{htmlToPlainText(composed)}</pre>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
