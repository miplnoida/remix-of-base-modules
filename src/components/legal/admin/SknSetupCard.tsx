import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Wand2, Users, Briefcase, Settings2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { suggestFromRoles, capabilityDefaults } from "@/services/legal/lgTeamService";

const sb = supabase as any;

const TARGET_TEAM_CODE = "GENERAL_LEGAL";
const LEGAL_ROLE_NAMES = [
  "LEGAL_ADMIN", "LEGAL_MANAGER", "LEGAL_OFFICER", "SENIOR_LEGAL_OFFICER",
  "LEGAL_SUPPORT_STAFF", "LEGAL_CLERK", "LEGAL_READ_ONLY",
];

const TARGET_WORKBASKETS: Array<{ code: string; autoAssign: boolean }> = [
  { code: "LEGAL_INTAKE_REVIEW",       autoAssign: false },
  { code: "LEGAL_REFERRAL_REVIEW",     autoAssign: true  },
  { code: "LEGAL_CASE_ASSIGNMENT",     autoAssign: true  },
  { code: "LEGAL_COURT_FILING",        autoAssign: false },
  { code: "LEGAL_HEARING_PREPARATION", autoAssign: false },
  { code: "LEGAL_SETTLEMENT_REVIEW",   autoAssign: false },
  { code: "LEGAL_FEE_POSTING",         autoAssign: false },
  { code: "LEGAL_ENFORCEMENT",         autoAssign: true  },
  { code: "LEGAL_JUDGMENT",            autoAssign: false },
  { code: "LEGAL_MANAGER_REVIEW",      autoAssign: false },
];

interface SetupSnapshot {
  teamId: string | null;
  teamActive: boolean;
  teamDefault: boolean;
  legalUserIds: string[];
  legalUsersWithRoles: Record<string, string[]>;
  memberUserIds: Set<string>;
  hasCaseOwner: boolean;
  mappedWbs: Set<string>;
  hasRoutingDefaults: boolean;
  routingTeamCode: string | null;
  routingWbCode: string | null;
}

async function loadSnapshot(): Promise<SetupSnapshot> {
  const [{ data: team }, { data: roles }, { data: settingsList }] = await Promise.all([
    sb.from("lg_team").select("id, is_active, is_default").eq("team_code", TARGET_TEAM_CODE).maybeSingle(),
    sb.from("user_roles").select("user_id, role").in("role", LEGAL_ROLE_NAMES),
    sb.from("legal_complainant_settings").select("default_team_code, default_workbasket_code").limit(1),
  ]);

  const legalRoleMap: Record<string, string[]> = {};
  (roles ?? []).forEach((r: any) => {
    legalRoleMap[r.user_id] = legalRoleMap[r.user_id] || [];
    legalRoleMap[r.user_id].push(r.role);
  });
  const legalUserIds = Object.keys(legalRoleMap);

  let memberUserIds = new Set<string>();
  let mappedWbs = new Set<string>();
  let hasCaseOwner = false;
  if (team?.id) {
    const [{ data: members }, { data: wbs }] = await Promise.all([
      sb.from("lg_team_member").select("user_id, can_own_case, is_active").eq("team_id", team.id),
      sb.from("lg_team_workbasket").select("workbasket_code, is_active").eq("team_id", team.id),
    ]);
    memberUserIds = new Set((members ?? []).map((m: any) => m.user_id));
    hasCaseOwner = (members ?? []).some((m: any) => m.is_active && m.can_own_case);
    mappedWbs = new Set((wbs ?? []).filter((w: any) => w.is_active).map((w: any) => w.workbasket_code));
  }

  const settings = settingsList?.[0];
  return {
    teamId: team?.id ?? null,
    teamActive: !!team?.is_active,
    teamDefault: !!team?.is_default,
    legalUserIds,
    legalUsersWithRoles: legalRoleMap,
    memberUserIds,
    hasCaseOwner,
    mappedWbs,
    hasRoutingDefaults: !!settings,
    routingTeamCode: settings?.default_team_code ?? null,
    routingWbCode: settings?.default_workbasket_code ?? null,
  };
}

