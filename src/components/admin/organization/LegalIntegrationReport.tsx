/**
 * Legal × Enterprise Context integration report.
 *
 * Embedded inside the Organization → Usage & Validation dashboard.
 * Lists every Legal surface (Documents / Notifications / DMS / AI / Workbench
 * / Templates) and indicates whether it currently uses
 * `resolveEnterpriseContext()`, still does direct table reads, or carries
 * hardcoded organization / department / module strings.
 *
 * Templates with unknown / deprecated tokens are detected at runtime by
 * scanning published Legal `core_template` versions against
 * `KNOWN_TOKEN_PREFIXES`.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, AlertTriangle, CheckCircle2, FileWarning, Info, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  LEGAL_AUDIT_ENTRIES,
  type LegalAuditArea,
  type LegalAuditEntry,
  type LegalAuditSeverity,
  isKnownToken,
} from "@/data/legal/legalIntegrationAudit";

const sb = supabase as any;

const AREAS: LegalAuditArea[] = ["Documents", "Notifications", "DMS", "AI", "Workbench", "Templates"];
const SEVERITIES: LegalAuditSeverity[] = ["error", "warning", "info"];

const SEV_META: Record<LegalAuditSeverity, { label: string; tone: string; Icon: typeof AlertCircle }> = {
  error:   { label: "Error",   tone: "text-destructive",     Icon: AlertCircle },
  warning: { label: "Warning", tone: "text-amber-600",       Icon: AlertTriangle },
  info:    { label: "Info",    tone: "text-muted-foreground", Icon: Info },
};

const STATUS_META: Record<LegalAuditEntry["status"], { label: string; tone: string }> = {
  INTEGRATED:       { label: "Integrated",        tone: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  DIRECT_READ:      { label: "Direct read",       tone: "bg-amber-100 text-amber-800 border-amber-300" },
  HARDCODED:        { label: "Hardcoded value",   tone: "bg-orange-100 text-orange-800 border-orange-300" },
  DEPRECATED_TOKEN: { label: "Deprecated token",  tone: "bg-rose-100 text-rose-800 border-rose-300" },
};

function useLegalTemplateTokens() {
  return useQuery({
    queryKey: ["legal-integration-report", "template-tokens"],
    queryFn: async () => {
      const { data: tpls } = await sb
        .from("core_template")
        .select("id, code, name, active_version_id")
        .eq("module_code", "LEGAL");
      const list = (tpls ?? []) as Array<{
        id: string; code: string; name: string; active_version_id: string | null;
      }>;
      if (list.length === 0) return [] as LegalAuditEntry[];

      const versionIds = list.map((t) => t.active_version_id).filter(Boolean) as string[];
      if (versionIds.length === 0) return [] as LegalAuditEntry[];

      const { data: vers } = await sb
        .from("core_template_version")
        .select("id, template_id, subject, body_html, body_text")
        .in("id", versionIds);
      const byTemplate = new Map<string, any>();
      for (const v of (vers ?? []) as any[]) byTemplate.set(v.template_id, v);

      const tokenRe = /\{\{\s*([\w.]+)\s*\}\}/g;
      const entries: LegalAuditEntry[] = [];
      for (const t of list) {
        const v = byTemplate.get(t.id);
        if (!v) continue;
        const html = `${v.subject ?? ""}\n${v.body_html ?? v.body_text ?? ""}`;
        const tokens = new Set<string>();
        let m: RegExpExecArray | null;
        while ((m = tokenRe.exec(html)) !== null) tokens.add(m[1]);
        const unknown = [...tokens].filter((tok) => !isKnownToken(tok));
        if (unknown.length === 0) continue;
        entries.push({
          id: `tmpl-unknown-${t.id}`,
          area: "Templates",
          severity: "warning",
          status: "DEPRECATED_TOKEN",
          title: `Template "${t.name || t.code}" uses unknown token(s)`,
          path: `core_template.code=${t.code}`,
          note: unknown.slice(0, 8).map((u) => `{{${u}}}`).join(", "),
        });
      }
      return entries;
    },
    staleTime: 60_000,
  });
}

export function LegalIntegrationReport() {
  const [areaFilter, setAreaFilter] = useState<"ALL" | LegalAuditArea>("ALL");
  const [sevFilter, setSevFilter] = useState<"ALL" | LegalAuditSeverity>("ALL");
  const [moduleFilter, setModuleFilter] = useState<"LEGAL">("LEGAL");

  const { data: tokenEntries = [], isLoading: tokensLoading } = useLegalTemplateTokens();

  const all = useMemo<LegalAuditEntry[]>(
    () => [...LEGAL_AUDIT_ENTRIES, ...tokenEntries],
    [tokenEntries],
  );

  const filtered = useMemo(
    () =>
      all.filter((e) => {
        if (moduleFilter !== "LEGAL") return false;
        if (areaFilter !== "ALL" && e.area !== areaFilter) return false;
        if (sevFilter !== "ALL" && e.severity !== sevFilter) return false;
        return true;
      }),
    [all, areaFilter, sevFilter, moduleFilter],
  );

  const stats = useMemo(() => {
    const integrated = all.filter((e) => e.status === "INTEGRATED").length;
    const remaining = all.filter((e) => e.status !== "INTEGRATED").length;
    return {
      total: all.length,
      integrated,
      remaining,
      directReads: all.filter((e) => e.status === "DIRECT_READ").length,
      hardcoded: all.filter((e) => e.status === "HARDCODED").length,
      deprecatedTokens: all.filter((e) => e.status === "DEPRECATED_TOKEN").length,
    };
  }, [all]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Legal × Enterprise Context Integration
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={moduleFilter} onValueChange={(v) => setModuleFilter(v as any)}>
              <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LEGAL">Module: Legal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={areaFilter} onValueChange={(v) => setAreaFilter(v as any)}>
              <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Area: All</SelectItem>
                {AREAS.map((a) => (
                  <SelectItem key={a} value={a}>Area: {a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sevFilter} onValueChange={(v) => setSevFilter(v as any)}>
              <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Severity: All</SelectItem>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>Severity: {SEV_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Snapshot of Legal surfaces against the Enterprise Context Resolver. Integrated items use{" "}
          <code>resolveEnterpriseContext()</code>; remaining items still read enterprise tables directly or
          ship hardcoded organisation / department / module strings.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <StatPill label="Total surfaces" value={stats.total} />
          <StatPill label="Integrated" value={stats.integrated} tone="text-emerald-700" />
          <StatPill label="Direct reads" value={stats.directReads} tone="text-amber-700" />
          <StatPill label="Hardcoded" value={stats.hardcoded} tone="text-orange-700" />
          <StatPill label="Deprecated tokens" value={stats.deprecatedTokens + (tokensLoading ? 0 : 0)} tone="text-rose-700" />
        </div>

        {filtered.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-md p-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            No entries match the current filters.
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((e) => {
              const sev = SEV_META[e.severity];
              const status = STATUS_META[e.status];
              return (
                <div key={e.id} className="flex items-start gap-3 rounded-md border p-2.5 text-sm">
                  <sev.Icon className={`h-4 w-4 mt-0.5 shrink-0 ${sev.tone}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{e.title}</span>
                      <Badge variant="outline" className={`text-[10px] ${status.tone}`}>{status.label}</Badge>
                      <Badge variant="outline" className="text-[10px]">{e.area}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{e.path}</div>
                    {e.note && (
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-start gap-1">
                        {e.status === "DEPRECATED_TOKEN" && <FileWarning className="h-3 w-3 mt-0.5 shrink-0" />}
                        <span>{e.note}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatPill({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="border rounded-md p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
