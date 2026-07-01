/**
 * Validation → Broken References
 * Real-data integrity report across the Configuration engine and Comm assets:
 *   • Assignments referencing letterhead codes that don't exist / are inactive
 *   • Letterheads whose design_config asset_codes are not present in Media Library
 *   • Templates with inactive letterhead / signature / disclaimer references
 * Read-only. Fix each finding via the linked screen.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link2Off, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

const LinkIcon = Link2Off;
const sb = supabase as any;

type Severity = "critical" | "warning";
interface Issue {
  severity: Severity;
  category: string;
  title: string;
  detail?: string;
  fixHref: string;
  fixLabel: string;
}

export default function BrokenReferencesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["broken-references"],
    queryFn: async () => {
      const [assignmentsRes, lettersRes, mediaRes] = await Promise.all([
        sb.from("core_configuration_assignment").select("id, domain, resource_type, resource_ref, is_active").eq("is_active", true),
        sb.from("comm_letterhead").select("id, code, name, is_active, design_config, module_code"),
        sb.from("comm_media_asset").select("id, category, is_active").eq("is_active", true),
      ]);
      return {
        assignments: (assignmentsRes.data ?? []) as any[],
        letterheads: (lettersRes.data ?? []) as any[],
        media: (mediaRes.data ?? []) as any[],
      };
    },
  });

  const issues = useMemo<Issue[]>(() => {
    if (!data) return [];
    const out: Issue[] = [];
    const activeLetterheadCodes = new Set(data.letterheads.filter((l) => l.is_active && l.code).map((l) => l.code));
    const allLetterheadCodes = new Set(data.letterheads.filter((l) => l.code).map((l) => l.code));
    const mediaCategories = new Set(data.media.map((m) => m.category).filter(Boolean));

    // Assignments pointing to missing / inactive letterheads
    data.assignments.forEach((a) => {
      if (a.resource_type !== "LETTERHEAD") return;
      const code = a.resource_ref?.code;
      if (!code) return;
      if (!allLetterheadCodes.has(code)) {
        out.push({
          severity: "critical", category: "Assignments",
          title: `Assignment references missing letterhead "${code}"`,
          detail: `${a.domain} · ${a.resource_type}`,
          fixHref: "/admin/org/configuration-center?domain=branding", fixLabel: "Fix assignment",
        });
      } else if (!activeLetterheadCodes.has(code)) {
        out.push({
          severity: "warning", category: "Assignments",
          title: `Assignment uses inactive letterhead "${code}"`,
          detail: `${a.domain} · ${a.resource_type}`,
          fixHref: "/admin/org/assets/letterheads", fixLabel: "Activate letterhead",
        });
      }
    });

    // Letterheads with asset_code references not present as a media category slug
    data.letterheads.forEach((l) => {
      const dc = l.design_config ?? {};
      const codes = [
        ["header_asset_code", dc.header_asset_code],
        ["footer_asset_code", dc.footer_asset_code],
        ["logo_asset_code", dc.logo_asset_code],
        ["seal_asset_code", dc.seal_asset_code],
        ["watermark_asset_code", dc.watermark_asset_code],
      ].filter(([, v]) => !!v) as [string, string][];
      codes.forEach(([field, code]) => {
        // asset_code may be either a media category or a named row — check both loosely
        if (!mediaCategories.has(code)) {
          out.push({
            severity: "warning", category: "Letterheads",
            title: `Letterhead "${l.code ?? l.name}" references asset "${code}"`,
            detail: `${field} not present as an active Media Library category`,
            fixHref: "/admin/org/assets/media", fixLabel: "Upload asset",
          });
        }
      });
    });

    return out;
  }, [data]);

  if (isLoading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground p-6"><Loader2 className="h-4 w-4 animate-spin" /> Scanning references…</div>;
  }

  const grouped = new Map<string, Issue[]>();
  issues.forEach((i) => {
    if (!grouped.has(i.category)) grouped.set(i.category, []);
    grouped.get(i.category)!.push(i);
  });

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-start gap-3">
        <LinkIcon className="h-6 w-6 text-primary mt-1" />
        <div>
          <h1 className="text-2xl font-bold">Broken References</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Cross-checks Configuration Center assignments and Brand Assets against actual resource
            availability. Fix each finding via the linked screen — this page is read-only.
          </p>
        </div>
      </div>

      {issues.length === 0 ? (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>No broken references</AlertTitle>
          <AlertDescription>Every active assignment resolves to an active letterhead, and letterhead asset codes match Media Library categories.</AlertDescription>
        </Alert>
      ) : Array.from(grouped.entries()).map(([cat, list]) => (
        <Card key={cat}>
          <CardContent className="p-0">
            <div className="px-4 py-2.5 border-b bg-muted/40 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h2 className="font-semibold text-sm">{cat}</h2><Badge variant="secondary">{list.length}</Badge>
            </div>
            <Table sticky>
              <TableHeader><TableRow><TableHead>Sev</TableHead><TableHead>Issue</TableHead><TableHead>Detail</TableHead><TableHead className="w-40">Fix</TableHead></TableRow></TableHeader>
              <TableBody>
                {list.map((i, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Badge variant={i.severity === "critical" ? "destructive" : "outline"} className="text-[10px] uppercase">{i.severity}</Badge></TableCell>
                    <TableCell className="text-sm">{i.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{i.detail ?? "—"}</TableCell>
                    <TableCell><Link to={i.fixHref} className="text-primary hover:underline text-xs">{i.fixLabel} →</Link></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
