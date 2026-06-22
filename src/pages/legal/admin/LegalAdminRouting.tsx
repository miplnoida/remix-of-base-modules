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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Save, Users, Info, CheckCircle2, AlertTriangle } from "lucide-react";
import RoutingPrecedenceCard from "@/components/legal/admin/RoutingPrecedenceCard";
import RoutingPreviewCard from "@/components/legal/admin/RoutingPreviewCard";

const sb = supabase as any;
const COUNTRY = "SKN";

const CASE_SOURCES = [
  { code: "COMPLIANCE_REFERRAL", label: "Compliance Referral" },
  { code: "MANUAL_EMPLOYER", label: "Manual Employer Case" },
  { code: "MANUAL_IP", label: "Manual Insured Person Case" },
  { code: "LEGACY", label: "Legacy Case" },
];

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

function NoneItem({ children = "— None —" }: { children?: React.ReactNode }) {
  return <SelectItem value={NONE}>{children}</SelectItem>;
}

export default function LegalAdminRouting() {
  const qc = useQueryClient();
  const { data: teams = [] } = useLegalTeams();
  const { data: workbaskets = [] } = useLegalReferenceValues("LG_WORKBASKET");
  const { data: strategies = [] } = useLegalReferenceValues("LG_ASSIGNMENT_STRATEGY");
  const { data: stages = [] } = useLegalReferenceValues("LG_CASE_STAGE");
  const { data: caseTypes = [] } = useLegalReferenceValues("LG_CASE_TYPE");
  const { data: priorities = [] } = useLegalReferenceValues("LG_PRIORITY");

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

  const sourceMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const r of sourceQ.data ?? []) m[r.source_code] = r;
    return m;
  }, [sourceQ.data]);
  const typeMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const r of typeQ.data ?? []) m[r.case_type_code] = r;
    return m;
  }, [typeQ.data]);
  const stageMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const r of stageQ.data ?? []) m[r.stage_code] = r;
    return m;
  }, [stageQ.data]);

  const activeTeams = (teams as any[]).filter((t) => t.is_active);
  const caseTypeCodes = useMemo(() => {
    const fromDict = (caseTypes as any[]).map((c) => c.value_code);
    const merged = Array.from(new Set([...CASE_TYPES_SEED, ...fromDict]));
    return merged;
  }, [caseTypes]);
  const stageCodes = useMemo(() => {
    const fromDict = (stages as any[]).map((s) => s.value_code);
    const merged = Array.from(new Set([...STAGE_CODES, ...fromDict]));
    return merged;
  }, [stages]);

  const wbLabel = (code: string | null) =>
    code ? (workbaskets as any[]).find((w) => w.value_code === code)?.value_label ?? code : "—";
  const teamLabel = (code: string | null) =>
    code ? (activeTeams.find((t: any) => t.team_code === code) as any)?.team_name ?? code : "—";
  const stageLabel = (code: string) =>
    (stages as any[]).find((s) => s.value_code === code)?.value_label ?? code;
  const typeLabel = (code: string) =>
    (caseTypes as any[]).find((c) => c.value_code === code)?.value_label ?? code;

  async function savePolicy() {
    const payload: any = { ...policy, country_code: COUNTRY };
    // mirror legacy flag with the new one
    payload.auto_assign_on_manual = payload.auto_assign_on_manual_case ?? payload.auto_assign_on_manual ?? false;
    delete payload.id;
    const { error } = await sb.from("lg_routing_policy").upsert(payload, { onConflict: "country_code" });
    if (error) { toast.error("Failed to save policy", { description: error.message }); return; }
    toast.success("Routing policy saved");
    qc.invalidateQueries({ queryKey: ["lg_routing_policy", COUNTRY] });
  }

  async function upsertSource(source_code: string, patch: any) {
    const existing = sourceMap[source_code] ?? {};
    const row = { country_code: COUNTRY, source_code, ...existing, ...patch };
    delete row.id; delete row.created_at; delete row.updated_at;
    const { error } = await sb.from("lg_routing_source_map").upsert(row, { onConflict: "country_code,source_code" });
    if (error) { toast.error("Save failed", { description: error.message }); return; }
    qc.invalidateQueries({ queryKey: ["lg_routing_source_map", COUNTRY] });
  }
  async function upsertCaseType(case_type_code: string, patch: any) {
    const existing = typeMap[case_type_code] ?? {};
    const row = { country_code: COUNTRY, case_type_code, ...existing, ...patch };
    delete row.id; delete row.created_at; delete row.updated_at;
    const { error } = await sb.from("lg_routing_case_type").upsert(row, { onConflict: "country_code,case_type_code" });
    if (error) { toast.error("Save failed", { description: error.message }); return; }
    qc.invalidateQueries({ queryKey: ["lg_routing_case_type", COUNTRY] });
  }
  async function upsertStage(stage_code: string, patch: any) {
    const existing = stageMap[stage_code] ?? {};
    const row = { country_code: COUNTRY, stage_code, ...existing, ...patch };
    delete row.id; delete row.created_at; delete row.updated_at;
    const { error } = await sb.from("lg_routing_stage_override").upsert(row, { onConflict: "country_code,stage_code" });
    if (error) { toast.error("Save failed", { description: error.message }); return; }
    qc.invalidateQueries({ queryKey: ["lg_routing_stage_override", COUNTRY] });
  }

  // Validation
  const validation = useMemo(() => {
    const issues: { level: "error" | "warn"; msg: string }[] = [];
    const wbCodes = new Set((workbaskets as any[]).map((w) => w.value_code));
    const teamCodes = new Set(activeTeams.map((t: any) => t.team_code));
    const twPairs = new Set(
      ((twQ.data ?? []) as any[])
        .filter((r) => r.is_active !== false)
        .map((r) => `${r.team_id}::${r.workbasket_code}`)
    );
    const teamIdByCode: Record<string, string> = {};
    (activeTeams as any[]).forEach((t) => { teamIdByCode[t.team_code] = t.id; });

    if (!policy.default_team_code) issues.push({ level: "error", msg: "Default team is not set" });
    else if (!teamCodes.has(policy.default_team_code)) issues.push({ level: "error", msg: `Default team ${policy.default_team_code} is not active` });

    if (!policy.default_workbasket_code) issues.push({ level: "error", msg: "Default workbasket is not set" });
    else if (!wbCodes.has(policy.default_workbasket_code)) issues.push({ level: "error", msg: `Default workbasket ${policy.default_workbasket_code} is not in reference list` });

    if (policy.default_team_code && policy.default_workbasket_code) {
      const tid = teamIdByCode[policy.default_team_code];
      if (tid && !twPairs.has(`${tid}::${policy.default_workbasket_code}`)) {
        issues.push({ level: "warn", msg: `Default team ${policy.default_team_code} has no mapping for workbasket ${policy.default_workbasket_code} — fix in Teams & Staff` });
      }
    }

    const checkRoute = (label: string, row: any) => {
      if (!row || row.is_active === false) return;
      if (row.workbasket_code && !wbCodes.has(row.workbasket_code)) issues.push({ level: "error", msg: `${label}: workbasket ${row.workbasket_code} is invalid` });
      if (row.team_code && !teamCodes.has(row.team_code)) issues.push({ level: "error", msg: `${label}: team ${row.team_code} is not active` });
    };
    Object.values(sourceMap).forEach((r: any) => checkRoute(`Source ${r.source_code}`, r));
    Object.values(typeMap).forEach((r: any) => checkRoute(`Case type ${r.case_type_code}`, r));
    Object.values(stageMap).forEach((r: any) => checkRoute(`Stage ${r.stage_code}`, r));

    return issues;
  }, [policy, workbaskets, activeTeams, twQ.data, sourceMap, typeMap, stageMap]);

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Routing &amp; Assignment</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Routing decides where a case goes when it is created or when its stage changes.
            Team membership and workbasket-to-team mapping are managed in <Link to="/legal/admin/teams" className="underline">Teams &amp; Staff</Link>.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/legal/admin/teams"><Users className="h-4 w-4 mr-2" />Manage Teams &amp; Staff</Link>
        </Button>
      </div>

      {/* Precedence (configurable) */}
      <RoutingPrecedenceCard />

      {/* Routing Preview */}
      <RoutingPreviewCard caseTypes={caseTypeCodes} stages={stageCodes} />


      {/* Global Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Global Defaults</CardTitle>
          <CardDescription>Applied to every new case unless a more specific rule below matches.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Default Workbasket</Label>
              <Select value={fromDb(policy.default_workbasket_code)} onValueChange={(v) => setPolicy({ ...policy, default_workbasket_code: toDb(v) })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <NoneItem />
                  {workbaskets.map((w: any) => <SelectItem key={w.value_code} value={w.value_code}>{w.value_label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Team</Label>
              <Select value={fromDb(policy.default_team_code)} onValueChange={(v) => setPolicy({ ...policy, default_team_code: toDb(v) })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <NoneItem />
                  {activeTeams.map((t: any) => <SelectItem key={t.team_code} value={t.team_code}>{t.team_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Strategy</Label>
              <Select value={fromDb(policy.default_strategy_code)} onValueChange={(v) => setPolicy({ ...policy, default_strategy_code: toDb(v) })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <NoneItem />
                  {strategies.map((s: any) => <SelectItem key={s.value_code} value={s.value_code}>{s.value_label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Priority</Label>
              <Select value={fromDb(policy.default_priority_code)} onValueChange={(v) => setPolicy({ ...policy, default_priority_code: toDb(v) })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <NoneItem />
                  {priorities.map((p: any) => <SelectItem key={p.value_code} value={p.value_code}>{p.value_label}</SelectItem>)}
                  {priorities.length === 0 && ["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => (
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
                <p className="text-xs text-muted-foreground">Compliance referrals are routed automatically.</p>
              </div>
              <Switch checked={policy.auto_assign_on_referral} onCheckedChange={(v) => setPolicy({ ...policy, auto_assign_on_referral: v })} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Auto-assign on Manual Case</p>
                <p className="text-xs text-muted-foreground">Manually created cases are routed automatically.</p>
              </div>
              <Switch checked={!!policy.auto_assign_on_manual_case} onCheckedChange={(v) => setPolicy({ ...policy, auto_assign_on_manual_case: v, auto_assign_on_manual: v })} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Allow Manual Override</p>
                <p className="text-xs text-muted-foreground">Admins can reassign cases outside the policy.</p>
              </div>
              <Switch checked={policy.allow_manual_override} onCheckedChange={(v) => setPolicy({ ...policy, allow_manual_override: v })} />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Escalate Unassigned After (days)</Label>
              <Input type="number" min={0} value={policy.escalate_unassigned_after_days}
                onChange={(e) => setPolicy({ ...policy, escalate_unassigned_after_days: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Escalation Target Workbasket</Label>
              <Select value={fromDb(policy.escalation_workbasket_code)} onValueChange={(v) => setPolicy({ ...policy, escalation_workbasket_code: toDb(v) })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <NoneItem />
                  {workbaskets.map((w: any) => <SelectItem key={w.value_code} value={w.value_code}>{w.value_label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={savePolicy}><Save className="h-4 w-4 mr-2" />Save Policy</Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Source Routing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Source Routing</CardTitle>
          <CardDescription>Override defaults based on where the case originated.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Workbasket</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Case Type (optional)</TableHead>
                <TableHead className="w-24">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CASE_SOURCES.map((src) => {
                const row = sourceMap[src.code] ?? {};
                return (
                  <TableRow key={src.code}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{src.label}</span>
                        <Badge variant="outline" className="font-mono text-[10px] w-fit mt-1">{src.code}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={fromDb(row.workbasket_code)} onValueChange={(v) => upsertSource(src.code, { workbasket_code: toDb(v), is_active: row.is_active ?? true })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Use default" /></SelectTrigger>
                        <SelectContent>
                          <NoneItem>Use default</NoneItem>
                          {workbaskets.map((w: any) => <SelectItem key={w.value_code} value={w.value_code}>{w.value_label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={fromDb(row.team_code)} onValueChange={(v) => upsertSource(src.code, { team_code: toDb(v), is_active: row.is_active ?? true })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Use default" /></SelectTrigger>
                        <SelectContent>
                          <NoneItem>Use default</NoneItem>
                          {activeTeams.map((t: any) => <SelectItem key={t.team_code} value={t.team_code}>{t.team_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={fromDb(row.case_type_code)} onValueChange={(v) => upsertSource(src.code, { case_type_code: toDb(v), is_active: row.is_active ?? true })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent>
                          <NoneItem>Any</NoneItem>
                          {caseTypeCodes.map((c) => <SelectItem key={c} value={c}>{typeLabel(c)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch checked={row.is_active ?? true} onCheckedChange={(v) => upsertSource(src.code, { is_active: v })} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 3. Case Type Routing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Case Type Routing</CardTitle>
          <CardDescription>Each case type can target its own workbasket / team. Overrides Source rules.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case Type</TableHead>
                <TableHead>Workbasket</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="w-24">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {caseTypeCodes.map((code) => {
                const row = typeMap[code] ?? {};
                return (
                  <TableRow key={code}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{typeLabel(code)}</span>
                        <Badge variant="outline" className="font-mono text-[10px] w-fit mt-1">{code}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={fromDb(row.workbasket_code)} onValueChange={(v) => upsertCaseType(code, { workbasket_code: toDb(v), is_active: row.is_active ?? true })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="No override" /></SelectTrigger>
                        <SelectContent>
                          <NoneItem>No override</NoneItem>
                          {workbaskets.map((w: any) => <SelectItem key={w.value_code} value={w.value_code}>{w.value_label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={fromDb(row.team_code)} onValueChange={(v) => upsertCaseType(code, { team_code: toDb(v), is_active: row.is_active ?? true })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Default team" /></SelectTrigger>
                        <SelectContent>
                          <NoneItem>Default team</NoneItem>
                          {activeTeams.map((t: any) => <SelectItem key={t.team_code} value={t.team_code}>{t.team_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={fromDb(row.priority_code)} onValueChange={(v) => upsertCaseType(code, { priority_code: toDb(v), is_active: row.is_active ?? true })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Default" /></SelectTrigger>
                        <SelectContent>
                          <NoneItem>Default</NoneItem>
                          {(priorities.length ? (priorities as any[]).map((p) => p.value_code) : ["LOW","NORMAL","HIGH","URGENT"]).map((p: string) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch checked={row.is_active ?? true} onCheckedChange={(v) => upsertCaseType(code, { is_active: v })} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 4. Stage Routing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. Stage Routing</CardTitle>
          <CardDescription>When a case transitions to a stage, move it to the configured workbasket / team.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead>Workbasket</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Case Type (optional)</TableHead>
                <TableHead className="w-28">Auto-assign</TableHead>
                <TableHead className="w-24">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stageCodes.map((code) => {
                const row = stageMap[code] ?? {};
                return (
                  <TableRow key={code}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{stageLabel(code)}</span>
                        <Badge variant="outline" className="font-mono text-[10px] w-fit mt-1">{code}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={fromDb(row.workbasket_code)} onValueChange={(v) => upsertStage(code, { workbasket_code: toDb(v), is_active: row.is_active ?? true })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="No override" /></SelectTrigger>
                        <SelectContent>
                          <NoneItem>No override</NoneItem>
                          {workbaskets.map((w: any) => <SelectItem key={w.value_code} value={w.value_code}>{w.value_label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={fromDb(row.team_code)} onValueChange={(v) => upsertStage(code, { team_code: toDb(v), is_active: row.is_active ?? true })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Default team" /></SelectTrigger>
                        <SelectContent>
                          <NoneItem>Default team</NoneItem>
                          {activeTeams.map((t: any) => <SelectItem key={t.team_code} value={t.team_code}>{t.team_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={fromDb(row.case_type_code)} onValueChange={(v) => upsertStage(code, { case_type_code: toDb(v), is_active: row.is_active ?? true })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent>
                          <NoneItem>Any</NoneItem>
                          {caseTypeCodes.map((c) => <SelectItem key={c} value={c}>{typeLabel(c)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch checked={!!row.auto_assign} onCheckedChange={(v) => upsertStage(code, { auto_assign: v, is_active: row.is_active ?? true })} />
                    </TableCell>
                    <TableCell>
                      <Switch checked={row.is_active ?? true} onCheckedChange={(v) => upsertStage(code, { is_active: v })} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Validation panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" /> Routing Validation
          </CardTitle>
          <CardDescription>Checks defaults, mappings and references — fix issues before testing case creation.</CardDescription>
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
    </div>
  );
}
