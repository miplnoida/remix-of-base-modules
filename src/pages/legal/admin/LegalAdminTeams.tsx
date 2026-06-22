import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BackNavigation } from "@/components/ui/back-navigation";
import {
  Users, UserPlus, Trash2, ShieldAlert, Plus, Pencil, PowerOff, Star, Briefcase,
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
  type LgMemberFunction, type LgTeam,
  type LgTeamWorkbasket, type LgResponsibilityType,
} from "@/services/legal/lgTeamService";

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

  const [activeTeamId, setActiveTeamId] = useState<string | undefined>(undefined);
  const teamId = activeTeamId ?? teams.find((t) => t.is_default)?.id ?? teams[0]?.id;
  const team = teams.find((t) => t.id === teamId);
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
      } else {
        await createTeam({
          team_code: teamForm.team_code,
          team_name: teamForm.team_name,
          country_code: teamForm.country_code,
          manager_user_id: teamForm.manager_user_id || null,
          description: teamForm.description,
        });
        toast({ title: "Team created" });
      }
      setTeamDialog({ open: false });
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
  async function remove(id: string) {
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

  function openAddWb() {
    setWbForm(emptyWbForm);
    setWbDialog({ open: true });
  }
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
    // duplicate-active guard
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
        description: `This team already has an active ${wbForm.responsibility_type} role for ${wbForm.workbasket_code}.`,
        variant: "destructive",
      });
      return;
    }
    if (wbForm.can_auto_assign && lawyerCount === 0) {
      toast({
        title: "Cannot enable auto-assign",
        description: "Team has no member with Own Case capability.",
        variant: "destructive",
      });
      return;
    }
    const wbActive = wbCodes.find((w) => w.value_code === wbForm.workbasket_code)?.is_active ?? true;
    if (!wbActive) {
      toast({ title: "Workbasket is inactive", variant: "destructive" });
      return;
    }
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
    try {
      await deleteTeamWorkbasket(id);
      toast({ title: "Removed" });
      refreshAll();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  }
  async function toggleWbActive(row: LgTeamWorkbasket) {
    try {
      await setTeamWorkbasketActive(row.id, !row.is_active);
      refreshAll();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  }



  return (
    <div className="p-6 space-y-6">
      <BackNavigation />
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

      {/* Teams grid */}
      <Card>
        <CardHeader>
          <CardTitle>Teams</CardTitle>
          <CardDescription>Click a row to manage its members and capabilities.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead className="text-center">Members</TableHead>
                <TableHead className="text-center">Active Cases</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">No teams yet.</TableCell></TableRow>
              )}
              {teams.map((t) => {
                const memberCount = t.id === teamId ? members.length : undefined;
                const cases = caseCounts[t.team_code] ?? 0;
                const mgr = t.manager_user_id ? officerById[t.manager_user_id]?.full_name ?? "—" : "—";
                const selected = t.id === teamId;
                return (
                  <TableRow
                    key={t.id}
                    onClick={() => setActiveTeamId(t.id)}
                    className={`cursor-pointer ${selected ? "bg-muted/40" : ""}`}
                  >
                    <TableCell className="font-mono text-xs">{t.team_code}</TableCell>
                    <TableCell className="font-medium">
                      {t.team_name}{" "}
                      {t.is_default && <Badge variant="secondary" className="text-[10px] ml-1">Default</Badge>}
                    </TableCell>
                    <TableCell>{t.country_code}</TableCell>
                    <TableCell className="text-sm">{mgr}</TableCell>
                    <TableCell className="text-center">{memberCount ?? "—"}</TableCell>
                    <TableCell className="text-center">{cases}</TableCell>
                    <TableCell className="text-center">
                      {t.is_active
                        ? <Badge variant="default" className="text-[10px]">Active</Badge>
                        : <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEditTeam(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title={t.is_active ? "Deactivate" : "Activate"} onClick={() => toggleTeamActive(t)}>
                            <PowerOff className={`h-4 w-4 ${t.is_active ? "text-destructive" : ""}`} />
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

      {/* Selected team */}
      {team && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Members of {team.team_name}</CardTitle>
              <CardDescription>
                System roles are shown read-only. Capabilities below control operational responsibility inside this team only.
                {lawyerCount === 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-destructive">
                    <ShieldAlert className="h-3.5 w-3.5" /> No member can own cases — auto-assignment will block.
                  </span>
                )}
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
                  <TableRow><TableCell colSpan={12} className="text-center text-sm text-muted-foreground py-6">No members yet.</TableCell></TableRow>
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
                          <Button variant="ghost" size="icon" onClick={() => remove(m.id)}>
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
      )}

      {/* Assigned Workbaskets for selected team */}
      {team && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" /> Assigned Workbaskets — {team.team_name}</CardTitle>
              <CardDescription>
                Define which workbaskets this team owns, supports, reviews, or approves.
                {teamWbs.length === 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-destructive">
                    <ShieldAlert className="h-3.5 w-3.5" /> Team has no workbaskets — it will not receive cases.
                  </span>
                )}
              </CardDescription>
            </div>
            {canEdit && (
              <Button size="sm" className="gap-2" onClick={openAddWb}>
                <Plus className="h-4 w-4" /> Assign Workbasket
              </Button>
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
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-6">
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
      )}

      {/* Workbasket role map (read-only context) */}
      <Card>
        <CardHeader>
          <CardTitle>Workbasket Responsibilities</CardTitle>
          <CardDescription>Per-workbasket responsible and supporting roles. Configured in workflow rules; shown here for reference.</CardDescription>
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
