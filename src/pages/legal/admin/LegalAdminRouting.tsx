import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLegalTeams, useLegalReferenceValues } from "@/hooks/legal/useLegalTeams";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Save, Users, Info, CheckCircle2, AlertTriangle, Settings2 } from "lucide-react";
import RoutingPrecedenceCard from "@/components/legal/admin/RoutingPrecedenceCard";
import RoutingRulesList from "@/components/legal/admin/RoutingRulesList";
import RoutingSimulator from "@/components/legal/admin/RoutingSimulator";

const sb = supabase as any;
const COUNTRY = "SKN";

const CASE_TYPES_SEED = [
  "CONTRIBUTION_RECOVERY",
  "FAILURE_TO_REGISTER",
  "FAILURE_TO_REMIT",
  "PAYMENT_ARRANGEMENT_DEFAULT",
  "BENEFIT_APPEAL",
  "OVERPAYMENT_RECOVERY",
  "FRAUD_MISREPRESENTATION",
  "ESTATE_RECOVERY",
];

const STAGE_CODES = [
  "REFERRAL_RECEIVED",
  "LEGAL_REVIEW",
  "DEMAND_NOTICE",
  "SETTLEMENT_NEGOTIATION",
  "COURT_FILING",
  "HEARING",
  "JUDGMENT",
  "ENFORCEMENT",
  "FEES_AND_WAIVERS",
  "CLOSED",
];

type Policy = {
  id?: string;
  country_code: string;
  default_workbasket_code: string | null;
  default_team_code: string | null;
  default_strategy_code: string | null;
  default_priority_code: string | null;
  auto_assign_on_referral: boolean;
  auto_assign_on_manual: boolean;
  auto_assign_on_manual_case: boolean | null;
  allow_manual_override: boolean;
  escalate_unassigned_after_days: number;
  escalation_workbasket_code: string | null;
};

const emptyPolicy: Policy = {
  country_code: COUNTRY,
  default_workbasket_code: null,
  default_team_code: null,
  default_strategy_code: null,
  default_priority_code: null,
  auto_assign_on_referral: true,
  auto_assign_on_manual: false,
  auto_assign_on_manual_case: false,
  allow_manual_override: true,
  escalate_unassigned_after_days: 2,
  escalation_workbasket_code: null,
};

const NONE = "__none__";
const toDb = (v: string | undefined | null) => (!v || v === NONE ? null : v);
const fromDb = (v: string | null | undefined) => v ?? NONE;
const NoneItem = ({ children = "— None —" }: { children?: React.ReactNode }) => (
  <SelectItem value={NONE}>{children}</SelectItem>
);

