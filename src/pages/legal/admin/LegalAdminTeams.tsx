import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BackNavigation } from "@/components/ui/back-navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users, UserPlus, Trash2, ShieldAlert, Plus, Pencil, PowerOff, Star, Briefcase,
  Search, AlertTriangle, CheckCircle2, Activity, Settings2, Building2, BarChart3, Inbox,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  useLegalTeams, useLegalTeamMembers, useLegalWorkbasketRoles,
  useTeamActiveCaseCounts, useLegalTeamWorkbaskets, useLegalReferenceValues,
} from "@/hooks/legal/useLegalTeams";
import { useLegalOfficers, type LegalOfficerOption } from "@/hooks/legal/useLegalOfficers";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import {
  addTeamMember, updateTeamMember, deleteTeamMember, setPrimaryMember,
  createTeam, updateTeam, setTeamActive,
  capabilityDefaults, suggestFromRoles,
  upsertTeamWorkbasket, deleteTeamWorkbasket, setTeamWorkbasketActive,
  listAllTeamWorkbaskets,
  type LgMemberFunction, type LgTeam,
  type LgTeamWorkbasket, type LgResponsibilityType,
} from "@/services/legal/lgTeamService";
import { useQuery } from "@tanstack/react-query";
import { SknSetupCard } from "@/components/legal/admin/SknSetupCard";

const RESPONSIBILITY_TYPES: LgResponsibilityType[] = ["OWNER", "SUPPORT", "REVIEW", "APPROVAL"];
const FUNCTIONS: LgMemberFunction[] = ["LAWYER", "MANAGER", "SUPPORT", "CLERK", "ADMIN"];

const CAP_FIELDS: Array<{ key: keyof ReturnType<typeof capabilityDefaults>; label: string }> = [
  { key: "can_own_case",          label: "Own Case" },
  { key: "can_prepare_documents", label: "Prepare Docs" },
  { key: "can_schedule_hearing",  label: "Schedule Hearing" },
  { key: "can_post_fee",          label: "Post Fee" },
  { key: "can_generate_notice",   label: "Generate Notice" },
  { key: "can_approve",           label: "Approve" },
];

