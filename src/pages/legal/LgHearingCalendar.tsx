import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, momentLocalizer, View } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CalendarIcon, Gavel } from "lucide-react";
import { useLgHearings } from "@/hooks/legal/useLgWorkflow";
import { useUserCode } from "@/hooks/useUserCode";
import { HearingOutcomeDialog } from "@/components/legal/HearingOutcomeDialog";
import type { LgHearing } from "@/services/legal/lgWorkflowService";
import { formatDateForDisplay } from "@/lib/format-config";

const localizer = momentLocalizer(moment);

export default function LgHearingCalendar() {
  const navigate = useNavigate();
  const { userCode } = useUserCode();
  const [scopeMine, setScopeMine] = useState(false);
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [selected, setSelected] = useState<LgHearing | null>(null);
  const [outcomeOpen, setOutcomeOpen] = useState(false);

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

  const upcoming = [...hearings]
    .filter((h: any) => h.hearing_date && h.hearing_date >= new Date().toISOString().slice(0, 10) && h.status === "SCHEDULED")
    .sort((a: any, b: any) => (a.hearing_date < b.hearing_date ? -1 : 1))
    .slice(0, 25);

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
                        <Button size="sm" onClick={() => { setSelected(h); setOutcomeOpen(true); }}>
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
        mode="outcome"
      />
    </div>
  );
}