export default function LegalAdminRouting() {
  const qc = useQueryClient();
  const { data: teams = [] } = useLegalTeams();
  const { data: workbaskets = [] } = useLegalReferenceValues("LG_WORKBASKET");
  const { data: strategies = [] } = useLegalReferenceValues("LG_ASSIGNMENT_STRATEGY");
  const { data: stages = [] } = useLegalReferenceValues("LG_CASE_STAGE");
  const { data: caseTypes = [] } = useLegalReferenceValues("LG_CASE_TYPE");
  const { data: priorities = [] } = useLegalReferenceValues("LG_PRIORITY");
  const activeTeams = (teams as any[]).filter((t) => t.is_active);

  const policyQ = useQuery({
    queryKey: ["lg_routing_policy", COUNTRY],
    queryFn: async () => {
      const { data } = await sb.from("lg_routing_policy").select("*").eq("country_code", COUNTRY).maybeSingle();
      return (data as Policy | null) ?? { ...emptyPolicy };
    },
  });
  const sourceQ = useQuery({
    queryKey: ["lg_routing_source_map", COUNTRY],
    queryFn: async () => (await sb.from("lg_routing_source_map").select("*").eq("country_code", COUNTRY)).data ?? [],
  });
  const typeQ = useQuery({
    queryKey: ["lg_routing_case_type", COUNTRY],
    queryFn: async () => (await sb.from("lg_routing_case_type").select("*").eq("country_code", COUNTRY)).data ?? [],
  });
  const stageQ = useQuery({
    queryKey: ["lg_routing_stage_override", COUNTRY],
    queryFn: async () => (await sb.from("lg_routing_stage_override").select("*").eq("country_code", COUNTRY)).data ?? [],
  });
  const twQ = useQuery({
    queryKey: ["lg_team_workbasket", "all"],
    queryFn: async () => (await sb.from("lg_team_workbasket").select("team_id, workbasket_code, is_active")).data ?? [],
  });

  const [policy, setPolicy] = useState<Policy>(emptyPolicy);
  useEffect(() => { if (policyQ.data) setPolicy(policyQ.data as Policy); }, [policyQ.data]);

  const caseTypeCodes = useMemo(() => {
    const fromDict = (caseTypes as any[]).map((c) => c.value_code);
    return Array.from(new Set([...CASE_TYPES_SEED, ...fromDict]));
  }, [caseTypes]);
  const stageCodes = useMemo(() => {
    const fromDict = (stages as any[]).map((s) => s.value_code);
    return Array.from(new Set([...STAGE_CODES, ...fromDict]));
  }, [stages]);

  async function savePolicy() {
    const payload: any = { ...policy, country_code: COUNTRY };
    payload.auto_assign_on_manual = payload.auto_assign_on_manual_case ?? payload.auto_assign_on_manual ?? false;
    delete payload.id;
    const { error } = await sb.from("lg_routing_policy").upsert(payload, { onConflict: "country_code" });
    if (error) { toast.error("Failed to save policy", { description: error.message }); return; }
    toast.success("Routing policy saved");
    qc.invalidateQueries({ queryKey: ["lg_routing_policy", COUNTRY] });
  }

  // Validation
  const validation = useMemo(() => {
    const issues: { level: "error" | "warn"; msg: string }[] = [];
    const wbCodes = new Set((workbaskets as any[]).map((w) => w.value_code));
    const teamCodes = new Set(activeTeams.map((t: any) => t.team_code));
    const twPairs = new Set(
      ((twQ.data ?? []) as any[])
        .filter((r) => r.is_active !== false)
        .map((r) => `${r.team_id}::${r.workbasket_code}`),
    );
    const teamIdByCode: Record<string, string> = {};
    (activeTeams as any[]).forEach((t) => { teamIdByCode[t.team_code] = t.id; });

    if (!policy.default_team_code) issues.push({ level: "error", msg: "Default team is not set" });
    else if (!teamCodes.has(policy.default_team_code))
      issues.push({ level: "error", msg: `Default team ${policy.default_team_code} is not active` });

    if (!policy.default_workbasket_code) issues.push({ level: "error", msg: "Default workbasket is not set" });
    else if (!wbCodes.has(policy.default_workbasket_code))
      issues.push({ level: "error", msg: `Default workbasket ${policy.default_workbasket_code} is not in reference list` });

    if (policy.default_team_code && policy.default_workbasket_code) {
      const tid = teamIdByCode[policy.default_team_code];
      if (tid && !twPairs.has(`${tid}::${policy.default_workbasket_code}`)) {
        issues.push({
          level: "warn",
          msg: `Default team ${policy.default_team_code} has no mapping for workbasket ${policy.default_workbasket_code} — fix in Teams & Staff`,
        });
      }
    }

    const checkRoute = (label: string, row: any) => {
      if (!row || row.is_active === false) return;
      if (row.workbasket_code && !wbCodes.has(row.workbasket_code))
        issues.push({ level: "error", msg: `${label}: workbasket ${row.workbasket_code} is invalid` });
      if (row.team_code && !teamCodes.has(row.team_code))
        issues.push({ level: "error", msg: `${label}: team ${row.team_code} is not active` });
    };
    (sourceQ.data ?? []).forEach((r: any) => checkRoute(`Source ${r.source_code}`, r));
    (typeQ.data ?? []).forEach((r: any) => checkRoute(`Case type ${r.case_type_code}`, r));
    (stageQ.data ?? []).forEach((r: any) => checkRoute(`Stage ${r.stage_code}`, r));

    return issues;
  }, [policy, workbaskets, activeTeams, twQ.data, sourceQ.data, typeQ.data, stageQ.data]);

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Routing &amp; Assignment</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Decide where new and changing cases land. Rules are evaluated in the priority order below — the first match wins.
            Teams and workbasket-to-team mapping live in{" "}
            <Link to="/legal/admin/teams" className="underline underline-offset-2">Teams &amp; Staff</Link>.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/legal/admin/teams"><Users className="h-4 w-4 mr-2" />Teams &amp; Staff</Link>
        </Button>
      </div>

      {/* 1. Routing Logic Priority */}
      <RoutingPrecedenceCard />

      {/* 2. Routing Rules */}
      <RoutingRulesList />

      {/* 3. Routing Simulator */}
      <RoutingSimulator caseTypes={caseTypeCodes} stages={stageCodes} />

      {/* 4. Advanced Configuration (hidden by default) */}
      <Accordion type="single" collapsible>
        <AccordionItem value="advanced" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings2 className="h-4 w-4" />
              Advanced Configuration
              <span className="text-xs text-muted-foreground font-normal">
                Global defaults, escalation policy, validation report
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            {/* Global Defaults */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Global Defaults</CardTitle>
                <CardDescription>Used when no rule above matches.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs">Default Workbasket</Label>
                    <Select value={fromDb(policy.default_workbasket_code)} onValueChange={(v) => setPolicy({ ...policy, default_workbasket_code: toDb(v) })}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        <NoneItem />
                        {(workbaskets as any[]).map((w) => <SelectItem key={w.value_code} value={w.value_code}>{w.value_label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Default Team</Label>
                    <Select value={fromDb(policy.default_team_code)} onValueChange={(v) => setPolicy({ ...policy, default_team_code: toDb(v) })}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        <NoneItem />
                        {activeTeams.map((t: any) => <SelectItem key={t.team_code} value={t.team_code}>{t.team_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Default Strategy</Label>
                    <Select value={fromDb(policy.default_strategy_code)} onValueChange={(v) => setPolicy({ ...policy, default_strategy_code: toDb(v) })}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        <NoneItem />
                        {(strategies as any[]).map((s) => <SelectItem key={s.value_code} value={s.value_code}>{s.value_label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Default Priority</Label>
                    <Select value={fromDb(policy.default_priority_code)} onValueChange={(v) => setPolicy({ ...policy, default_priority_code: toDb(v) })}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        <NoneItem />
                        {((priorities as any[]).length ? (priorities as any[]).map((p) => p.value_code) : ["LOW","NORMAL","HIGH","URGENT"]).map((p: string) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">Auto-assign on Referral</p>
                      <p className="text-xs text-muted-foreground">Compliance referrals routed automatically.</p>
                    </div>
                    <Switch checked={policy.auto_assign_on_referral} onCheckedChange={(v) => setPolicy({ ...policy, auto_assign_on_referral: v })} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">Auto-assign on Manual Case</p>
                      <p className="text-xs text-muted-foreground">Manually created cases routed automatically.</p>
                    </div>
                    <Switch checked={!!policy.auto_assign_on_manual_case} onCheckedChange={(v) => setPolicy({ ...policy, auto_assign_on_manual_case: v, auto_assign_on_manual: v })} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">Allow Manual Override</p>
                      <p className="text-xs text-muted-foreground">Admins can reassign outside policy.</p>
                    </div>
                    <Switch checked={policy.allow_manual_override} onCheckedChange={(v) => setPolicy({ ...policy, allow_manual_override: v })} />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Escalate Unassigned After (days)</Label>
                    <Input
                      type="number"
                      min={0}
                      className="h-9 mt-1"
                      value={policy.escalate_unassigned_after_days}
                      onChange={(e) => setPolicy({ ...policy, escalate_unassigned_after_days: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Escalation Target Workbasket</Label>
                    <Select value={fromDb(policy.escalation_workbasket_code)} onValueChange={(v) => setPolicy({ ...policy, escalation_workbasket_code: toDb(v) })}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        <NoneItem />
                        {(workbaskets as any[]).map((w) => <SelectItem key={w.value_code} value={w.value_code}>{w.value_label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={savePolicy}><Save className="h-4 w-4 mr-2" />Save Policy</Button>
                </div>
              </CardContent>
            </Card>

            {/* Validation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" /> Routing Validation
                </CardTitle>
                <CardDescription>Checks defaults, mappings and references.</CardDescription>
              </CardHeader>
              <CardContent>
                {validation.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> All routing configuration looks valid.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {validation.map((v, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className={`h-4 w-4 mt-0.5 ${v.level === "error" ? "text-destructive" : "text-amber-600"}`} />
                        <span>{v.msg}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