export default function LegalAdminTeams() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const access = useLgAccess();
  const canEdit = access.isAdmin || access.roleTypes.includes("LG_ADMIN");

  const { data: teams = [] } = useLegalTeams();
  const { data: officers = [] } = useLegalOfficers();
  const { data: caseCounts = {} } = useTeamActiveCaseCounts();
  const { data: wbRoles = [] } = useLegalWorkbasketRoles();
  const { data: wbCodes = [] } = useLegalReferenceValues("LG_WORKBASKET");
  const { data: stageCodes = [] } = useLegalReferenceValues("LG_CASE_STAGE");
  const { data: caseTypeCodes = [] } = useLegalReferenceValues("LG_CASE_TYPE");

  // All team workbasket rows (for unmapped-workbasket detection)
  const { data: allTeamWbs = [] } = useQuery({
    queryKey: ["lg_team_workbasket", "all"],
    queryFn: listAllTeamWorkbaskets,
    staleTime: 60_000,
  });

  const [activeTeamId, setActiveTeamId] = useState<string | undefined>(undefined);
  const [teamSearch, setTeamSearch] = useState("");
  const [tab, setTab] = useState("overview");

  // Auto-select first active (or default) team once teams load
  useEffect(() => {
    if (activeTeamId) return;
    if (!teams.length) return;
    const def = teams.find((t) => t.is_default && t.is_active);
    const firstActive = teams.find((t) => t.is_active);
    setActiveTeamId(def?.id ?? firstActive?.id ?? teams[0].id);
  }, [teams, activeTeamId]);

  const filteredTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((t) =>
      t.team_name.toLowerCase().includes(q) || t.team_code.toLowerCase().includes(q),
    );
  }, [teams, teamSearch]);

  const team = teams.find((t) => t.id === activeTeamId);
  const teamId = team?.id;
  const { data: members = [] } = useLegalTeamMembers(teamId);
  const { data: teamWbs = [] } = useLegalTeamWorkbaskets(teamId);

  const officerById = useMemo(() => {
    const m: Record<string, LegalOfficerOption> = {};
    officers.forEach((o) => { m[o.user_id] = o; });
    return m;
  }, [officers]);

  const usedUserIds = useMemo(() => new Set(members.map((m) => m.user_id)), [members]);
  const availableOfficers = officers.filter((o) => !usedUserIds.has(o.user_id));
  const lawyerCount = members.filter((m) => m.is_active && m.can_own_case).length;

  /* ---------------- Summary metrics ---------------- */
  const summary = useMemo(() => {
    const totalTeams = teams.length;
    const activeTeams = teams.filter((t) => t.is_active).length;
    // legal officers = any officer with LEGAL_OFFICER or SENIOR_LEGAL_OFFICER
    const officerCount = officers.filter((o) =>
      o.roles.some((r) => /LEGAL_OFFICER|SENIOR_LEGAL_OFFICER|LegalOfficer/.test(r)),
    ).length;
    const supportCount = officers.filter((o) =>
      o.roles.some((r) => /LEGAL_READ_ONLY|SUPPORT|CLERK/i.test(r)),
    ).length;
    const mappedWb = new Set(allTeamWbs.filter((w) => w.is_active).map((w) => w.workbasket_code));
    const unmappedWb = wbCodes.filter((w) => w.is_active && !mappedWb.has(w.value_code)).length;
    return { totalTeams, activeTeams, officerCount, supportCount, unmappedWb };
  }, [teams, officers, allTeamWbs, wbCodes]);

  /* ---------------- Validation warnings ---------------- */
  const warnings = useMemo(() => {
    const w: string[] = [];
    if (!team) return w;
    if (members.length === 0) w.push("Team has no members.");
    if (members.length > 0 && lawyerCount === 0) w.push("Team has no member with Case Ownership capability.");
    if (teamWbs.length === 0) w.push("Team has no workbasket assigned — it will not receive cases.");
    teamWbs.forEach((tw) => {
      if (tw.is_active && tw.can_auto_assign && lawyerCount === 0) {
        w.push(`Auto-assign enabled on ${tw.workbasket_code} but no eligible case owner.`);
      }
    });
    if (team.is_default) {
      const mapped = teamWbs.some((tw) => tw.is_active);
      if (!mapped) w.push("Default team has no workbasket mapped.");
    }
    return w;
  }, [team, members, teamWbs, lawyerCount]);

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["lg_team"] });
    qc.invalidateQueries({ queryKey: ["lg_team_member"] });
    qc.invalidateQueries({ queryKey: ["lg_team_active_case_counts"] });
    qc.invalidateQueries({ queryKey: ["lg_team_workbasket"] });
  };

  /* ---------------- team dialog state ---------------- */
  const [teamDialog, setTeamDialog] = useState<{ open: boolean; editing?: LgTeam }>({ open: false });
  const [teamForm, setTeamForm] = useState({
    team_code: "", team_name: "", country_code: "SKN",
    manager_user_id: "" as string, description: "",
  });

  function openCreateTeam() {
    setTeamForm({ team_code: "", team_name: "", country_code: "SKN", manager_user_id: "", description: "" });
    setTeamDialog({ open: true });
  }
  function openEditTeam(t: LgTeam) {
    setTeamForm({
      team_code: t.team_code, team_name: t.team_name,
      country_code: t.country_code ?? "SKN",
      manager_user_id: t.manager_user_id ?? "",
      description: t.description ?? "",
    });
    setTeamDialog({ open: true, editing: t });
  }
  async function saveTeam() {
    try {
      if (!teamForm.team_code.trim() || !teamForm.team_name.trim()) {
        toast({ title: "Team code and name are required", variant: "destructive" });
        return;
      }
      if (teamDialog.editing) {
        await updateTeam(teamDialog.editing.id, {
          team_name: teamForm.team_name.trim(),
          country_code: teamForm.country_code.toUpperCase(),
          manager_user_id: teamForm.manager_user_id || null,
          description: teamForm.description || null,
        });
        toast({ title: "Team updated" });
        setTeamDialog({ open: false });
      } else {
        const created = await createTeam({
          team_code: teamForm.team_code,
          team_name: teamForm.team_name,
          country_code: teamForm.country_code,
          manager_user_id: teamForm.manager_user_id || null,
          description: teamForm.description,
        });
        toast({ title: "Team created" });
        setTeamDialog({ open: false });
        if (created?.id) setActiveTeamId(created.id);
        setTab("members");
      }
      refreshAll();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  }
  async function toggleTeamActive(t: LgTeam) {
    if (t.is_active && (caseCounts[t.team_code] ?? 0) > 0) {
      toast({ title: "Cannot deactivate", description: "Team has active cases assigned.", variant: "destructive" });
      return;
    }
    if (!confirm(`${t.is_active ? "Deactivate" : "Activate"} team "${t.team_name}"?`)) return;
    try {
      await setTeamActive(t.id, !t.is_active);
      toast({ title: t.is_active ? "Team deactivated" : "Team activated" });
      refreshAll();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  }

  /* ---------------- quick-setup ---------------- */
  async function quickCreateGeneralTeam() {
    try {
      const created = await createTeam({
        team_code: "GENERAL_LEGAL",
        team_name: "General Legal Team",
        country_code: "SKN",
        description: "Default operational team for legal work.",
      });
      toast({ title: "General Legal Team created" });
      if (created?.id) setActiveTeamId(created.id);
      setTab("members");
      refreshAll();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  }
  async function quickAssignAllWorkbaskets() {
    if (!teamId) { toast({ title: "Select a team first", variant: "destructive" }); return; }
    try {
      const existing = new Set(teamWbs.filter((w) => w.is_active).map((w) => w.workbasket_code));
      const toAssign = wbCodes.filter((w) => w.is_active && !existing.has(w.value_code));
      for (const w of toAssign) {
        await upsertTeamWorkbasket({
          team_id: teamId,
          workbasket_code: w.value_code,
          responsibility_type: "OWNER",
          can_receive_new_cases: true,
          can_auto_assign: false,
        });
      }
      toast({ title: `Assigned ${toAssign.length} workbasket(s)` });
      refreshAll();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  }

  /* ---------------- add-member dialog ---------------- */
  const [memDialog, setMemDialog] = useState(false);
  const [memUserId, setMemUserId] = useState("");
  const [memFn, setMemFn] = useState<LgMemberFunction>("LAWYER");
  const [memCaps, setMemCaps] = useState(capabilityDefaults("LAWYER"));
  const [memPrimary, setMemPrimary] = useState(false);
  const [memFrom, setMemFrom] = useState("");
  const [memTo, setMemTo] = useState("");
  const selectedOfficer = officerById[memUserId];

  function openAddMember() {
    setMemUserId(""); setMemFn("LAWYER"); setMemCaps(capabilityDefaults("LAWYER"));
    setMemPrimary(false); setMemFrom(""); setMemTo("");
    setMemDialog(true);
  }
  function onSelectMemUser(uid: string) {
    setMemUserId(uid);
    const o = officerById[uid];
    if (o) {
      const s = suggestFromRoles(o.roles);
      setMemFn(s.fn);
      setMemCaps(s.caps);
    }
  }
  function onChangeMemFn(fn: LgMemberFunction) {
    setMemFn(fn);
    setMemCaps(capabilityDefaults(fn));
  }
  async function submitAddMember() {
    if (!teamId || !memUserId) return;
    const o = officerById[memUserId];
    if (!o) { toast({ title: "User has no Legal role", variant: "destructive" }); return; }
    if (!o.roles.length) { toast({ title: "User must have a Legal role assigned in Security", variant: "destructive" }); return; }
    try {
      const member = await addTeamMember({
        team_id: teamId,
        user_id: memUserId,
        member_function: memFn,
        role_snapshot: o.roles[0] ?? null,
        capabilities: memCaps,
        effective_from: memFrom || null,
        effective_to: memTo || null,
      });
      if (memPrimary && member) await setPrimaryMember(teamId, member.id);
      toast({ title: "Member added" });
      setMemDialog(false);
      refreshAll();
    } catch (e: any) {
      toast({ title: "Add failed", description: e.message, variant: "destructive" });
    }
  }

  async function patch(id: string, body: any) {
    try { await updateTeamMember(id, body); refreshAll(); }
    catch (e: any) { toast({ title: "Update failed", description: e.message, variant: "destructive" }); }
  }
  async function makePrimary(id: string) {
    if (!teamId) return;
    try { await setPrimaryMember(teamId, id); toast({ title: "Primary owner updated" }); refreshAll(); }
    catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  }
  async function removeMember(id: string) {
    if (!confirm("Remove this member from the team?")) return;
    try { await deleteTeamMember(id); toast({ title: "Removed" }); refreshAll(); }
    catch (e: any) { toast({ title: "Delete failed", description: e.message, variant: "destructive" }); }
  }

  /* ---------------- workbasket-assignment dialog ---------------- */
  type WbForm = {
    id?: string;
    workbasket_code: string;
    responsibility_type: LgResponsibilityType;
    can_receive_new_cases: boolean;
    can_auto_assign: boolean;
    default_for_stage: string;
    default_for_case_type: string;
    escalation_target: boolean;
    is_active: boolean;
  };
  const emptyWbForm: WbForm = {
    workbasket_code: "",
    responsibility_type: "OWNER",
    can_receive_new_cases: true,
    can_auto_assign: false,
    default_for_stage: "",
    default_for_case_type: "",
    escalation_target: false,
    is_active: true,
  };
  const [wbDialog, setWbDialog] = useState<{ open: boolean; editing?: LgTeamWorkbasket }>({ open: false });
  const [wbForm, setWbForm] = useState<WbForm>(emptyWbForm);

  function openAddWb() { setWbForm(emptyWbForm); setWbDialog({ open: true }); }
  function openEditWb(row: LgTeamWorkbasket) {
    setWbForm({
      id: row.id,
      workbasket_code: row.workbasket_code,
      responsibility_type: row.responsibility_type,
      can_receive_new_cases: row.can_receive_new_cases,
      can_auto_assign: row.can_auto_assign,
      default_for_stage: row.default_for_stage ?? "",
      default_for_case_type: row.default_for_case_type ?? "",
      escalation_target: row.escalation_target,
      is_active: row.is_active,
    });
    setWbDialog({ open: true, editing: row });
  }
  async function saveWb() {
    if (!teamId) return;
    if (!wbForm.workbasket_code) {
      toast({ title: "Pick a workbasket", variant: "destructive" });
      return;
    }
    const dup = teamWbs.find(
      (w) =>
        w.id !== wbForm.id &&
        w.is_active &&
        w.workbasket_code === wbForm.workbasket_code &&
        w.responsibility_type === wbForm.responsibility_type,
    );
    if (dup && wbForm.is_active) {
      toast({
        title: "Duplicate assignment",
        description: `Active ${wbForm.responsibility_type} role for ${wbForm.workbasket_code} already exists.`,
        variant: "destructive",
      });
      return;
    }
    if (wbForm.can_auto_assign && lawyerCount === 0) {
      toast({ title: "Cannot enable auto-assign", description: "No member with Own Case capability.", variant: "destructive" });
      return;
    }
    const wbActive = wbCodes.find((w) => w.value_code === wbForm.workbasket_code)?.is_active ?? true;
    if (!wbActive) { toast({ title: "Workbasket is inactive", variant: "destructive" }); return; }
    try {
      await upsertTeamWorkbasket({
        id: wbForm.id,
        team_id: teamId,
        workbasket_code: wbForm.workbasket_code,
        responsibility_type: wbForm.responsibility_type,
        can_receive_new_cases: wbForm.can_receive_new_cases,
        can_auto_assign: wbForm.can_auto_assign,
        default_for_stage: wbForm.default_for_stage || null,
        default_for_case_type: wbForm.default_for_case_type || null,
        escalation_target: wbForm.escalation_target,
        is_active: wbForm.is_active,
      });
      toast({ title: wbForm.id ? "Assignment updated" : "Workbasket assigned" });
      setWbDialog({ open: false });
      refreshAll();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  }
  async function removeWb(id: string) {
    if (!confirm("Remove this workbasket assignment?")) return;
    try { await deleteTeamWorkbasket(id); toast({ title: "Removed" }); refreshAll(); }
    catch (e: any) { toast({ title: "Delete failed", description: e.message, variant: "destructive" }); }
  }
  async function toggleWbActive(row: LgTeamWorkbasket) {
    try { await setTeamWorkbasketActive(row.id, !row.is_active); refreshAll(); }
    catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  }

  /* ============================= UI ============================= */

  return (
    <div className="p-6 space-y-5">
      <BackNavigation />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Legal Admin — Teams & Staff</h1>
            <p className="text-sm text-muted-foreground">
              Define operational responsibility. System roles are managed in Security → User Management and shown here read-only.
            </p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={openCreateTeam} className="gap-2"><Plus className="h-4 w-4" /> Add Team</Button>
        )}
      </div>

      {!canEdit && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <ShieldAlert className="h-4 w-4" /> View-only — only LEGAL_ADMIN can change teams.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard icon={<Building2 className="h-4 w-4" />} label="Total Teams" value={summary.totalTeams} />
        <SummaryCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Active Teams" value={summary.activeTeams} />
        <SummaryCard icon={<Users className="h-4 w-4" />} label="Legal Officers" value={summary.officerCount} />
        <SummaryCard icon={<UserPlus className="h-4 w-4" />} label="Support Staff" value={summary.supportCount} />
        <SummaryCard
          icon={<Inbox className={`h-4 w-4 ${summary.unmappedWb > 0 ? "text-destructive" : ""}`} />}
          label="Unmapped Workbaskets"
          value={summary.unmappedWb}
          highlight={summary.unmappedWb > 0}
        />
      </div>

      {/* Master-detail */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left: teams list */}
        <Card className="col-span-12 lg:col-span-4 xl:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Teams</CardTitle>
              {canEdit && (
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={openCreateTeam}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              )}
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search teams…"
                className="h-8 pl-7 text-xs"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[520px]">
              <div className="px-2 pb-2 space-y-1">
                {filteredTeams.length === 0 && (
                  <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                    {teams.length === 0 ? "No teams yet." : "No matches."}
                  </div>
                )}
                {filteredTeams.map((t) => {
                  const selected = t.id === teamId;
                  const cases = caseCounts[t.team_code] ?? 0;
                  const mgr = t.manager_user_id ? officerById[t.manager_user_id]?.full_name : null;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTeamId(t.id)}
                      className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
                        selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                          : "border-transparent hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-medium truncate text-sm">{t.team_name}</span>
                          {t.is_default && <Badge variant="secondary" className="text-[9px] h-4 px-1">Default</Badge>}
                        </div>
                        {!t.is_active && <Badge variant="outline" className="text-[9px] h-4 px-1">Off</Badge>}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-mono">{t.team_code}</span>
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />{cases}
                        </span>
                      </div>
                      {mgr && <div className="mt-0.5 text-[10px] text-muted-foreground truncate">Mgr: {mgr}</div>}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right: workspace */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-4">
          {!team ? (
            <Card>
              <CardContent className="py-16 flex flex-col items-center text-center gap-4">
                <Users className="h-10 w-10 text-muted-foreground" />
                <div>
                  <div className="font-medium">Select a team</div>
                  <div className="text-sm text-muted-foreground">
                    Pick a team on the left to manage members, workbaskets, and workload.
                  </div>
                </div>
                {canEdit && teams.length === 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button onClick={quickCreateGeneralTeam} className="gap-2">
                      <Plus className="h-4 w-4" /> Create General Legal Team
                    </Button>
                    <Button variant="outline" onClick={openCreateTeam} className="gap-2">
                      <Plus className="h-4 w-4" /> Add Custom Team
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Team header strip */}
              <Card>
                <CardContent className="py-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">{team.team_name}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">{team.team_code}</Badge>
                        {team.is_default && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                        {team.is_active
                          ? <Badge className="text-[10px]">Active</Badge>
                          : <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {team.country_code} ·{" "}
                        {team.manager_user_id ? `Manager: ${officerById[team.manager_user_id]?.full_name ?? "—"}` : "No manager assigned"}
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => openEditTeam(team)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => toggleTeamActive(team)}>
                        <PowerOff className="h-3.5 w-3.5" />
                        {team.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Validation panel */}
              {warnings.length > 0 && (
                <Card className="border-amber-300 bg-amber-50/50">
                  <CardContent className="py-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-xs font-medium text-amber-900">Setup warnings</div>
                        <ul className="mt-1 text-xs text-amber-900 list-disc list-inside space-y-0.5">
                          {warnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tabs */}
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="grid grid-cols-5 w-full max-w-2xl">
                  <TabsTrigger value="overview" className="gap-1"><Building2 className="h-3.5 w-3.5" />Overview</TabsTrigger>
                  <TabsTrigger value="members" className="gap-1"><Users className="h-3.5 w-3.5" />Members</TabsTrigger>
                  <TabsTrigger value="workbaskets" className="gap-1"><Briefcase className="h-3.5 w-3.5" />Workbaskets</TabsTrigger>
                  <TabsTrigger value="rules" className="gap-1"><Settings2 className="h-3.5 w-3.5" />Rules</TabsTrigger>
                  <TabsTrigger value="workload" className="gap-1"><BarChart3 className="h-3.5 w-3.5" />Workload</TabsTrigger>
                </TabsList>

                {/* ---------- Overview ---------- */}
                <TabsContent value="overview" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Overview</CardTitle>
                      <CardDescription>Snapshot of the selected team.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <OverviewStat label="Members" value={members.length} />
                      <OverviewStat label="Case Owners" value={lawyerCount} />
                      <OverviewStat label="Workbaskets" value={teamWbs.filter((w) => w.is_active).length} />
                      <OverviewStat label="Active Cases" value={caseCounts[team.team_code] ?? 0} />
                      <div className="col-span-2 md:col-span-4">
                        <div className="text-xs text-muted-foreground mb-1">Description</div>
                        <div className="text-sm rounded-md border p-3 bg-muted/30 min-h-[60px]">
                          {team.description || <span className="text-muted-foreground italic">No description.</span>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ---------- Members ---------- */}
                <TabsContent value="members" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">Members</CardTitle>
                        <CardDescription>
                          System roles are read-only from Security. Capabilities control operational responsibility within this team only.
                        </CardDescription>
                      </div>
                      {canEdit && (
                        <Button size="sm" className="gap-2" onClick={openAddMember}>
                          <UserPlus className="h-4 w-4" /> Add Member
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>System Roles</TableHead>
                            <TableHead>Function</TableHead>
                            {CAP_FIELDS.map((c) => <TableHead key={c.key} className="text-center">{c.label}</TableHead>)}
                            <TableHead className="text-center">Primary</TableHead>
                            <TableHead className="text-center">Active</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {members.length === 0 && (
                            <TableRow><TableCell colSpan={12} className="text-center text-sm text-muted-foreground py-8">
                              No members yet. Click <strong>Add Member</strong> to assign existing system users.
                            </TableCell></TableRow>
                          )}
                          {members.map((m) => {
                            const o = officerById[m.user_id];
                            return (
                              <TableRow key={m.id}>
                                <TableCell>
                                  <div className="font-medium">{o?.full_name ?? m.user_id.slice(0, 8)}</div>
                                  <div className="text-[11px] text-muted-foreground">{o?.user_code ?? ""}</div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {(o?.roles ?? []).map((r) => (
                                      <Badge key={r} variant="outline" className="text-[10px] font-mono">{r}</Badge>
                                    ))}
                                    {(!o || !o.roles.length) && <span className="text-xs text-muted-foreground">—</span>}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={m.member_function}
                                    disabled={!canEdit}
                                    onValueChange={(v) => patch(m.id, { member_function: v, ...capabilityDefaults(v as LgMemberFunction) })}
                                  >
                                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                                    <SelectContent>{FUNCTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                                  </Select>
                                </TableCell>
                                {CAP_FIELDS.map((c) => (
                                  <TableCell key={c.key} className="text-center">
                                    <Switch
                                      checked={!!(m as any)[c.key]}
                                      disabled={!canEdit}
                                      onCheckedChange={(v) => patch(m.id, { [c.key]: v })}
                                    />
                                  </TableCell>
                                ))}
                                <TableCell className="text-center">
                                  <Button
                                    variant="ghost" size="icon"
                                    disabled={!canEdit || m.is_primary}
                                    onClick={() => makePrimary(m.id)}
                                    title={m.is_primary ? "Primary owner" : "Set as primary"}
                                  >
                                    <Star className={`h-4 w-4 ${m.is_primary ? "fill-amber-400 text-amber-500" : "text-muted-foreground"}`} />
                                  </Button>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Switch checked={m.is_active} disabled={!canEdit} onCheckedChange={(v) => patch(m.id, { is_active: v })} />
                                </TableCell>
                                <TableCell className="text-right">
                                  {canEdit && (
                                    <Button variant="ghost" size="icon" onClick={() => removeMember(m.id)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ---------- Workbaskets ---------- */}
                <TabsContent value="workbaskets" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-primary" /> Assigned Workbaskets
                        </CardTitle>
                        <CardDescription>
                          Which workbaskets this team owns, supports, reviews, or approves.
                        </CardDescription>
                      </div>
                      {canEdit && (
                        <div className="flex gap-2">
                          {teamWbs.length === 0 && summary.unmappedWb > 0 && team.is_default && (
                            <Button size="sm" variant="outline" onClick={quickAssignAllWorkbaskets}>
                              Assign All
                            </Button>
                          )}
                          <Button size="sm" className="gap-2" onClick={openAddWb}>
                            <Plus className="h-4 w-4" /> Assign Workbasket
                          </Button>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Workbasket</TableHead>
                            <TableHead>Responsibility</TableHead>
                            <TableHead className="text-center">Receive New</TableHead>
                            <TableHead className="text-center">Auto Assign</TableHead>
                            <TableHead>Default for Stage</TableHead>
                            <TableHead>Default for Case Type</TableHead>
                            <TableHead className="text-center">Escalation</TableHead>
                            <TableHead className="text-center">Active</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamWbs.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                                No workbaskets assigned yet.
                              </TableCell>
                            </TableRow>
                          )}
                          {teamWbs.map((w) => {
                            const label = wbCodes.find((c) => c.value_code === w.workbasket_code)?.value_label ?? w.workbasket_code;
                            return (
                              <TableRow key={w.id}>
                                <TableCell>
                                  <div className="font-medium">{label}</div>
                                  <div className="text-[11px] font-mono text-muted-foreground">{w.workbasket_code}</div>
                                </TableCell>
                                <TableCell><Badge variant="outline" className="text-[10px]">{w.responsibility_type}</Badge></TableCell>
                                <TableCell className="text-center">{w.can_receive_new_cases ? "✓" : "—"}</TableCell>
                                <TableCell className="text-center">{w.can_auto_assign ? "✓" : "—"}</TableCell>
                                <TableCell className="text-xs">{w.default_for_stage ?? "—"}</TableCell>
                                <TableCell className="text-xs">{w.default_for_case_type ?? "—"}</TableCell>
                                <TableCell className="text-center">{w.escalation_target ? "✓" : "—"}</TableCell>
                                <TableCell className="text-center">
                                  <Switch checked={w.is_active} disabled={!canEdit} onCheckedChange={() => toggleWbActive(w)} />
                                </TableCell>
                                <TableCell className="text-right">
                                  {canEdit && (
                                    <div className="flex justify-end gap-1">
                                      <Button variant="ghost" size="icon" title="Edit" onClick={() => openEditWb(w)}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" title="Remove" onClick={() => removeWb(w.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Workbasket Responsibilities (Reference)</CardTitle>
                      <CardDescription>Per-workbasket responsible and supporting roles from workflow rules.</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead>Workbasket</TableHead><TableHead>Owning Team</TableHead>
                          <TableHead>Responsible Role</TableHead><TableHead>Support Role</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {wbRoles.map((w) => (
                            <TableRow key={w.id}>
                              <TableCell className="font-medium">{w.workbasket_code}</TableCell>
                              <TableCell>{w.owning_team_code ?? "—"}</TableCell>
                              <TableCell>{w.responsible_role_code ?? "—"}</TableCell>
                              <TableCell>{w.support_role_code ?? "—"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{w.description ?? ""}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ---------- Assignment Rules ---------- */}
                <TabsContent value="rules" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Assignment Rules</CardTitle>
                      <CardDescription>
                        Team-level overrides. Blank values inherit the Legal Admin global routing policy.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                      <div className="rounded-md border p-4 bg-muted/30">
                        <div className="font-medium text-foreground mb-2">Inherited policy</div>
                        <ul className="text-xs space-y-1 list-disc list-inside">
                          <li>Assignment strategy: <strong>round-robin among case owners</strong></li>
                          <li>Max active cases per lawyer: <strong>—</strong> (no team override)</li>
                          <li>Allow support task assignment: <strong>yes</strong></li>
                          <li>Manager approval required: <strong>no</strong></li>
                          <li>Escalation after: <strong>global default</strong></li>
                        </ul>
                      </div>
                      <div className="text-xs">
                        Team-level overrides are managed in Legal Admin → Routing & Assignment. Open that screen to change global policy that applies to this team.
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ---------- Workload ---------- */}
                <TabsContent value="workload" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Workload</CardTitle>
                      <CardDescription>Operational load for {team.team_name}.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <OverviewStat label="Open Cases (team)" value={caseCounts[team.team_code] ?? 0} />
                      <OverviewStat label="Case Owners" value={lawyerCount} />
                      <OverviewStat
                        label="Avg Cases / Owner"
                        value={lawyerCount > 0 ? Math.round((caseCounts[team.team_code] ?? 0) / lawyerCount) : 0}
                      />
                      <OverviewStat label="Active Members" value={members.filter((m) => m.is_active).length} />
                      <div className="col-span-2 md:col-span-4 text-xs text-muted-foreground">
                        Per-officer breakdown, overdue tasks and hearings-this-week are surfaced on the Legal Dashboard.
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>

      {/* ---------------- Team dialog ---------------- */}
      <Dialog open={teamDialog.open} onOpenChange={(o) => setTeamDialog({ open: o, editing: o ? teamDialog.editing : undefined })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{teamDialog.editing ? "Edit Team" : "Add Team"}</DialogTitle>
            <DialogDescription>Operational team for organizing legal work.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Team Code</Label>
                <Input
                  value={teamForm.team_code}
                  disabled={!!teamDialog.editing}
                  onChange={(e) => setTeamForm({ ...teamForm, team_code: e.target.value.toUpperCase() })}
                  placeholder="e.g. LITIGATION"
                />
              </div>
              <div>
                <Label>Country Code</Label>
                <Input
                  value={teamForm.country_code}
                  onChange={(e) => setTeamForm({ ...teamForm, country_code: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
            <div>
              <Label>Team Name</Label>
              <Input value={teamForm.team_name} onChange={(e) => setTeamForm({ ...teamForm, team_name: e.target.value })} />
            </div>
            <div>
              <Label>Manager</Label>
              <Select
                value={teamForm.manager_user_id || "__none"}
                onValueChange={(v) => setTeamForm({ ...teamForm, manager_user_id: v === "__none" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Select manager…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— None —</SelectItem>
                  {officers.map((o) => (
                    <SelectItem key={o.user_id} value={o.user_id}>
                      {o.full_name}{o.user_code ? ` · ${o.user_code}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">Only users with a Legal role from Security are listed.</p>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={teamForm.description}
                onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamDialog({ open: false })}>Cancel</Button>
            <Button onClick={saveTeam}>{teamDialog.editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Add member dialog ---------------- */}
      <Dialog open={memDialog} onOpenChange={setMemDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Member to {team?.team_name}</DialogTitle>
            <DialogDescription>
              Select an existing user with a Legal system role. Roles cannot be changed here — manage them in Security → User Management.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>User</Label>
              <Select value={memUserId} onValueChange={onSelectMemUser}>
                <SelectTrigger><SelectValue placeholder="Select user…" /></SelectTrigger>
                <SelectContent>
                  {availableOfficers.length === 0 && <SelectItem value="__none" disabled>No eligible users left</SelectItem>}
                  {availableOfficers.map((o) => (
                    <SelectItem key={o.user_id} value={o.user_id}>
                      {o.full_name}{o.user_code ? ` · ${o.user_code}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedOfficer && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground mr-1">System roles:</span>
                  {selectedOfficer.roles.map((r) => (
                    <Badge key={r} variant="outline" className="text-[10px] font-mono">{r}</Badge>
                  ))}
                  {!selectedOfficer.roles.length && (
                    <span className="text-xs text-destructive">No legal role assigned</span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Team Function</Label>
                <Select value={memFn} onValueChange={(v) => onChangeMemFn(v as LgMemberFunction)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FUNCTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Switch id="primary" checked={memPrimary} onCheckedChange={setMemPrimary} />
                <Label htmlFor="primary" className="cursor-pointer">Set as primary owner</Label>
              </div>
            </div>

            <div>
              <Label>Capabilities</Label>
              <div className="grid grid-cols-2 gap-2 mt-1 rounded-md border p-3">
                {CAP_FIELDS.map((c) => (
                  <div key={c.key} className="flex items-center justify-between text-sm">
                    <span>{c.label}</span>
                    <Switch
                      checked={!!(memCaps as any)[c.key]}
                      onCheckedChange={(v) => setMemCaps({ ...memCaps, [c.key]: v })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Effective From</Label>
                <Input type="date" value={memFrom} onChange={(e) => setMemFrom(e.target.value)} />
              </div>
              <div>
                <Label>Effective To</Label>
                <Input type="date" value={memTo} onChange={(e) => setMemTo(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemDialog(false)}>Cancel</Button>
            <Button onClick={submitAddMember} disabled={!memUserId || !(selectedOfficer?.roles.length)}>Add Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Assign Workbasket dialog ---------------- */}
      <Dialog open={wbDialog.open} onOpenChange={(o) => setWbDialog({ open: o, editing: o ? wbDialog.editing : undefined })}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{wbDialog.editing ? "Edit Workbasket Assignment" : "Assign Workbasket"}</DialogTitle>
            <DialogDescription>
              Configure how {team?.team_name} handles cases from this workbasket.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Workbasket</Label>
                <Select
                  value={wbForm.workbasket_code}
                  onValueChange={(v) => setWbForm({ ...wbForm, workbasket_code: v })}
                  disabled={!!wbDialog.editing}
                >
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {wbCodes.map((w) => (
                      <SelectItem key={w.value_code} value={w.value_code}>{w.value_label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Responsibility</Label>
                <Select
                  value={wbForm.responsibility_type}
                  onValueChange={(v) => setWbForm({ ...wbForm, responsibility_type: v as LgResponsibilityType })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RESPONSIBILITY_TYPES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Default for Stage (optional)</Label>
                <Select
                  value={wbForm.default_for_stage || "__none"}
                  onValueChange={(v) => setWbForm({ ...wbForm, default_for_stage: v === "__none" ? "" : v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Any —</SelectItem>
                    {stageCodes.map((s) => <SelectItem key={s.value_code} value={s.value_code}>{s.value_label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Default for Case Type (optional)</Label>
                <Select
                  value={wbForm.default_for_case_type || "__none"}
                  onValueChange={(v) => setWbForm({ ...wbForm, default_for_case_type: v === "__none" ? "" : v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Any —</SelectItem>
                    {caseTypeCodes.map((s) => <SelectItem key={s.value_code} value={s.value_code}>{s.value_label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Receive New Cases</span>
                <Switch checked={wbForm.can_receive_new_cases} onCheckedChange={(v) => setWbForm({ ...wbForm, can_receive_new_cases: v })} />
              </div>
              <div className="flex items-center justify-between">
                <span>Auto Assign</span>
                <Switch checked={wbForm.can_auto_assign} onCheckedChange={(v) => setWbForm({ ...wbForm, can_auto_assign: v })} />
              </div>
              <div className="flex items-center justify-between">
                <span>Escalation Target</span>
                <Switch checked={wbForm.escalation_target} onCheckedChange={(v) => setWbForm({ ...wbForm, escalation_target: v })} />
              </div>
              <div className="flex items-center justify-between">
                <span>Active</span>
                <Switch checked={wbForm.is_active} onCheckedChange={(v) => setWbForm({ ...wbForm, is_active: v })} />
              </div>
            </div>

            {wbForm.can_auto_assign && lawyerCount === 0 && (
              <div className="text-xs text-destructive flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" /> Auto-assign requires a team member with Own Case capability.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWbDialog({ open: false })}>Cancel</Button>
            <Button onClick={saveWb}>{wbDialog.editing ? "Save" : "Assign"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: number; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-destructive/40" : ""}>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}<span>{label}</span>
        </div>
        <div className={`mt-1 text-2xl font-bold ${highlight ? "text-destructive" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function OverviewStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border p-3 bg-muted/20">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-0.5">{value}</div>
    </div>
  );
}
