import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Users2, GaugeCircle } from "lucide-react";
import { useUserCode } from "@/hooks/useUserCode";
import { useLgStaff, useCreateLgStaff, useUpdateLgStaff, useDeleteLgStaff } from "@/hooks/legal/useLgStaff";
import { useStaffWorkload } from "@/hooks/legal/useLgAssignment";
import { useLegalTeams } from "@/hooks/legal/useLegalTeams";
import { SKILL_OPTIONS, type LgStaff } from "@/services/legal/lgStaffService";

const AVAILABILITY: { value: LgStaff["availability"]; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "leave", label: "On leave" },
  { value: "inactive", label: "Inactive" },
];

function capacityColor(pct: number) {
  if (pct >= 90) return "bg-rose-100 text-rose-800";
  if (pct >= 70) return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

export default function LegalAdminStaff() {
  const { userCode } = useUserCode();
  const staff = useLgStaff();
  const create = useCreateLgStaff();
  const update = useUpdateLgStaff();
  const remove = useDeleteLgStaff();
  const teams = useLegalTeams();
  const workload = useStaffWorkload();

  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LgStaff | null>(null);

  const rows = useMemo(() => {
    const list = staff.data ?? [];
    return list.filter((s) => {
      if (teamFilter !== "all" && s.team_id !== teamFilter) return false;
      if (search && !`${s.full_name} ${s.user_code ?? ""} ${s.email ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [staff.data, search, teamFilter]);

  const workloadMap = useMemo(() => {
    const m = new Map<string, number>();
    (workload.data ?? []).forEach((w) => m.set(w.staff_id, w.capacity_pct));
    return m;
  }, [workload.data]);

  function openNew() {
    setEditing({
      id: "",
      user_id: "",
      user_code: "",
      full_name: "",
      email: "",
      role_code: "LAWYER",
      team_id: null,
      office_code: null,
      is_active: true,
      availability: "available",
      max_active_cases: 25,
      max_high_priority_cases: 8,
      skills: [],
      notes: "",
      country_code: "SKN",
      created_at: "",
      updated_at: "",
    });
    setOpen(true);
  }

  async function save() {
    if (!editing) return;
    if (!editing.full_name?.trim() || !editing.user_id?.trim()) {
      toast.error("Full name and user id are required");
      return;
    }
    try {
      const payload = { ...editing, updated_by: userCode ?? null } as any;
      if (editing.id) {
        await update.mutateAsync({ id: editing.id, patch: payload });
        toast.success("Staff updated");
      } else {
        await create.mutateAsync({ ...payload, created_by: userCode ?? null });
        toast.success("Staff added");
      }
      setOpen(false);
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link to="/legal/admin/routing"><ArrowLeft className="h-4 w-4 mr-2" />Back to Routing</Link>
          </Button>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Users2 className="h-6 w-6" /> Legal Staff Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Capacity, skills, availability and team assignment that drives the assignment engine.
          </p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Staff</Button>
      </div>

      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="capacity"><GaugeCircle className="h-4 w-4 mr-1" />Capacity</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-3">
          <Card>
            <CardContent className="pt-4 flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs">Search</Label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, code or email" />
              </div>
              <div className="w-56">
                <Label className="text-xs">Team</Label>
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All teams</SelectItem>
                    {(teams.data ?? []).map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.team_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Staff ({rows.length})</CardTitle>
              <CardDescription>Active staff are eligible for automatic assignment.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((s) => {
                    const team = (teams.data ?? []).find((t: any) => t.id === s.team_id);
                    const pct = workloadMap.get(s.id) ?? 0;
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="font-medium">{s.full_name}</div>
                          <div className="text-xs text-muted-foreground">{s.user_code ?? s.user_id.slice(0, 8)}</div>
                        </TableCell>
                        <TableCell>{s.role_code ?? "—"}</TableCell>
                        <TableCell>{(team as any)?.team_name ?? "—"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {s.skills.length === 0 && <span className="text-xs text-muted-foreground">none</span>}
                            {s.skills.map((k) => <Badge key={k} variant="outline" className="text-[10px]">{k}</Badge>)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-32">
                            <div className="flex justify-between text-xs mb-1">
                              <Badge className={capacityColor(pct)}>{pct}%</Badge>
                              <span className="text-muted-foreground">max {s.max_active_cases}</span>
                            </div>
                            <Progress value={Math.min(100, pct)} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.is_active ? "default" : "secondary"}>
                            {s.is_active ? s.availability : "inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}>
                            Edit
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            onClick={async () => {
                              if (!confirm(`Remove ${s.full_name}?`)) return;
                              try { await remove.mutateAsync(s.id); toast.success("Removed"); }
                              catch (e: any) { toast.error(e?.message ?? "Remove failed"); }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                        No staff yet. Add staff to enable automatic assignment.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capacity">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live workload</CardTitle>
              <CardDescription>From <code>lg_staff_workload</code> view. Sorted by capacity.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>High Priority</TableHead>
                    <TableHead>Capacity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(workload.data ?? []).map((w) => (
                    <TableRow key={w.staff_id}>
                      <TableCell>{w.full_name}</TableCell>
                      <TableCell>{w.active_cases} / {w.max_active_cases}</TableCell>
                      <TableCell>{w.high_priority_cases} / {w.max_high_priority_cases}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 w-44">
                          <Progress value={Math.min(100, w.capacity_pct)} />
                          <Badge className={capacityColor(w.capacity_pct)}>{w.capacity_pct}%</Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Editor */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit staff" : "Add staff"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Full name *</Label>
                <Input value={editing.full_name} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">User ID (auth uuid) *</Label>
                <Input value={editing.user_id} onChange={(e) => setEditing({ ...editing, user_id: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">User code</Label>
                <Input value={editing.user_code ?? ""} onChange={(e) => setEditing({ ...editing, user_code: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Role</Label>
                <Input value={editing.role_code ?? ""} onChange={(e) => setEditing({ ...editing, role_code: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Team</Label>
                <Select value={editing.team_id ?? "none"} onValueChange={(v) => setEditing({ ...editing, team_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Pick team" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No team</SelectItem>
                    {(teams.data ?? []).map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.team_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Office code</Label>
                <Input value={editing.office_code ?? ""} onChange={(e) => setEditing({ ...editing, office_code: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Max active cases</Label>
                <Input type="number" value={editing.max_active_cases}
                  onChange={(e) => setEditing({ ...editing, max_active_cases: parseInt(e.target.value || "0", 10) })} />
              </div>
              <div>
                <Label className="text-xs">Max high-priority cases</Label>
                <Input type="number" value={editing.max_high_priority_cases}
                  onChange={(e) => setEditing({ ...editing, max_high_priority_cases: parseInt(e.target.value || "0", 10) })} />
              </div>
              <div>
                <Label className="text-xs">Availability</Label>
                <Select value={editing.availability} onValueChange={(v: any) => setEditing({ ...editing, availability: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AVAILABILITY.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label className="text-xs">Active</Label>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Skills</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {SKILL_OPTIONS.map((k) => {
                    const on = editing.skills.includes(k);
                    return (
                      <Badge
                        key={k}
                        variant={on ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setEditing({
                          ...editing,
                          skills: on ? editing.skills.filter((x) => x !== k) : [...editing.skills, k],
                        })}
                      >
                        {k}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={create.isPending || update.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
