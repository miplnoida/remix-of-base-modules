import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar, Scale, AlertTriangle, Gavel, ListChecks, Loader2, HandshakeIcon, Plus, Eye } from "lucide-react";
import { useLgDashboard, useLgHearings, useLgTasks } from "@/hooks/legal/useLgWorkflow";
import { useLgCases, useLgReference } from "@/hooks/legal/useLgCases";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { useUserCode } from "@/hooks/useUserCode";
import { formatDateForDisplay } from "@/lib/format-config";
import { NewCaseDialog } from "@/components/legal/lg/NewCaseDialog";


export default function LgDashboard() {
  const navigate = useNavigate();
  const { userCode } = useUserCode();
  const access = useLgAccess();
  const [scopeMine, setScopeMine] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const officer = scopeMine ? userCode || undefined : undefined;

  const { data: stats, isLoading } = useLgDashboard(officer);
  const { data: stages = [] } = useLgReference("LG_CASE_STAGE");

  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const { data: upcomingHearings = [] } = useLgHearings({ from: today, to: in30, status: "SCHEDULED", officerId: officer });
  const { data: overdueTasks = [] } = useLgTasks({ overdueOnly: true, assignedTo: officer });
  const { data: myCases = [] } = useLgCases({});
  const myAssigned = officer ? myCases.filter((c) => c.assigned_legal_officer_id === officer) : myCases;

  const stageLabel = (code: string) => stages.find((s) => s.code === code)?.label ?? code;

  if (isLoading || !stats) {
    return <div className="p-6 flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Loading dashboard…</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Scale className="h-6 w-6" /> Legal Dashboard</h1>
            <p className="text-sm text-muted-foreground">Operational view of legal cases, hearings, tasks and enforcement.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm">My cases only</Label>
              <Switch checked={scopeMine} onCheckedChange={setScopeMine} />
            </div>
            <Button
              onClick={() => setNewOpen(true)}
              disabled={!access.can("createCase")}
              title={!access.can("createCase") ? "You do not have permission to create cases" : undefined}
            >
              <Plus className="h-4 w-4 mr-1" /> New Case
            </Button>
            <Button variant="outline" onClick={() => navigate("/legal/lg/hearings")}><Calendar className="h-4 w-4 mr-1" /> Calendar</Button>
            <Button variant="outline" onClick={() => navigate("/legal/lg/cases")}>All Cases</Button>
            {(access.can("configureFees") || access.isAdmin) && (
              <Button variant="outline" onClick={() => navigate("/legal/admin/fees")}>Fee Config</Button>
            )}
            {(access.can("configurePolicy") || access.isAdmin) && (
              <Button variant="outline" onClick={() => navigate("/legal/admin/policy")}>Policy Config</Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Open cases" value={stats.open_cases} icon={<Scale className="h-4 w-4" />} />
          <Stat label="My assigned" value={stats.my_assigned_cases} icon={<ListChecks className="h-4 w-4" />} />
          <Stat label="Hearings today" value={stats.hearings_today} icon={<Gavel className="h-4 w-4" />} />
          <Stat label="Hearings (week)" value={stats.hearings_this_week} icon={<Calendar className="h-4 w-4" />} />
          <Stat label="Hearings (30 days)" value={stats.hearings_next_30_days} icon={<Calendar className="h-4 w-4" />} />
          <Stat label="Overdue tasks" value={stats.overdue_tasks} icon={<AlertTriangle className="h-4 w-4" />} tone={stats.overdue_tasks > 0 ? "destructive" : undefined} />
          <Stat label="PA defaults" value={stats.payment_arrangement_defaults} icon={<HandshakeIcon className="h-4 w-4" />} tone={stats.payment_arrangement_defaults > 0 ? "destructive" : undefined} />
        </div>

        <Card>
          <CardHeader><CardTitle>Cases by stage</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.cases_by_stage.length === 0 && <span className="text-sm text-muted-foreground">No data</span>}
              {stats.cases_by_stage.map((s) => (
                <Badge key={s.code} variant="outline" className="text-sm py-1">
                  {stageLabel(s.code)} · <span className="ml-1 font-bold">{s.count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="hearings">
          <TabsList>
            <TabsTrigger value="hearings">Upcoming hearings ({upcomingHearings.length})</TabsTrigger>
            <TabsTrigger value="tasks">Overdue tasks ({overdueTasks.length})</TabsTrigger>
            <TabsTrigger value="my">My cases ({myAssigned.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="hearings">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Case</TableHead><TableHead>Type</TableHead><TableHead>Court</TableHead><TableHead className="text-right">Open</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {upcomingHearings.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No upcoming hearings</TableCell></TableRow>
                  ) : upcomingHearings.map((h: any) => (
                    <TableRow key={h.id}>
                      <TableCell>{formatDateForDisplay(h.hearing_date)}</TableCell>
                      <TableCell>{h.hearing_time ?? "—"}</TableCell>
                      <TableCell>{h.lg_case?.lg_case_no ?? "—"}</TableCell>
                      <TableCell>{h.hearing_type_code}</TableCell>
                      <TableCell>{[h.court_name, h.court_room].filter(Boolean).join(" / ") || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/legal/lg/cases/${h.lg_case_id}`)}>Open</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Due</TableHead><TableHead>Task</TableHead><TableHead>Case</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {overdueTasks.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No overdue tasks</TableCell></TableRow>
                  ) : overdueTasks.map((t: any) => (
                    <TableRow key={t.id} className="cursor-pointer" onClick={() => navigate(`/legal/lg/cases/${t.lg_case_id}`)}>
                      <TableCell className="text-destructive">{formatDateForDisplay(t.due_date)}</TableCell>
                      <TableCell>{t.title}</TableCell>
                      <TableCell>{t.lg_case?.lg_case_no ?? "—"}</TableCell>
                      <TableCell><Badge variant={t.priority_code === "HIGH" || t.priority_code === "URGENT" ? "destructive" : "secondary"}>{t.priority_code}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{t.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="my">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Case No</TableHead><TableHead>Stage</TableHead><TableHead>Status</TableHead><TableHead>Next Hearing</TableHead><TableHead>Next Action</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {myAssigned.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No cases</TableCell></TableRow>
                  ) : myAssigned.slice(0, 25).map((c) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/legal/lg/cases/${c.id}`)}>
                      <TableCell className="font-medium">{c.lg_case_no}</TableCell>
                      <TableCell>{stageLabel(c.current_stage_code)}</TableCell>
                      <TableCell><Badge variant="outline">{c.status_code}</Badge></TableCell>
                      <TableCell>{c.next_hearing_date ? formatDateForDisplay(c.next_hearing_date) : "—"}</TableCell>
                      <TableCell className="truncate max-w-[280px]">{c.next_action || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      <NewCaseDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}


function Stat({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone?: "destructive" }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className={tone === "destructive" ? "text-destructive" : "text-muted-foreground"}>{icon}</span>
        </div>
        <div className={`text-2xl font-bold ${tone === "destructive" ? "text-destructive" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
