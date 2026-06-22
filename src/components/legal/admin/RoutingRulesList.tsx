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

  const validate = useMemo(() => {
    const cts = ((allowedCtQ.data ?? []) as any[]).filter((x) => x.is_active);
    const sts = ((allowedStQ.data ?? []) as any[]).filter(
      (x) => x.is_active && (x.allowed_as_initial_stage || x.allowed_as_transition_stage),
    );
    const ctBySrc = (src: string) => cts.filter((x) => x.source_code === src).map((x) => x.case_type_code);
    const stBySrc = (src: string) => sts.filter((x) => x.source_code === src).map((x) => x.stage_code);
    const ctAny = (ct: string) => cts.some((x) => x.case_type_code === ct);
    const stAny = (st: string) => sts.some((x) => x.stage_code === st);

    return (r: UnifiedRule): { ok: boolean; level: "ok" | "warn" | "error"; messages: string[] } => {
      const msgs: string[] = [];
      let level: "ok" | "warn" | "error" = "ok";
      if (r.type === "SOURCE" && r.source_code) {
        const allowedCts = ctBySrc(r.source_code);
        if (allowedCts.length === 0) {
          msgs.push("Source has no allowed case types configured");
          level = "warn";
        }
        if (r.case_type_code && !allowedCts.includes(r.case_type_code)) {
          msgs.push(`Case type "${r.case_type_code}" is not allowed for source "${r.source_code}"`);
          level = "error";
        }
      }
      if (r.type === "STAGE" && r.stage_code && !stAny(r.stage_code)) {
        msgs.push(`Stage "${r.stage_code}" is not enabled for any source`);
        level = level === "error" ? "error" : "warn";
      }
      if (r.type === "STAGE" && r.case_type_code && !ctAny(r.case_type_code)) {
        msgs.push(`Case type "${r.case_type_code}" is not enabled for any source`);
        level = level === "error" ? "error" : "warn";
      }
      if (r.type === "CASE_TYPE" && r.case_type_code && !ctAny(r.case_type_code)) {
        msgs.push(`Case type "${r.case_type_code}" is not enabled for any source`);
        level = level === "error" ? "error" : "warn";
      }
      return { ok: msgs.length === 0, level, messages: msgs };
    };
  }, [allowedCtQ.data, allowedStQ.data]);

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
  const [invalidOnly, setInvalidOnly] = useState(false);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rules.filter((r) => {
      if (typeFilter !== "ALL" && r.type !== typeFilter) return false;
      if (activeOnly && !r.is_active) return false;
      if (invalidOnly && validate(r).ok) return false;
      if (!s) return true;
      const hay = [r.stage_code, r.case_type_code, r.source_code, r.workbasket_code, r.team_code, ruleName(r)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [rules, search, typeFilter, activeOnly, invalidOnly, validate]);

  const invalidCount = useMemo(() => rules.filter((r) => !validate(r).ok).length, [rules, validate]);

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
            <Switch checked={invalidOnly} onCheckedChange={setInvalidOnly} />
            <span className="text-muted-foreground">Issues only</span>
          </label>
        </div>

        {invalidCount > 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              <span className="font-semibold">{invalidCount}</span> rule{invalidCount === 1 ? "" : "s"} reference a case
              type or stage that isn't allowed by the matching Source configuration. Expand a flagged rule to see details
              and fix it.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>All routing rules use case types and stages permitted by their Source configuration.</span>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            No rules match. Try a different filter or add a new rule.
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {filtered.map((r) => {
              const v = validate(r);
              return (
              <AccordionItem
                key={`${r.type}-${r.id}`}
                value={`${r.type}-${r.id}`}
                className={`rounded-md border bg-card data-[state=open]:shadow-sm ${
                  v.level === "error" ? "border-destructive/40" : v.level === "warn" ? "border-amber-300" : ""
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
                    {!v.ok && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                          v.level === "error"
                            ? "bg-destructive/10 text-destructive border-destructive/30"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                        title={v.messages.join(" • ")}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {v.level === "error" ? "Invalid" : "Check"}
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
                  {!v.ok && (
                    <div
                      className={`mt-2 mb-3 rounded-md border px-3 py-2 text-xs ${
                        v.level === "error"
                          ? "border-destructive/40 bg-destructive/5 text-destructive"
                          : "border-amber-200 bg-amber-50 text-amber-900"
                      }`}
                    >
                      <div className="font-semibold flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {v.level === "error" ? "Rule conflicts with Source configuration" : "Rule may not be reachable"}
                      </div>
                      <ul className="list-disc pl-5 space-y-0.5">
                        {v.messages.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                      <div className="mt-1.5 text-[11px] opacity-80">
                        Update the Source's allowed case types/stages on the <b>Sources</b> tab, or change this rule below.
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
            ))}
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
