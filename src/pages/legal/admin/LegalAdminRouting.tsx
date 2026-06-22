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
import { toast } from "sonner";
import { ArrowRight, Save, Users, Inbox } from "lucide-react";

const sb = supabase as any;
const COUNTRY = "SKN";

const CASE_SOURCES = [
  { code: "COMPLIANCE_REFERRAL", label: "Compliance Referral" },
  { code: "MANUAL_EMPLOYER", label: "Manual Employer Case" },
  { code: "MANUAL_IP", label: "Manual Insured Person Case" },
  { code: "LEGACY", label: "Legacy Case" },
];

const STAGE_CODES = [
  "REFERRAL_RECEIVED",
  "LEGAL_REVIEW",
  "DEMAND_NOTICE",
  "COURT_FILING",
  "HEARING",
  "SETTLEMENT_NEGOTIATION",
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
  auto_assign_on_referral: boolean;
  auto_assign_on_manual: boolean;
  allow_manual_override: boolean;
  escalate_unassigned_after_days: number;
  escalation_workbasket_code: string | null;
};

const emptyPolicy: Policy = {
  country_code: COUNTRY,
  default_workbasket_code: null,
  default_team_code: null,
  default_strategy_code: null,
  auto_assign_on_referral: true,
  auto_assign_on_manual: false,
  allow_manual_override: true,
  escalate_unassigned_after_days: 3,
  escalation_workbasket_code: null,
};

function NoneItem({ children = "— None —" }: { children?: React.ReactNode }) {
  return <SelectItem value="__none__">{children}</SelectItem>;
}
const toDb = (v: string | undefined | null) => (!v || v === "__none__" ? null : v);
const fromDb = (v: string | null | undefined) => v ?? "__none__";

