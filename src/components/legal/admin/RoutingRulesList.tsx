import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLegalTeams, useLegalReferenceValues } from "@/hooks/legal/useLegalTeams";
import { useLgSources, useLgSourceAllowance } from "@/hooks/legal/useLgCaseSourceConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Trash2, ArrowRight, Layers, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;
const COUNTRY = "SKN";
const NONE = "__none__";

type RuleType = "STAGE" | "CASE_TYPE" | "SOURCE";

type UnifiedRule = {
  id: string;
  type: RuleType;
  table: "lg_routing_stage_override" | "lg_routing_case_type" | "lg_routing_source_map";
  stage_code?: string | null;
  case_type_code?: string | null;
  source_code?: string | null;
  workbasket_code: string | null;
  team_code: string | null;
  priority_code?: string | null;
  assignment_strategy?: string | null;
  auto_assign?: boolean;
  is_active: boolean;
};

const TYPE_STYLES: Record<RuleType, { label: string; color: string }> = {
  STAGE: { label: "Stage", color: "bg-blue-50 text-blue-700 border-blue-200" },
  CASE_TYPE: { label: "Case Type", color: "bg-purple-50 text-purple-700 border-purple-200" },
  SOURCE: { label: "Source", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};



const toDb = (v: string | undefined | null) => (!v || v === NONE ? null : v);
const fromDb = (v: string | null | undefined) => v ?? NONE;

export default function RoutingRulesList() {
  const qc = useQueryClient();
  const { data: teams = [] } = useLegalTeams();
  const { data: workbaskets = [] } = useLegalReferenceValues("LG_WORKBASKET");
  const { data: strategies = [] } = useLegalReferenceValues("LG_ASSIGNMENT_STRATEGY");
  const { data: stages = [] } = useLegalReferenceValues("LG_CASE_STAGE");
  const { data: caseTypes = [] } = useLegalReferenceValues("LG_CASE_TYPE");
  const { data: priorities = [] } = useLegalReferenceValues("LG_PRIORITY");
  const activeTeams = (teams as any[]).filter((t) => t.is_active);
  const { data: allSources = [] } = useLgSources(COUNTRY);

  const stageRowsQ = useQuery({
    queryKey: ["lg_routing_stage_override", COUNTRY],
    queryFn: async () => (await sb.from("lg_routing_stage_override").select("*").eq("country_code", COUNTRY)).data ?? [],
  });
  const typeRowsQ = useQuery({
    queryKey: ["lg_routing_case_type", COUNTRY],
    queryFn: async () => (await sb.from("lg_routing_case_type").select("*").eq("country_code", COUNTRY)).data ?? [],
  });
  const sourceRowsQ = useQuery({
    queryKey: ["lg_routing_source_map", COUNTRY],
    queryFn: async () => (await sb.from("lg_routing_source_map").select("*").eq("country_code", COUNTRY)).data ?? [],
  });
  const allowedCtQ = useQuery({
    queryKey: ["lg_case_source_case_type_all", COUNTRY],
    queryFn: async () =>
      (await sb.from("lg_case_source_case_type").select("source_code,case_type_code,is_active").eq("country_code", COUNTRY)).data ?? [],
  });
  const allowedStQ = useQuery({
    queryKey: ["lg_case_source_stage_all", COUNTRY],
    queryFn: async () =>
      (await sb
        .from("lg_case_source_stage")
        .select("source_code,stage_code,allowed_as_initial_stage,allowed_as_transition_stage,is_active")
        .eq("country_code", COUNTRY)).data ?? [],
  });

  const rules: UnifiedRule[] = useMemo(() => {
    const out: UnifiedRule[] = [];
    for (const r of stageRowsQ.data ?? []) out.push({ id: r.id, type: "STAGE", table: "lg_routing_stage_override", ...r });
    for (const r of typeRowsQ.data ?? []) out.push({ id: r.id, type: "CASE_TYPE", table: "lg_routing_case_type", ...r });
    for (const r of sourceRowsQ.data ?? []) out.push({ id: r.id, type: "SOURCE", table: "lg_routing_source_map", ...r });
    return out;
  }, [stageRowsQ.data, typeRowsQ.data, sourceRowsQ.data]);

  type Severity = "error" | "warn" | "info";
  type Issue = { level: Severity; message: string; fix?: string };
  type Validation = { ok: boolean; level: "ok" | Severity; issues: Issue[] };

  const validate = useMemo(() => {
    const sources = ((allSources as any[]) ?? []);
    const srcByCode = new Map(sources.map((s) => [s.source_code, s]));
    const cts = ((allowedCtQ.data ?? []) as any[]).filter((x) => x.is_active);
    const sts = ((allowedStQ.data ?? []) as any[]).filter(
      (x) => x.is_active && (x.allowed_as_initial_stage || x.allowed_as_transition_stage),
    );
    const ctBySrc = (src: string) => cts.filter((x) => x.source_code === src).map((x) => x.case_type_code);
    const stBySrc = (src: string) => sts.filter((x) => x.source_code === src).map((x) => x.stage_code);
    const ctAny = (ct: string) => cts.some((x) => x.case_type_code === ct);
    const stAny = (st: string) => sts.some((x) => x.stage_code === st);
    const knownStage = (st: string) => (stages as any[]).some((s) => s.value_code === st);
    const knownCt = (ct: string) => (caseTypes as any[]).some((c) => c.value_code === ct);

    const worst = (a: "ok" | Severity, b: Severity): "ok" | Severity => {
      const rank = { ok: 0, info: 1, warn: 2, error: 3 } as const;
      return rank[b] > rank[a as keyof typeof rank] ? b : a;
    };

    return (r: UnifiedRule): Validation => {
      const issues: Issue[] = [];
      let level: "ok" | Severity = "ok";
      const push = (lvl: Severity, message: string, fix?: string) => {
        issues.push({ level: lvl, message, fix });
        level = worst(level, lvl);
      };

      // Destination checks (ERROR)
      if (!r.workbasket_code) {
        push("error", "Rule has no destination workbasket.", "Pick a workbasket below.");
      }

      // SOURCE rules: validate against the matching source's enforcement flags
      if (r.type === "SOURCE" && r.source_code) {
        const src = srcByCode.get(r.source_code);
        if (!src) {
          push("warn", `Source "${r.source_code}" is not configured.`, "Add it on the Sources tab or remove this rule.");
        } else if (!src.is_active) {
          push("warn", `Source "${src.source_name}" is inactive.`);
        }
        if (r.case_type_code && src) {
          const allowed = ctBySrc(r.source_code);
          const inAllowed = allowed.includes(r.case_type_code);
          const enforce = src.enforce_case_type_restrictions !== false;
          if (!inAllowed) {
            if (enforce) {
              push(
                "error",
                `Case type "${r.case_type_code}" is not allowed for ${src.source_name}.`,
                "Add it to the source's allowed case types, or change this rule.",
              );
            } else {
              push(
                "warn",
                `Case type "${r.case_type_code}" is not in ${src.source_name}'s allowed list (enforcement disabled).`,
                src.allow_historical_exceptions
                  ? "Permitted as a historical exception."
                  : "Consider adding it to the source's allowed list.",
              );
            }
          }
        }
      }

      // STAGE rules: stage must be enabled for at least one source (or known stage)
      if (r.type === "STAGE" && r.stage_code) {
        if (!knownStage(r.stage_code)) {
          push("warn", `Stage "${r.stage_code}" is not in the Legal stage list.`);
        } else if (!stAny(r.stage_code)) {
          push("info", `Stage "${r.stage_code}" is not yet enabled for any source.`, "Enable it on at least one source.");
        }
      }
      if ((r.type === "STAGE" || r.type === "CASE_TYPE") && r.case_type_code) {
        if (!knownCt(r.case_type_code)) {
          push("warn", `Case type "${r.case_type_code}" is not in the Legal case type list.`);
        } else if (!ctAny(r.case_type_code)) {
          push("info", `Case type "${r.case_type_code}" is not enabled for any source.`);
        }
      }

      return { ok: issues.length === 0, level, issues };
    };
  }, [allowedCtQ.data, allowedStQ.data, allSources, stages, caseTypes]);

  const wbLabel = (c?: string | null) => (c ? (workbaskets as any[]).find((w) => w.value_code === c)?.value_label ?? c : "—");
  const teamLabel = (c?: string | null) => (c ? activeTeams.find((t: any) => t.team_code === c)?.team_name ?? c : "Default team");
  const refLabel = (list: any[], c?: string | null) => (c ? list.find((x) => x.value_code === c)?.value_label ?? c : c ?? "");

  const ruleName = (r: UnifiedRule) => {
    const parts: string[] = [];
    if (r.stage_code) parts.push(refLabel(stages as any[], r.stage_code));
    if (r.case_type_code) parts.push(refLabel(caseTypes as any[], r.case_type_code));
    if (r.source_code) parts.push(r.source_code.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (s) => s.toUpperCase()));
    return parts.join(" • ") || "Untitled rule";
  };

  const criteria = (r: UnifiedRule) => {
    const out: { k: string; v: string }[] = [];
    if (r.stage_code) out.push({ k: "Stage", v: r.stage_code });
    if (r.case_type_code) out.push({ k: "Case Type", v: r.case_type_code });
    if (r.source_code) out.push({ k: "Source", v: r.source_code });
    return out;
  };

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | RuleType>("ALL");
  const [activeOnly, setActiveOnly] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<"ALL" | "error" | "warn" | "info" | "issues">("ALL");

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rules.filter((r) => {
      if (typeFilter !== "ALL" && r.type !== typeFilter) return false;
      if (activeOnly && !r.is_active) return false;
      const v = validate(r);
      if (severityFilter === "issues" && v.ok) return false;
      if (severityFilter === "error" && v.level !== "error") return false;
      if (severityFilter === "warn" && v.level !== "warn") return false;
      if (severityFilter === "info" && v.level !== "info") return false;
      if (!s) return true;
      const hay = [r.stage_code, r.case_type_code, r.source_code, r.workbasket_code, r.team_code, ruleName(r)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [rules, search, typeFilter, activeOnly, severityFilter, validate]);

  const counts = useMemo(() => {
    let error = 0, warn = 0, info = 0;
    for (const r of rules) {
      const v = validate(r);
      if (v.level === "error") error++;
      else if (v.level === "warn") warn++;
      else if (v.level === "info") info++;
    }
    return { error, warn, info, ok: rules.length - error - warn - info };
  }, [rules, validate]);

  async function patch(r: UnifiedRule, fields: Partial<UnifiedRule>) {
    const { error } = await sb.from(r.table).update(fields).eq("id", r.id);
    if (error) return toast.error("Save failed", { description: error.message });
    qc.invalidateQueries({ queryKey: [r.table, COUNTRY] });
  }
  async function removeRule(r: UnifiedRule) {
    const { error } = await sb.from(r.table).delete().eq("id", r.id);
    if (error) return toast.error("Delete failed", { description: error.message });
    toast.success("Rule deleted");
    qc.invalidateQueries({ queryKey: [r.table, COUNTRY] });
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" /> Routing Rules
          </CardTitle>
          <CardDescription>
            Add, edit and toggle the rules that decide where a case goes. Advanced settings are hidden — expand a rule to see them.
          </CardDescription>
        </div>
        <AddRuleDialog
          stages={stages as any[]}
          caseTypes={caseTypes as any[]}
          workbaskets={workbaskets as any[]}
          teams={activeTeams}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ["lg_routing_stage_override", COUNTRY] });
            qc.invalidateQueries({ queryKey: ["lg_routing_case_type", COUNTRY] });
            qc.invalidateQueries({ queryKey: ["lg_routing_source_map", COUNTRY] });
          }}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by stage, case type, source, workbasket…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <div className="flex gap-1">
            {(["ALL", "STAGE", "CASE_TYPE", "SOURCE"] as const).map((t) => (
              <Button
                key={t}
                variant={typeFilter === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(t)}
              >
                {t === "ALL" ? "All" : TYPE_STYLES[t].label}
              </Button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={activeOnly} onCheckedChange={setActiveOnly} />
            <span className="text-muted-foreground">Active only</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground text-xs">Severity:</span>
            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as any)}>
              <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="issues">All issues</SelectItem>
                <SelectItem value="error">Errors ({counts.error})</SelectItem>
                <SelectItem value="warn">Warnings ({counts.warn})</SelectItem>
                <SelectItem value="info">Info ({counts.info})</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Configuration health:</span>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1" /> {counts.ok} OK
          </Badge>
          <Badge variant="outline" className={counts.error ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-muted text-muted-foreground"}>
            {counts.error} Error{counts.error === 1 ? "" : "s"}
          </Badge>
          <Badge variant="outline" className={counts.warn ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-muted text-muted-foreground"}>
            {counts.warn} Warning{counts.warn === 1 ? "" : "s"}
          </Badge>
          <Badge variant="outline" className={counts.info ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-muted text-muted-foreground"}>
            {counts.info} Info
          </Badge>
          <span className="ml-auto text-muted-foreground">
            Errors block routing • Warnings need review • Info is advisory
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            No rules match. Try a different filter or add a new rule.
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {filtered.map((r) => {
              const v = validate(r);
              const sevBadge =
                v.level === "error"
                  ? { cls: "bg-destructive/10 text-destructive border-destructive/30", label: "Error" }
                  : v.level === "warn"
                  ? { cls: "bg-amber-50 text-amber-800 border-amber-200", label: "Warning" }
                  : v.level === "info"
                  ? { cls: "bg-blue-50 text-blue-700 border-blue-200", label: "Info" }
                  : null;
              const src = r.source_code ? (allSources as any[]).find((s) => s.source_code === r.source_code) : null;
              return (
              <AccordionItem
                key={`${r.type}-${r.id}`}
                value={`${r.type}-${r.id}`}
                className={`rounded-md border bg-card data-[state=open]:shadow-sm ${
                  v.level === "error" ? "border-destructive/40" : v.level === "warn" ? "border-amber-300" : v.level === "info" ? "border-blue-200" : ""
                }`}
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex flex-1 flex-wrap items-center gap-3 text-left">
                    <Badge variant="outline" className={`text-[10px] font-medium ${TYPE_STYLES[r.type].color}`}>
                      {TYPE_STYLES[r.type].label}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{ruleName(r)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                        {criteria(r).map((c) => (
                          <span key={c.k}>
                            <span className="text-muted-foreground/70">{c.k}:</span>{" "}
                            <span className="font-mono">{c.v}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Routes to</span>
                      <Badge variant="secondary" className="font-mono">{r.workbasket_code ?? "—"}</Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span>{teamLabel(r.team_code)}</span>
                    </div>
                    {sevBadge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${sevBadge.cls}`}
                        title={v.issues.map((i) => i.message).join(" • ")}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {sevBadge.label}
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        r.is_active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                  {src && (
                    <div className="mt-2 mb-3 rounded-md border bg-muted/30 px-3 py-2 text-xs flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span><span className="text-muted-foreground">Source type:</span> <b>{src.source_type ?? "OPERATIONAL"}</b></span>
                      <span>
                        <span className="text-muted-foreground">Enforcement:</span>{" "}
                        <Badge variant="outline" className="text-[10px]">case type {src.enforce_case_type_restrictions === false ? "off" : "on"}</Badge>{" "}
                        <Badge variant="outline" className="text-[10px]">stage {src.enforce_stage_restrictions === false ? "off" : "on"}</Badge>
                        {src.allow_historical_exceptions && <Badge variant="outline" className="text-[10px] ml-1 bg-blue-50 text-blue-700 border-blue-200">historical exceptions</Badge>}
                      </span>
                    </div>
                  )}
                  {!v.ok && (
                    <div
                      className={`mt-2 mb-3 rounded-md border px-3 py-2 text-xs ${
                        v.level === "error"
                          ? "border-destructive/40 bg-destructive/5 text-destructive"
                          : v.level === "warn"
                          ? "border-amber-200 bg-amber-50 text-amber-900"
                          : "border-blue-200 bg-blue-50 text-blue-900"
                      }`}
                    >
                      <div className="font-semibold flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {v.level === "error" ? "Routing error — fix before this rule can be used"
                          : v.level === "warn" ? "Routing warning — review configuration"
                          : "Routing info"}
                      </div>
                      <ul className="space-y-1.5">
                        {v.issues.map((i, idx) => (
                          <li key={idx}>
                            <div>• {i.message}</div>
                            {i.fix && <div className="pl-3 text-[11px] opacity-80">↳ {i.fix}</div>}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-1.5 text-[11px] opacity-80">
                        Open the <b>Sources</b> tab to adjust allowed case types/stages or change this rule below.
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
                    <div>
                      <Label className="text-xs">Workbasket</Label>
                      <Select
                        value={fromDb(r.workbasket_code)}
                        onValueChange={(v) => patch(r, { workbasket_code: toDb(v) })}
                      >
                        <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>— None —</SelectItem>
                          {(workbaskets as any[]).map((w) => (
                            <SelectItem key={w.value_code} value={w.value_code}>{w.value_label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Team</Label>
                      <Select value={fromDb(r.team_code)} onValueChange={(v) => patch(r, { team_code: toDb(v) })}>
                        <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Default team" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Default team</SelectItem>
                          {activeTeams.map((t: any) => (
                            <SelectItem key={t.team_code} value={t.team_code}>{t.team_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(r.type === "STAGE" || r.type === "SOURCE") && (
                      <div>
                        <Label className="text-xs">Case Type (optional)</Label>
                        <Select
                          value={fromDb(r.case_type_code)}
                          onValueChange={(v) => patch(r, { case_type_code: toDb(v) })}
                        >
                          <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Any" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>Any</SelectItem>
                            {(caseTypes as any[]).map((c) => (
                              <SelectItem key={c.value_code} value={c.value_code}>{c.value_label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {r.type !== "STAGE" && (
                      <div>
                        <Label className="text-xs">Assignment Strategy</Label>
                        <Select
                          value={fromDb(r.assignment_strategy)}
                          onValueChange={(v) => patch(r, { assignment_strategy: toDb(v) })}
                        >
                          <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Use default" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>Use default</SelectItem>
                            {(strategies as any[]).map((s) => (
                              <SelectItem key={s.value_code} value={s.value_code}>{s.value_label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {r.type !== "STAGE" && (
                      <div>
                        <Label className="text-xs">Priority</Label>
                        <Select
                          value={fromDb(r.priority_code)}
                          onValueChange={(v) => patch(r, { priority_code: toDb(v) })}
                        >
                          <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Default" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>Default</SelectItem>
                            {((priorities as any[]).length
                              ? (priorities as any[]).map((p) => p.value_code)
                              : ["LOW", "NORMAL", "HIGH", "URGENT"]
                            ).map((p: string) => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs">Country</Label>
                      <div className="h-8 mt-1 flex items-center">
                        <Badge variant="outline" className="font-mono">{COUNTRY}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <Switch checked={r.is_active} onCheckedChange={(v) => patch(r, { is_active: v })} />
                        <span>{r.is_active ? "Active" : "Inactive"}</span>
                      </label>
                      {r.type === "STAGE" && (
                        <label className="flex items-center gap-2 text-sm">
                          <Switch
                            checked={!!r.auto_assign}
                            onCheckedChange={(v) => patch(r, { auto_assign: v } as any)}
                          />
                          <span className="text-muted-foreground">Auto-assign on stage change</span>
                        </label>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeRule(r)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

function AddRuleDialog({
  stages,
  caseTypes,
  workbaskets,
  teams,
  onCreated,
}: {
  stages: any[];
  caseTypes: any[];
  workbaskets: any[];
  teams: any[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<RuleType>("STAGE");
  const [stage, setStage] = useState<string>(NONE);
  const [caseType, setCaseType] = useState<string>(NONE);
  const [source, setSource] = useState<string>(NONE);
  const [wb, setWb] = useState<string>(NONE);
  const [team, setTeam] = useState<string>(NONE);
  const [saving, setSaving] = useState(false);

  const { data: allSources = [] } = useLgSources(COUNTRY);
  const activeSources = (allSources as any[]).filter((s) => s.is_active);
  // Source filter applies to STAGE & SOURCE rule types (not CASE_TYPE which is global)
  const sourceForFilter = type === "CASE_TYPE" ? null : source;
  const { data: allowance } = useLgSourceAllowance(
    sourceForFilter && sourceForFilter !== NONE ? sourceForFilter : null,
    COUNTRY,
  );

  // Filter case types and stages based on source's allowed lists.
  const filteredCaseTypes = useMemo(() => {
    if (!allowance?.caseTypes?.length) return caseTypes;
    const allowed = new Set(allowance.caseTypes.map((c) => c.case_type_code));
    return caseTypes.filter((c) => allowed.has(c.value_code));
  }, [caseTypes, allowance]);

  const filteredStages = useMemo(() => {
    if (!allowance?.stages?.length) return stages;
    // For STAGE rules we treat any allowed (initial or transition) stage as valid for routing override.
    const allowed = new Set(allowance.stages.map((s) => s.stage_code));
    return stages.filter((s) => allowed.has(s.value_code));
  }, [stages, allowance]);

  // Auto-fill defaults from source allowance when source changes.
  useEffect(() => {
    if (!allowance?.source) return;
    if (wb === NONE && allowance.source.default_workbasket_code) setWb(allowance.source.default_workbasket_code);
    if (team === NONE && allowance.source.default_team_code) setTeam(allowance.source.default_team_code);
    if (type === "STAGE" && stage === NONE && allowance.source.default_stage_code) setStage(allowance.source.default_stage_code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowance?.source?.source_code]);

  // Clear case-type/stage if they're no longer allowed after source change.
  useEffect(() => {
    if (!allowance) return;
    if (caseType !== NONE && allowance.caseTypes.length && !allowance.caseTypes.some((c) => c.case_type_code === caseType)) {
      setCaseType(NONE);
    }
    if (stage !== NONE && allowance.stages.length && !allowance.stages.some((s) => s.stage_code === stage)) {
      setStage(NONE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowance?.source?.source_code]);

  function reset() {
    setType("STAGE"); setStage(NONE); setCaseType(NONE); setSource(NONE); setWb(NONE); setTeam(NONE);
  }

  async function create() {
    if (wb === NONE) return toast.error("Pick a workbasket");
    setSaving(true);
    try {
      let table = "lg_routing_stage_override";
      let row: any = { country_code: COUNTRY, workbasket_code: wb, team_code: toDb(team), is_active: true };
      if (type === "STAGE") {
        if (stage === NONE) return toast.error("Pick a stage");
        table = "lg_routing_stage_override";
        row = { ...row, stage_code: stage, case_type_code: toDb(caseType) };
      } else if (type === "CASE_TYPE") {
        if (caseType === NONE) return toast.error("Pick a case type");
        table = "lg_routing_case_type";
        row = { ...row, case_type_code: caseType };
      } else {
        if (source === NONE) return toast.error("Pick a source");
        table = "lg_routing_source_map";
        row = { ...row, source_code: source, case_type_code: toDb(caseType) };
      }
      const { error } = await sb.from(table).insert(row);
      if (error) return toast.error("Failed to add rule", { description: error.message });
      toast.success("Rule added");
      onCreated();
      reset();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const showSourcePicker = type === "STAGE" || type === "SOURCE";
  const sourceRequired = type === "SOURCE";
  const filterHint =
    allowance?.source && (allowance.caseTypes.length || allowance.stages.length)
      ? `Showing ${allowance.caseTypes.length} allowed case type(s) and ${allowance.stages.length} allowed stage(s) for ${allowance.source.source_name}.`
      : null;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Rule</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Routing Rule</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Rule Type</Label>
            <div className="flex gap-1 mt-1">
              {(["STAGE", "CASE_TYPE", "SOURCE"] as const).map((t) => (
                <Button key={t} variant={type === t ? "default" : "outline"} size="sm" onClick={() => setType(t)}>
                  {TYPE_STYLES[t].label}
                </Button>
              ))}
            </div>
          </div>
          {showSourcePicker && (
            <div>
              <Label className="text-xs">
                Source {sourceRequired ? "" : "(optional — filters lists below)"}
              </Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="h-9 mt-1"><SelectValue placeholder={sourceRequired ? "Select…" : "Any source"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{sourceRequired ? "—" : "Any source"}</SelectItem>
                  {activeSources.map((s: any) => (
                    <SelectItem key={s.source_code} value={s.source_code}>
                      {s.source_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeSources.length === 0 && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  No sources configured. Add them on the Sources tab first.
                </p>
              )}
            </div>
          )}
          {filterHint && (
            <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-2.5 py-2 text-[11px] text-muted-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{filterHint}</span>
            </div>
          )}
          {type === "STAGE" && (
            <div>
              <Label className="text-xs">Stage</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {filteredStages.map((s) => <SelectItem key={s.value_code} value={s.value_code}>{s.value_label}</SelectItem>)}
                </SelectContent>
              </Select>
              {source !== NONE && filteredStages.length === 0 && (
                <p className="text-[11px] text-destructive mt-1">
                  No stages allowed for this source. Configure them on the Sources tab.
                </p>
              )}
            </div>
          )}
          <div>
            <Label className="text-xs">{type === "CASE_TYPE" ? "Case Type" : "Case Type (optional)"}</Label>
            <Select value={caseType} onValueChange={setCaseType}>
              <SelectTrigger className="h-9 mt-1"><SelectValue placeholder={type === "CASE_TYPE" ? "Select…" : "Any"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{type === "CASE_TYPE" ? "—" : "Any"}</SelectItem>
                {filteredCaseTypes.map((c) => <SelectItem key={c.value_code} value={c.value_code}>{c.value_label}</SelectItem>)}
              </SelectContent>
            </Select>
            {source !== NONE && filteredCaseTypes.length === 0 && type !== "CASE_TYPE" && (
              <p className="text-[11px] text-destructive mt-1">
                No case types allowed for this source. Configure them on the Sources tab.
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs">Workbasket</Label>
            <Select value={wb} onValueChange={setWb}>
              <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {workbaskets.map((w) => <SelectItem key={w.value_code} value={w.value_code}>{w.value_label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Team (optional)</Label>
            <Select value={team} onValueChange={setTeam}>
              <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Default team" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Default team</SelectItem>
                {teams.map((t: any) => <SelectItem key={t.team_code} value={t.team_code}>{t.team_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={create} disabled={saving}>{saving ? "Adding…" : "Add Rule"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