export function SknSetupCard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: snap, refetch, isLoading } = useQuery({
    queryKey: ["skn-legal-setup-snapshot"],
    queryFn: loadSnapshot,
    staleTime: 15_000,
  });

  const checks = useMemo(() => {
    if (!snap) return [];
    const allUsersAssigned = snap.legalUserIds.length > 0 &&
      snap.legalUserIds.every((id) => snap.memberUserIds.has(id));
    const allWbMapped = TARGET_WORKBASKETS.every((w) => snap.mappedWbs.has(w.code));
    const routingMatches = snap.routingTeamCode === TARGET_TEAM_CODE &&
      snap.routingWbCode === "LEGAL_INTAKE_REVIEW";
    return [
      { ok: !!snap.teamId && snap.teamActive && snap.teamDefault, label: "General Legal Team exists and is active default" },
      { ok: allUsersAssigned, label: `All ${snap.legalUserIds.length} legal users assigned (${snap.memberUserIds.size} on team)` },
      { ok: snap.hasCaseOwner, label: "At least one case owner available" },
      { ok: allWbMapped, label: `All 10 legal workbaskets mapped (${snap.mappedWbs.size} mapped)` },
      { ok: snap.hasRoutingDefaults && routingMatches, label: "Routing defaults configured for SKN" },
      { ok: snap.hasCaseOwner && allWbMapped && allUsersAssigned, label: "Auto-assignment readiness" },
    ];
  }, [snap]);

  const allGood = checks.length > 0 && checks.every((c) => c.ok);

  const refreshAll = async () => {
    await refetch();
    qc.invalidateQueries({ queryKey: ["lg_team"] });
    qc.invalidateQueries({ queryKey: ["lg_team_member"] });
    qc.invalidateQueries({ queryKey: ["lg_team_workbasket"] });
  };

  async function seedTeam() {
    setBusy("team");
    try {
      const { data: existing } = await sb.from("lg_team").select("id").eq("team_code", TARGET_TEAM_CODE).maybeSingle();
      if (existing?.id) {
        await sb.from("lg_team").update({
          team_name: "General Legal Team", country_code: "SKN",
          is_default: true, is_active: true,
        }).eq("id", existing.id);
      } else {
        await sb.from("lg_team").insert({
          team_code: TARGET_TEAM_CODE, team_name: "General Legal Team",
          country_code: "SKN", is_default: true, is_active: true,
        });
      }
      await sb.from("lg_team").update({ is_default: false }).neq("team_code", TARGET_TEAM_CODE);
      toast({ title: "General Legal Team ready" });
      await refreshAll();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  }

  async function assignAllLegalUsers() {
    setBusy("users");
    try {
      const { data: team } = await sb.from("lg_team").select("id").eq("team_code", TARGET_TEAM_CODE).maybeSingle();
      if (!team?.id) throw new Error("Seed the team first.");

      const { data: roles } = await sb.from("user_roles").select("user_id, role").in("role", LEGAL_ROLE_NAMES);
      const byUser: Record<string, string[]> = {};
      (roles ?? []).forEach((r: any) => {
        byUser[r.user_id] = byUser[r.user_id] || [];
        byUser[r.user_id].push(r.role);
      });

      let count = 0;
      for (const [userId, userRoles] of Object.entries(byUser)) {
        const { fn, caps } = suggestFromRoles(userRoles);
        const primaryRole = userRoles[0] ?? null;
        // Clear is_primary first if needed
        await sb.from("lg_team_member").upsert({
          team_id: team.id,
          user_id: userId,
          role_code: primaryRole,
          member_function: fn,
          ...capabilityDefaults(fn),
          ...caps,
          is_active: true,
          is_primary: false,
        }, { onConflict: "team_id,user_id" });
        count += 1;
      }

      // Promote first LEGAL_MANAGER to primary if none currently set
      const { data: members } = await sb.from("lg_team_member").select("id, user_id, member_function, is_primary").eq("team_id", team.id);
      const hasPrimary = (members ?? []).some((m: any) => m.is_primary);
      if (!hasPrimary) {
        const mgr = (members ?? []).find((m: any) => m.member_function === "MANAGER")
                 ?? (members ?? []).find((m: any) => m.member_function === "LAWYER");
        if (mgr?.id) {
          await sb.from("lg_team_member").update({ is_primary: true }).eq("id", mgr.id);
        }
      }

      toast({ title: `Synced ${count} legal user${count === 1 ? "" : "s"}` });
      await refreshAll();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  }

  async function assignAllWorkbaskets() {
    setBusy("wb");
    try {
      const { data: team } = await sb.from("lg_team").select("id").eq("team_code", TARGET_TEAM_CODE).maybeSingle();
      if (!team?.id) throw new Error("Seed the team first.");

      // Remove duplicate ownership on other teams
      await sb.from("lg_team_workbasket")
        .delete()
        .in("workbasket_code", TARGET_WORKBASKETS.map((w) => w.code))
        .neq("team_id", team.id);

      const { data: existing } = await sb.from("lg_team_workbasket").select("id, workbasket_code, responsibility_type").eq("team_id", team.id);
      const byCode = new Map<string, any>();
      (existing ?? []).forEach((r: any) => {
        if (r.responsibility_type === "OWNER") byCode.set(r.workbasket_code, r);
      });

      let inserted = 0, updated = 0;
      for (const w of TARGET_WORKBASKETS) {
        const row = byCode.get(w.code);
        if (row) {
          await sb.from("lg_team_workbasket").update({
            responsibility_type: "OWNER",
            can_receive_new_cases: true,
            can_auto_assign: w.autoAssign,
            is_active: true,
          }).eq("id", row.id);
          updated += 1;
        } else {
          await sb.from("lg_team_workbasket").insert({
            team_id: team.id,
            workbasket_code: w.code,
            responsibility_type: "OWNER",
            can_receive_new_cases: true,
            can_auto_assign: w.autoAssign,
            is_active: true,
          });
          inserted += 1;
        }
      }
      toast({ title: `Workbaskets ready (${inserted} added, ${updated} updated)` });
      await refreshAll();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  }

  async function seedRoutingDefaults() {
    setBusy("routing");
    try {
      const { data: existing } = await sb.from("legal_complainant_settings").select("id").limit(1);
      const payload = {
        name: "SEED-SKN Legal Department",
        email: "legal@skn.gov.kn",
        department_name: "Legal Department",
        default_team_code: TARGET_TEAM_CODE,
        default_workbasket_code: "LEGAL_INTAKE_REVIEW",
        default_assignment_strategy: "BY_WORKLOAD",
        default_priority_code: "NORMAL",
        allow_manual_override: true,
        auto_assign_on_referral: true,
        auto_assign_on_manual_case: false,
        escalate_unassigned_days: 2,
      };
      if (existing && existing[0]?.id) {
        await sb.from("legal_complainant_settings").update(payload).eq("id", existing[0].id);
      } else {
        await sb.from("legal_complainant_settings").insert(payload);
      }
      toast({ title: "Routing defaults configured" });
      await refreshAll();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  }

  return (
    <Card className={allGood ? "border-emerald-300 bg-emerald-50/40" : "border-amber-300 bg-amber-50/30"}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Wand2 className="h-4 w-4" /> SKN Legal Setup Checklist
              {allGood && <Badge className="bg-emerald-600 hover:bg-emerald-600">Ready</Badge>}
            </CardTitle>
            <CardDescription>One-click configuration to make the SKN legal module fully testable.</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Validate Setup"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          {checks.map((c, i) => (
            <li key={i} className="flex items-center gap-2">
              {c.ok
                ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                : <XCircle className="h-4 w-4 text-amber-600 shrink-0" />}
              <span className={c.ok ? "" : "text-amber-900"}>{c.label}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={seedTeam} disabled={busy !== null} className="gap-1.5">
            {busy === "team" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Seed SKN Legal Team
          </Button>
          <Button size="sm" variant="outline" onClick={assignAllLegalUsers} disabled={busy !== null} className="gap-1.5">
            {busy === "users" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
            Assign All Legal Users
          </Button>
          <Button size="sm" variant="outline" onClick={assignAllWorkbaskets} disabled={busy !== null} className="gap-1.5">
            {busy === "wb" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Briefcase className="h-3.5 w-3.5" />}
            Assign All Workbaskets
          </Button>
          <Button size="sm" variant="outline" onClick={seedRoutingDefaults} disabled={busy !== null} className="gap-1.5">
            {busy === "routing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Settings2 className="h-3.5 w-3.5" />}
            Seed Routing Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