export default function LegalAdminRouting() {
  const qc = useQueryClient();
  const { data: teams = [] } = useLegalTeams();
  const { data: workbaskets = [] } = useLegalReferenceValues("LG_WORKBASKET");
  const { data: strategies = [] } = useLegalReferenceValues("LG_ASSIGNMENT_STRATEGY");
  const { data: stages = [] } = useLegalReferenceValues("LG_CASE_STAGE");
  const { data: caseTypes = [] } = useLegalReferenceValues("LG_CASE_TYPE");

  const policyQ = useQuery({
    queryKey: ["lg_routing_policy", COUNTRY],
    queryFn: async () => {
      const { data } = await sb.from("lg_routing_policy").select("*").eq("country_code", COUNTRY).maybeSingle();
      return (data as Policy | null) ?? { ...emptyPolicy };
    },
  });
  const sourceQ = useQuery({
    queryKey: ["lg_routing_source_map", COUNTRY],
    queryFn: async () => {
      const { data } = await sb.from("lg_routing_source_map").select("*").eq("country_code", COUNTRY);
      return (data ?? []) as any[];
    },
  });
  const stageQ = useQuery({
    queryKey: ["lg_routing_stage_override", COUNTRY],
    queryFn: async () => {
      const { data } = await sb.from("lg_routing_stage_override").select("*").eq("country_code", COUNTRY);
      return (data ?? []) as any[];
    },
  });

  const [policy, setPolicy] = useState<Policy>(emptyPolicy);
  useEffect(() => { if (policyQ.data) setPolicy(policyQ.data); }, [policyQ.data]);

  const sourceMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const r of sourceQ.data ?? []) m[r.source_code] = r;
    return m;
  }, [sourceQ.data]);
  const stageMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const r of stageQ.data ?? []) m[r.stage_code] = r;
    return m;
  }, [stageQ.data]);

  const activeTeams = (teams as any[]).filter((t) => t.is_active);

  async function savePolicy() {
    const payload: any = { ...policy, country_code: COUNTRY };
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

  async function upsertStage(stage_code: string, patch: any) {
    const existing = stageMap[stage_code] ?? {};
    const row = { country_code: COUNTRY, stage_code, ...existing, ...patch };
    delete row.id; delete row.created_at; delete row.updated_at;
    const { error } = await sb.from("lg_routing_stage_override").upsert(row, { onConflict: "country_code,stage_code" });
    if (error) { toast.error("Save failed", { description: error.message }); return; }
    qc.invalidateQueries({ queryKey: ["lg_routing_stage_override", COUNTRY] });
  }

  const stageLabel = (code: string) =>
    (stages as any[]).find((s) => s.value_code === code)?.value_label ?? code;

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Routing &amp; Assignment</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global routing policy for incoming legal cases. Team membership and workbasket-to-team
            mapping are managed in Teams &amp; Staff.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/legal/admin/teams"><Users className="h-4 w-4 mr-2" />Manage Teams &amp; Staff</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/legal/admin/teams"><Inbox className="h-4 w-4 mr-2" />Manage Workbasket Mapping</Link>
          </Button>
        </div>
      </div>

      {/* Global Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Global Defaults</CardTitle>
          <CardDescription>
            Applied to every new case unless a source- or stage-specific override below matches.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Default Intake Workbasket</Label>
              <Select value={fromDb(policy.default_workbasket_code)}
                onValueChange={(v) => setPolicy({ ...policy, default_workbasket_code: toDb(v) })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <NoneItem />
                  {workbaskets.map((w) => (
                    <SelectItem key={w.value_code} value={w.value_code}>{w.value_label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Team</Label>
              <Select value={fromDb(policy.default_team_code)}
                onValueChange={(v) => setPolicy({ ...policy, default_team_code: toDb(v) })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <NoneItem />
                  {activeTeams.map((t) => (
                    <SelectItem key={t.team_code} value={t.team_code}>{t.team_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Assignment Strategy</Label>
              <Select value={fromDb(policy.default_strategy_code)}
                onValueChange={(v) => setPolicy({ ...policy, default_strategy_code: toDb(v) })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <NoneItem />
                  {strategies.map((s) => (
                    <SelectItem key={s.value_code} value={s.value_code}>{s.value_label}</SelectItem>
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
              <Switch checked={policy.auto_assign_on_referral}
                onCheckedChange={(v) => setPolicy({ ...policy, auto_assign_on_referral: v })} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Auto-assign on Manual Case</p>
                <p className="text-xs text-muted-foreground">Manually created cases are routed automatically.</p>
              </div>
              <Switch checked={policy.auto_assign_on_manual}
                onCheckedChange={(v) => setPolicy({ ...policy, auto_assign_on_manual: v })} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Allow Manual Override</p>
                <p className="text-xs text-muted-foreground">Admins can reassign cases outside the policy.</p>
              </div>
              <Switch checked={policy.allow_manual_override}
                onCheckedChange={(v) => setPolicy({ ...policy, allow_manual_override: v })} />
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
              <Select value={fromDb(policy.escalation_workbasket_code)}
                onValueChange={(v) => setPolicy({ ...policy, escalation_workbasket_code: toDb(v) })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <NoneItem />
                  {workbaskets.map((w) => (
                    <SelectItem key={w.value_code} value={w.value_code}>{w.value_label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={savePolicy}><Save className="h-4 w-4 mr-2" />Save Policy</Button>
          </div>
        </CardContent>
      </Card>

      {/* Case Source Routing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Case Source Routing</CardTitle>
          <CardDescription>Override defaults by where the case originated.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Workbasket</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Case Type</TableHead>
                <TableHead className="w-24">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CASE_SOURCES.map((src) => {
                const row = sourceMap[src.code] ?? {};
                return (
                  <TableRow key={src.code}>
                    <TableCell className="font-medium">{src.label}</TableCell>
                    <TableCell>
                      <Select value={fromDb(row.workbasket_code)}
                        onValueChange={(v) => upsertSource(src.code, { workbasket_code: toDb(v), is_active: row.is_active ?? true })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Use default" /></SelectTrigger>
                        <SelectContent>
                          <NoneItem>Use default</NoneItem>
                          {workbaskets.map((w) => (
                            <SelectItem key={w.value_code} value={w.value_code}>{w.value_label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={fromDb(row.team_code)}
                        onValueChange={(v) => upsertSource(src.code, { team_code: toDb(v), is_active: row.is_active ?? true })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Use default" /></SelectTrigger>
                        <SelectContent>
                          <NoneItem>Use default</NoneItem>
                          {activeTeams.map((t) => (
                            <SelectItem key={t.team_code} value={t.team_code}>{t.team_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={fromDb(row.case_type_code)}
                        onValueChange={(v) => upsertSource(src.code, { case_type_code: toDb(v), is_active: row.is_active ?? true })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent>
                          <NoneItem>Any</NoneItem>
                          {caseTypes.map((c) => (
                            <SelectItem key={c.value_code} value={c.value_code}>{c.value_label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch checked={row.is_active ?? true}
                        onCheckedChange={(v) => upsertSource(src.code, { is_active: v })} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stage Routing Overrides */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stage Routing Overrides</CardTitle>
          <CardDescription>
            When a case transitions to one of these stages, route it to the configured workbasket / team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead>Workbasket</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="w-24">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {STAGE_CODES.map((code) => {
                const row = stageMap[code] ?? {};
                return (
                  <TableRow key={code}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px]">{code}</Badge>
                        <span>{stageLabel(code)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={fromDb(row.workbasket_code)}
                        onValueChange={(v) => upsertStage(code, { workbasket_code: toDb(v), is_active: row.is_active ?? true })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="No override" /></SelectTrigger>
                        <SelectContent>
                          <NoneItem>No override</NoneItem>
                          {workbaskets.map((w) => (
                            <SelectItem key={w.value_code} value={w.value_code}>{w.value_label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={fromDb(row.team_code)}
                        onValueChange={(v) => upsertStage(code, { team_code: toDb(v), is_active: row.is_active ?? true })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="No override" /></SelectTrigger>
                        <SelectContent>
                          <NoneItem>No override</NoneItem>
                          {activeTeams.map((t) => (
                            <SelectItem key={t.team_code} value={t.team_code}>{t.team_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch checked={row.is_active ?? true}
                        onCheckedChange={(v) => upsertStage(code, { is_active: v })} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-muted/40">
        <CardContent className="py-4 flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Need to add team members or assign workbaskets to a specific team?
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/legal/admin/teams">Go to Teams &amp; Staff <ArrowRight className="h-4 w-4 ml-2" /></Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
