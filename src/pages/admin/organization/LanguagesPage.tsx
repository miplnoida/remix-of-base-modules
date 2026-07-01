/**
 * Communication Library → Languages / Cultures
 * Read-only registry of languages/cultures actually in use across the
 * platform (surveyed from comm_disclaimer.language, core_template_channel_variant,
 * core_template_localization). A dedicated language-master table does not yet
 * exist; when it lands this page will switch to CRUD.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Languages, Info, Loader2, Star } from "lucide-react";

const sb = supabase as any;

/**
 * Curated ISO 639-1 base list plus SKN-relevant variants. When an
 * org-level language-master table lands, replace this with a live query.
 */
const CURATED = [
  { code: "en",   name: "English",           default: true,  fallback: null },
  { code: "en-US",name: "English (US)",      default: false, fallback: "en" },
  { code: "en-GB",name: "English (UK)",      default: false, fallback: "en" },
  { code: "es",   name: "Spanish",           default: false, fallback: "en" },
  { code: "fr",   name: "French",            default: false, fallback: "en" },
  { code: "pt",   name: "Portuguese",        default: false, fallback: "en" },
];

export default function LanguagesPage() {
  const { data: usage, isLoading } = useQuery({
    queryKey: ["language_usage"],
    queryFn: async () => {
      const [{ data: d1 = [] }, { data: d2 = [] }] = await Promise.all([
        sb.from("comm_disclaimer").select("language").not("language", "is", null),
        sb.from("core_template_localization").select("language_code").not("language_code", "is", null),
      ]);
      const counts = new Map<string, number>();
      const bump = (v: string | null | undefined) => { if (!v) return; counts.set(v, (counts.get(v) ?? 0) + 1); };
      (d1 as any[]).forEach((r) => bump(r.language));
      (d2 as any[]).forEach((r) => bump(r.language_code));
      return counts;
    },
  });

  const rows = CURATED.map((c) => ({ ...c, usage: usage?.get(c.code) ?? 0 }));
  const extras = usage
    ? Array.from(usage.entries())
        .filter(([code]) => !CURATED.some((c) => c.code === code))
        .map(([code, n]) => ({ code, name: code, default: false, fallback: null as string | null, usage: n }))
    : [];
  const all = [...rows, ...extras];

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-start gap-3">
        <Languages className="h-6 w-6 text-primary mt-1" />
        <div>
          <h1 className="text-2xl font-bold">Languages &amp; Cultures</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Languages currently supported for templates, notifications and disclaimers. The organization default
            is used when a specific locale has no localized variant.
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Read-only registry</AlertTitle>
        <AlertDescription>
          Language rows below are surveyed from actual usage in <code>comm_disclaimer</code> and{" "}
          <code>core_template_localization</code>. A dedicated <code>core_language</code> master table with per-org
          enable / disable flags will replace this view — CRUD lands with that migration.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Default</TableHead><TableHead>Fallback</TableHead><TableHead>Usage</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {all.map((r) => (
                  <TableRow key={r.code}>
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.default && <Star className="h-3.5 w-3.5 fill-primary text-primary" />}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.fallback ?? "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{r.usage} row{r.usage === 1 ? "" : "s"}</Badge></TableCell>
                    <TableCell><Badge>Available</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
