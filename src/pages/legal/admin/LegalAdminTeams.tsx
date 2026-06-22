import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BackNavigation } from "@/components/ui/back-navigation";
import { Users, UserPlus, Trash2, ShieldAlert, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLegalTeams, useLegalTeamMembers, useLegalWorkbasketRoles } from "@/hooks/legal/useLegalTeams";
import { useLegalOfficers } from "@/hooks/legal/useLegalOfficers";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import {
  upsertTeamMember, updateTeamMember, deleteTeamMember,
  capabilityDefaults, type LgMemberFunction,
} from "@/services/legal/lgTeamService";

const FUNCTIONS: LgMemberFunction[] = ["LAWYER", "MANAGER", "SUPPORT", "CLERK", "ADMIN"];

const ROLE_CHOICES = [
  "LEGAL_MANAGER",
  "SENIOR_LEGAL_OFFICER",
  "LEGAL_OFFICER",
  "LEGAL_SUPPORT_STAFF",
  "LEGAL_CLERK",
  "LEGAL_ADMIN",
  "LEGAL_READ_ONLY",
];

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
  const [activeTeamId, setActiveTeamId] = useState<string | undefined>(undefined);
  const teamId = activeTeamId ?? teams.find((t) => t.is_default)?.id ?? teams[0]?.id;

  const { data: members = [] } = useLegalTeamMembers(teamId);
  const { data: officers = [] } = useLegalOfficers();
  const { data: wbRoles = [] } = useLegalWorkbasketRoles();

  const [addUserId, setAddUserId] = useState<string>("");
  const [addRole, setAddRole] = useState<string>("LEGAL_OFFICER");
  const [addFunction, setAddFunction] = useState<LgMemberFunction>("LAWYER");

  const usedUserIds = useMemo(() => new Set(members.map((m) => m.user_id)), [members]);
  const availableOfficers = officers.filter((o) => !usedUserIds.has(o.user_id));

  const lawyerCount = members.filter((m) => m.is_active && m.can_own_case).length;
  const supportCount = members.filter((m) => m.is_active && !m.can_own_case).length;

  const refresh = () => qc.invalidateQueries({ queryKey: ["lg_team_member"] });

  async function handleAdd() {
    if (!teamId || !addUserId) return;
    try {
      await upsertTeamMember({
        team_id: teamId, user_id: addUserId,
        role_code: addRole, member_function: addFunction, is_active: true,
      });
      setAddUserId("");
      toast({ title: "Member added" });
      refresh();
    } catch (e: any) { toast({ title: "Add failed", description: e.message, variant: "destructive" }); }
  }

  async function patch(id: string, body: any) {
    try { await updateTeamMember(id, body); refresh(); }
    catch (e: any) { toast({ title: "Update failed", description: e.message, variant: "destructive" }); }
  }

  async function remove(id: string) {
    if (!confirm("Remove this member from the team?")) return;
    try { await deleteTeamMember(id); toast({ title: "Removed" }); refresh(); }
    catch (e: any) { toast({ title: "Delete failed", description: e.message, variant: "destructive" }); }
  }

  const officerById = useMemo(() => {
    const m: Record<string, typeof officers[number]> = {};
    officers.forEach((o) => { m[o.user_id] = o; });
    return m;
  }, [officers]);

  return (
    <div className="p-6 space-y-6">
      <BackNavigation />
      <div className="flex items-center gap-3">
        <Users className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Legal Admin — Teams & Staff</h1>
          <p className="text-sm text-muted-foreground">
            Configure legal teams and the staff who handle legal work. Capabilities are role/function aware.
          </p>
        </div>
      </div>

      {!canEdit && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <ShieldAlert className="h-4 w-4" /> View-only — only LEGAL_ADMIN can change teams.
        </div>
      )}

      {/* Warnings */}
      <div className="grid gap-2 md:grid-cols-3">
        {lawyerCount === 0 && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            ⚠ No lawyer with <strong>Own Case</strong> capability — cases will sit in workbasket.
          </div>
        )}
        {lawyerCount === 1 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Only one lawyer — auto-assignment will always pick this user.
          </div>
        )}
        {supportCount === 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            No support staff configured — lawyers will perform all preparation work themselves.
          </div>
        )}
      </div>

      {/* Team picker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Team</CardTitle>
          <CardDescription>Only one team is required for a small department. Additional teams can be activated later.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <Button
                key={t.id}
                variant={teamId === t.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTeamId(t.id)}
                className="gap-2"
              >
                {t.team_name}
                {t.is_default && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                {!t.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add member */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Add Member</CardTitle>
            <CardDescription>Pick from users with any legal role configured under Security → Users & Roles.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              <Select value={addUserId} onValueChange={setAddUserId}>
                <SelectTrigger><SelectValue placeholder="Select user…" /></SelectTrigger>
                <SelectContent>
                  {availableOfficers.length === 0 && <SelectItem value="__none" disabled>No eligible users left</SelectItem>}
                  {availableOfficers.map((o) => (
                    <SelectItem key={o.user_id} value={o.user_id}>{o.full_name}{o.user_code ? ` · ${o.user_code}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLE_CHOICES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={addFunction} onValueChange={(v) => setAddFunction(v as LgMemberFunction)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FUNCTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={handleAdd} disabled={!addUserId}>Add</Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Default capabilities are applied based on function (lawyer/manager can own cases; clerk/support cannot).
            </p>
          </CardContent>
        </Card>
      )}

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
          <CardDescription>
            Lawyers/managers own cases. Support staff assist with documents, scheduling, and notices.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Function</TableHead>
                {CAP_FIELDS.map((c) => <TableHead key={c.key} className="text-center">{c.label}</TableHead>)}
                <TableHead className="text-center">Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-6">No members yet.</TableCell></TableRow>
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
                      <Select value={m.role_code} disabled={!canEdit} onValueChange={(v) => patch(m.id, { role_code: v })}>
                        <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>{ROLE_CHOICES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
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

      {/* Workbasket role map */}
      <Card>
        <CardHeader>
          <CardTitle>Workbasket Responsibilities</CardTitle>
          <CardDescription>Per-workbasket responsible role and supporting role. Used when routing new cases and creating support tasks.</CardDescription>
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
    </div>
  );
}
