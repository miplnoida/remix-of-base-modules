/**
 * Email Template Audit & Migration.
 *
 * Combines two enterprise checks in one screen:
 *   1. Coverage report — how many email templates exist per module vs. an
 *      expected minimum checklist (ORG/LEGAL/BN/COMP/EMP/MEM/PAY/REP).
 *   2. Migration tools — one-click helpers to:
 *        • strip inline signatures from a legacy body
 *        • re-map an orphan notification_template row to a core_template code
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Wand2, CheckCircle2, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { runTemplateValidation, type ValidationFinding } from "@/lib/enterprise/runtimeValidation";

const sb = supabase as any;

const EXPECTED_COVERAGE: Array<{ prefix: string; label: string; min: number }> = [
  { prefix: "ORG",   label: "Organization",       min: 2 },
  { prefix: "LEGAL", label: "Legal",              min: 6 },
  { prefix: "BN",    label: "Benefits",           min: 6 },
  { prefix: "COMP",  label: "Compliance",         min: 4 },
  { prefix: "EMP",   label: "Employer",           min: 3 },
  { prefix: "MEM",   label: "Member/Contributor", min: 3 },
  { prefix: "PAY",   label: "Payments",           min: 3 },
  { prefix: "REP",   label: "Reports",            min: 2 },
];

function useCoverage() {
  return useQuery({
    queryKey: ["email_coverage"],
    queryFn: async () => {
      const { data } = await sb
        .from("core_template")
        .select("code, template_type, is_active")
        .eq("template_type", "EMAIL")
        .eq("is_active", true)
        .limit(2000);
      const codes = (data ?? []) as Array<{ code: string }>;
      return EXPECTED_COVERAGE.map((g) => {
        const matches = codes.filter((c) => (c.code ?? "").toUpperCase().startsWith(g.prefix + "_") || (c.code ?? "").toUpperCase().startsWith(g.prefix + "-"));
        return { ...g, actual: matches.length, gap: Math.max(0, g.min - matches.length) };
      });
    },
    staleTime: 30_000,
  });
}

function useValidation() {
  return useQuery({
    queryKey: ["email_validation"],
    queryFn: () => runTemplateValidation(),
    staleTime: 15_000,
  });
}

export default function EmailAuditPage() {
  const cov = useCoverage();
  const val = useValidation();
  const [busyId, setBusyId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const rows = val.data ?? [];
    const by: Record<string, ValidationFinding[]> = {};
    for (const f of rows) (by[f.code] ??= []).push(f);
    return by;
  }, [val.data]);

  const legacyRows = groups.LEGACY_TEMPLATE_UNMAPPED ?? [];
  const inlineSig  = groups.INLINE_SIGNATURE_IN_BODY ?? [];
  const inlineFtr  = groups.INLINE_FOOTER_IN_BODY ?? [];
  const inlineShell = groups.INLINE_HTML_SHELL ?? [];
  const moduleGaps = groups.MISSING_LAYOUT_ASSIGNMENT_FOR_MODULE ?? [];

  async function stripInlineSignature(templateId: string) {
    setBusyId(templateId);
    try {
      const { data: v } = await sb.from("core_template_version")
        .select("id, body_html").eq("template_id", templateId).eq("is_active", true).limit(1);
      const row = v?.[0];
      if (!row) throw new Error("No active version");
      const cleaned = String(row.body_html ?? "")
        .replace(/(?:<p[^>]*>\s*)?(sincerely|regards|kind regards|yours faithfully|best regards)[\s\S]*?(?:<\/p>|$)/gi, "{{SIGNATURE_BLOCK}}");
      const { error } = await sb.from("core_template_version").update({ body_html: cleaned }).eq("id", row.id);
      if (error) throw error;
      toast.success("Inline signature replaced with {{SIGNATURE_BLOCK}}");
      val.refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to migrate");
    } finally {
      setBusyId(null);
    }
  }

  async function mapLegacy(rowId: string, code: string) {
    setBusyId(rowId);
    try {
      const { data: core } = await sb.from("core_template").select("id, code").ilike("code", code).limit(1);
      if (!core?.[0]) { toast.error(`No core_template with code ${code}`); return; }
      const { error } = await sb.from("notification_templates").update({ mapped_core_template_id: core[0].id }).eq("id", rowId);
      if (error) throw error;
      toast.success(`Mapped to core_template ${core[0].code}`);
      val.refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to map");
    } finally {
      setBusyId(null);
    }
  }

  const summary = [
    { code: "LEGACY_TEMPLATE_UNMAPPED", label: "Legacy unmapped",  count: legacyRows.length, tone: "warning" },
    { code: "INLINE_HTML_SHELL",        label: "Inline HTML shell", count: inlineShell.length, tone: "error" },
    { code: "INLINE_SIGNATURE_IN_BODY", label: "Inline signatures", count: inlineSig.length,  tone: "warning" },
    { code: "INLINE_FOOTER_IN_BODY",    label: "Inline footers",    count: inlineFtr.length,  tone: "warning" },
    { code: "MODULE_LAYOUT_GAPS",       label: "Modules w/o layout override", count: moduleGaps.length, tone: "info" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Email Template Audit</h2>
          <p className="text-xs text-muted-foreground">Coverage vs. checklist + one-click migrators for legacy content.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { cov.refetch(); val.refetch(); }}>
          <RefreshCw className="h-3.5 w-3.5 mr-2" /> Rescan
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {summary.map((s) => (
          <Card key={s.code}>
            <CardContent className="p-3">
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
              <div className={`text-2xl font-semibold ${s.count === 0 ? "text-emerald-700" : s.tone === "error" ? "text-red-700" : "text-amber-700"}`}>
                {val.isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : s.count}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Coverage by module</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table sticky>
            <TableHeader>
              <TableRow><TableHead>Module</TableHead><TableHead>Prefix</TableHead><TableHead>Expected min</TableHead><TableHead>Actual</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(cov.data ?? []).map((r) => (
                <TableRow key={r.prefix}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell className="font-mono text-xs">{r.prefix}_*</TableCell>
                  <TableCell>{r.min}</TableCell>
                  <TableCell>{r.actual}</TableCell>
                  <TableCell>
                    {r.gap === 0
                      ? <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" />Complete</Badge>
                      : <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200"><AlertCircle className="h-3 w-3 mr-1" />{r.gap} missing</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {inlineSig.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Templates with inline signatures</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table sticky>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead className="w-[160px]">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {inlineSig.map((f) => (
                  <TableRow key={f.templateId}>
                    <TableCell className="font-mono text-xs">{f.templateCode}</TableCell>
                    <TableCell>{f.templateName}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" disabled={busyId === f.templateId} onClick={() => stripInlineSignature(f.templateId)}>
                        {busyId === f.templateId ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />}
                        Replace with {"{{SIGNATURE_BLOCK}}"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {legacyRows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Legacy notification_templates not mapped to core_template</CardTitle>
            <p className="text-[11px] text-muted-foreground">These bypass enterprise inheritance until mapped. Enter a target core_template code and click Map.</p>
          </CardHeader>
          <CardContent className="p-0">
            <Table sticky>
              <TableHeader><TableRow><TableHead>Legacy code</TableHead><TableHead>Name</TableHead><TableHead className="w-[280px]">Map to core_template code</TableHead></TableRow></TableHeader>
              <TableBody>
                {legacyRows.map((f) => <LegacyMapRow key={f.templateId} f={f} busy={busyId === f.templateId} onMap={(code) => mapLegacy(f.templateId, code)} />)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LegacyMapRow({ f, busy, onMap }: { f: ValidationFinding; busy: boolean; onMap: (code: string) => void }) {
  const [code, setCode] = useState(f.templateCode ?? "");
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{f.templateCode}</TableCell>
      <TableCell>{f.templateName}</TableCell>
      <TableCell>
        <div className="flex gap-2">
          <input className="h-8 rounded border px-2 text-xs flex-1 font-mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="core_template code" />
          <Button size="sm" variant="outline" disabled={busy || !code} onClick={() => onMap(code)}>
            {busy ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : "Map"}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
