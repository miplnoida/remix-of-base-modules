import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, momentLocalizer, View } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CalendarIcon, Gavel, Plus } from "lucide-react";
import { useLgHearings } from "@/hooks/legal/useLgWorkflow";
import { useLgCases } from "@/hooks/legal/useLgCases";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { useUserCode } from "@/hooks/useUserCode";
import { HearingOutcomeDialog } from "@/components/legal/HearingOutcomeDialog";
import type { LgHearing } from "@/services/legal/lgWorkflowService";
import { formatDateForDisplay } from "@/lib/format-config";
import { LgDataGrid, LgStatusBadge, buildLgRowActions, daysRemainingTone, daysRemainingLabel, type LgColumnDef } from "@/components/legal/grid";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const localizer = momentLocalizer(moment);

export default function LgHearingCalendar() {
  const navigate = useNavigate();
  const { userCode } = useUserCode();
  const access = useLgAccess();
  const [scopeMine, setScopeMine] = useState(false);
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [selected, setSelected] = useState<LgHearing | null>(null);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "outcome">("outcome");
  const [createCaseId, setCreateCaseId] = useState<string>("");

  const from = useMemo(() => moment(date).startOf("month").subtract(7, "days").format("YYYY-MM-DD"), [date]);
  const to = useMemo(() => moment(date).endOf("month").add(7, "days").format("YYYY-MM-DD"), [date]);

  const { data: hearings = [], isLoading } = useLgHearings({
    from, to,
    officerId: scopeMine ? userCode || undefined : undefined,
  });

  const events = hearings
    .filter((h: any) => h.hearing_date)
    .map((h: any) => {
      const start = new Date(`${h.hearing_date}T${h.hearing_time ?? "09:00"}:00`);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      return {
        id: h.id,
        title: `${h.lg_case?.lg_case_no ?? ""} — ${h.hearing_type_code}`,
        start, end,
        resource: h as LgHearing,
      };
    });

  const listRows = useMemo(
    () => [...hearings].sort((a: any, b: any) => (a.hearing_date < b.hearing_date ? -1 : 1)),
    [hearings],
  );

  type Row = any;
  const hearingColumns: LgColumnDef<Row>[] = useMemo(() => [
    {
      accessorKey: "hearing_date", header: "Date", meta: { label: "Date", pinLeft: true, width: 120 },
      cell: ({ getValue }) => formatDateForDisplay(getValue<string>()),
    },
    {
      id: "days_remaining", header: "Days", meta: { label: "Days Remaining", width: 110 },
      accessorFn: (r) => r.hearing_date,
      cell: ({ row }) => {
        const tone = daysRemainingTone(row.original.hearing_date);
        const cls = tone === "danger" ? "bg-destructive/10 text-destructive border-destructive/20"
          : tone === "warn" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
          : tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
          : "bg-muted text-muted-foreground border-border";
        return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", cls)}>{daysRemainingLabel(row.original.hearing_date)}</span>;
      },
    },
    { accessorKey: "hearing_time", header: "Time", meta: { label: "Time", width: 90 }, cell: ({ getValue }) => getValue<string>() ?? "—" },
    {
      id: "case_no", header: "Case", meta: { label: "Case No", width: 150 },
      accessorFn: (r) => r.lg_case?.lg_case_no ?? "—",
      cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
    },
    { accessorKey: "hearing_type_code", header: "Type", meta: { label: "Type", width: 130 } },
    {
      id: "court", header: "Court", meta: { label: "Court", width: 180 },
      accessorFn: (r) => [r.court_name, r.court_room].filter(Boolean).join(" / ") || "—",
    },
    {
      accessorKey: "status", header: "Status", meta: { label: "Status", width: 130 },
      cell: ({ getValue }) => <LgStatusBadge status={getValue<string>()} />,
    },
  ], []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarIcon className="h-6 w-6" /> Hearing Calendar</h1>
              <p className="text-sm text-muted-foreground">Officer and team view of scheduled court hearings.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2"><Label className="text-sm">My hearings only</Label><Switch checked={scopeMine} onCheckedChange={setScopeMine} /></div>
            <AddHearingButton disabled={!access.can("addHearing")} onCreate={(caseId) => { setCreateCaseId(caseId); setMode("create"); setSelected(null); setOutcomeOpen(true); }} />
            <Button onClick={() => navigate("/legal/lg/dashboard")} variant="outline">Dashboard</Button>
          </div>
        </div>

        <Tabs defaultValue="calendar">
          <TabsList>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="list">Next hearings</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <Card>
              <CardHeader><CardTitle>{scopeMine ? "My Hearings" : "Team Hearings"}</CardTitle></CardHeader>
              <CardContent>
                <div style={{ height: 650 }}>
                  <Calendar
                    localizer={localizer}
                    events={events}
                    view={view}
                    date={date}
                    onView={setView}
                    onNavigate={setDate}
                    views={["month", "week", "day", "agenda"]}
                    onSelectEvent={(e: any) => {
                      setSelected(e.resource);
                      setMode("outcome");
                      setOutcomeOpen(true);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Case</TableHead><TableHead>Type</TableHead><TableHead>Court</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">Loading…</TableCell></TableRow>
                  ) : upcoming.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hearings scheduled</TableCell></TableRow>
                  ) : upcoming.map((h: any) => (
                    <TableRow key={h.id}>
                      <TableCell>{formatDateForDisplay(h.hearing_date)}</TableCell>
                      <TableCell>{h.hearing_time ?? "—"}</TableCell>
                      <TableCell className="font-medium">{h.lg_case?.lg_case_no ?? "—"}</TableCell>
                      <TableCell>{h.hearing_type_code}</TableCell>
                      <TableCell>{[h.court_name, h.court_room].filter(Boolean).join(" / ") || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{h.status}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/legal/lg/cases/${h.lg_case_id}`)}>Case</Button>
                        <Button size="sm" onClick={() => { setSelected(h); setMode("outcome"); setOutcomeOpen(true); }}>
                          <Gavel className="h-4 w-4 mr-1" /> Outcome
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      <HearingOutcomeDialog
        open={outcomeOpen}
        onOpenChange={setOutcomeOpen}
        hearing={selected}
        lgCaseId={mode === "create" ? createCaseId : undefined}
        mode={mode}
      />
    </div>
  );
}

function AddHearingButton({ disabled, onCreate }: { disabled?: boolean; onCreate: (caseId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [caseId, setCaseId] = useState("");
  const { data: cases = [] } = useLgCases({});

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={disabled} title={disabled ? "You do not have permission to schedule hearings" : undefined}>
        <Plus className="h-4 w-4 mr-1" /> Add Hearing
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={() => setOpen(false)}>
          <div className="bg-background rounded-lg p-6 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Select Case</h3>
            <p className="text-xs text-muted-foreground">Pick the case to schedule a hearing for.</p>
            <select className="w-full border rounded h-9 px-2 bg-background" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
              <option value="">Select…</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.lg_case_no} · {c.case_type_code}</option>)}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button disabled={!caseId} onClick={() => { onCreate(caseId); setOpen(false); setCaseId(""); }}>Next</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

