/**
 * EPIC-09B — Saved / Scheduled / Export-Audit management panels
 *
 * Mounted inside LegalReportsCentre tabs. Each panel is a self-contained
 * dashboard so the Centre stays declarative.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { PlusCircle, Trash2, RefreshCw, Play, Pause, Copy, PlayCircle } from "lucide-react";
import { pauseSchedule, resumeSchedule, cloneSchedule } from "@/services/legal/lgReportGovernanceService";
import {
  listSavedReports, deleteSavedReport,
  listScheduledReports, upsertScheduledReport, toggleScheduledReport,
  retryScheduledReport, deleteScheduledReport, computeNextRunAt,
  listRecipientGroups, upsertRecipientGroup, deleteRecipientGroup,
  listExportAudit,
  type ScheduledReport, type RecipientGroup,
} from "@/services/legal/lgReportingService";
import { LEGAL_REPORTS } from "@/config/legalReportDefinitions";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { formatDateForDisplay } from "@/lib/format-config";

// ─────────────────────────── SAVED ───────────────────────────
export function SavedReportsPanel() {
  const { user } = useSupabaseAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["lg-saved-reports"], enabled: !!user,
    queryFn: () => listSavedReports(user!.id),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Saved Reports</CardTitle>
        <CardDescription>Personal and shared saved report configurations. Open any live report and click Save to create one.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Report</TableHead><TableHead>Visibility</TableHead><TableHead>Updated</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(data ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No saved reports yet.</TableCell></TableRow>}
            {(data ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.report_name}</TableCell>
                <TableCell><code className="text-xs">{r.report_code}</code></TableCell>
                <TableCell><Badge variant={r.visibility === "shared" ? "default" : "outline"}>{r.visibility}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.updated_at ? formatDateForDisplay(r.updated_at) : ""}</TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="outline"><Link to={`/legal/reports/run/${r.report_code}`}>Open</Link></Button>
                  <Button size="icon" variant="ghost" onClick={async () => { await deleteSavedReport(r.id!); qc.invalidateQueries({ queryKey: ["lg-saved-reports"] }); toast.success("Deleted"); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────── RECIPIENT GROUPS ───────────────────────────
export function RecipientGroupsPanel() {
  const { user } = useSupabaseAuth();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["lg-recipient-groups"], queryFn: listRecipientGroups });
  const [editing, setEditing] = useState<RecipientGroup | null>(null);
  const [emailsText, setEmailsText] = useState("");

  return (
    <Card>
      <CardHeader className="flex-row justify-between items-center space-y-0">
        <div>
          <CardTitle>Recipient Groups</CardTitle>
          <CardDescription>Reusable email distribution lists for scheduled reports.</CardDescription>
        </div>
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setEditing({ group_name: "", emails: [], created_by: user!.id }); setEmailsText(""); }}>
              <PlusCircle className="h-4 w-4 mr-1" />New group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} recipient group</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={editing.group_name} onChange={(e) => setEditing({ ...editing, group_name: e.target.value })} /></div>
                <div><Label>Description</Label><Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
                <div><Label>Emails (comma or newline separated)</Label>
                  <Textarea rows={5} value={emailsText} onChange={(e) => setEmailsText(e.target.value)} /></div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={async () => {
                const emails = emailsText.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
                await upsertRecipientGroup({ ...editing!, emails });
                qc.invalidateQueries({ queryKey: ["lg-recipient-groups"] });
                setEditing(null); toast.success("Saved");
              }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Emails</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {(data ?? []).length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No groups yet.</TableCell></TableRow>}
            {(data ?? []).map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.group_name}</TableCell>
                <TableCell className="text-xs">{(g.emails ?? []).length} recipient(s)</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(g); setEmailsText((g.emails ?? []).join("\n")); }}>Edit</Button>
                  <Button size="icon" variant="ghost" onClick={async () => { await deleteRecipientGroup(g.id!); qc.invalidateQueries({ queryKey: ["lg-recipient-groups"] }); toast.success("Deleted"); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────── SCHEDULED ───────────────────────────
export function ScheduledReportsPanel() {
  const { user } = useSupabaseAuth();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["lg-scheduled"], queryFn: listScheduledReports });
  const { data: groups } = useQuery({ queryKey: ["lg-recipient-groups"], queryFn: listRecipientGroups });
  const [editing, setEditing] = useState<ScheduledReport | null>(null);
  const [recipientsText, setRecipientsText] = useState("");
  const [historyOf, setHistoryOf] = useState<ScheduledReport | null>(null);

  const newSchedule = (): ScheduledReport => ({
    report_code: LEGAL_REPORTS[0].code, schedule_name: "", frequency: "weekly",
    recipients: [], recipient_group_ids: [], format: "csv", is_active: true,
    subject_template: "[Legal Report] {{name}}", attach_data: true,
    created_by: user!.id,
  });

  return (
    <>
      <Card>
        <CardHeader className="flex-row justify-between items-center space-y-0">
          <div>
            <CardTitle>Scheduled Reports</CardTitle>
            <CardDescription>Dispatch runs every 5 minutes via pg_cron. CSV attachments enabled; PDF/Excel/ZIP configuration is stored but rendering is deferred.</CardDescription>
          </div>
          <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { const s = newSchedule(); setEditing(s); setRecipientsText(""); }}>
                <PlusCircle className="h-4 w-4 mr-1" />New schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} schedule</DialogTitle></DialogHeader>
              {editing && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Name</Label><Input value={editing.schedule_name} onChange={(e) => setEditing({ ...editing, schedule_name: e.target.value })} /></div>
                  <div><Label>Report</Label>
                    <Select value={editing.report_code} onValueChange={(v) => setEditing({ ...editing, report_code: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {LEGAL_REPORTS.map((r) => <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Frequency</Label>
                    <Select value={editing.frequency} onValueChange={(v: any) => setEditing({ ...editing, frequency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Format</Label>
                    <Select value={editing.format} onValueChange={(v: any) => setEditing({ ...editing, format: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV (implemented)</SelectItem>
                        <SelectItem value="xlsx">Excel (deferred)</SelectItem>
                        <SelectItem value="pdf">PDF (deferred)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Attach data</Label>
                    <div className="pt-2"><Switch checked={!!editing.attach_data} onCheckedChange={(v) => setEditing({ ...editing, attach_data: v })} /></div>
                  </div>
                  <div className="col-span-2"><Label>Subject template</Label>
                    <Input value={editing.subject_template ?? ""} placeholder="[Legal Report] {{name}}" onChange={(e) => setEditing({ ...editing, subject_template: e.target.value })} />
                  </div>
                  <div className="col-span-2"><Label>Individual recipients (comma-separated)</Label>
                    <Textarea rows={2} value={recipientsText} onChange={(e) => setRecipientsText(e.target.value)} />
                  </div>
                  <div className="col-span-2"><Label>Recipient groups</Label>
                    <div className="flex flex-wrap gap-2">
                      {(groups ?? []).map((g) => {
                        const on = editing.recipient_group_ids?.includes(g.id!);
                        return (
                          <Button key={g.id} size="sm" variant={on ? "default" : "outline"} onClick={() => {
                            const ids = editing.recipient_group_ids ?? [];
                            setEditing({ ...editing, recipient_group_ids: on ? ids.filter((x) => x !== g.id) : [...ids, g.id!] });
                          }}>{g.group_name} <span className="text-[10px] ml-1 opacity-70">({(g.emails ?? []).length})</span></Button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">
                    Next execution preview: <strong>{formatDateForDisplay(computeNextRunAt(editing.frequency))}</strong>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button onClick={async () => {
                  const recipients = recipientsText.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
                  await upsertScheduledReport({ ...editing!, recipients });
                  qc.invalidateQueries({ queryKey: ["lg-scheduled"] });
                  setEditing(null); toast.success("Schedule saved");
                }}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Report</TableHead><TableHead>Freq</TableHead><TableHead>Format</TableHead>
              <TableHead>Active</TableHead><TableHead>Next run</TableHead><TableHead>Last run</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(data ?? []).length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No schedules yet.</TableCell></TableRow>}
              {(data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.schedule_name}</TableCell>
                  <TableCell><code className="text-xs">{s.report_code}</code></TableCell>
                  <TableCell><Badge variant="outline">{s.frequency}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{s.format}</Badge></TableCell>
                  <TableCell><Switch checked={s.is_active} onCheckedChange={async (v) => { await toggleScheduledReport(s.id!, v); qc.invalidateQueries({ queryKey: ["lg-scheduled"] }); }} /></TableCell>
                  <TableCell className="text-xs">{s.next_run_at ? formatDateForDisplay(s.next_run_at) : "—"}</TableCell>
                  <TableCell className="text-xs">
                    {s.last_run_at ? (<><div>{formatDateForDisplay(s.last_run_at)}</div><Badge variant={s.last_run_status === "sent" ? "default" : s.last_run_status === "failed" ? "destructive" : "secondary"} className="text-[10px]">{s.last_run_status ?? "—"}</Badge></>) : "—"}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="outline" title="Retry now" onClick={async () => { await retryScheduledReport(s.id!); qc.invalidateQueries({ queryKey: ["lg-scheduled"] }); toast.success("Queued for next dispatch"); }}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" title="Execution history" onClick={() => setHistoryOf(s)}>
                      <Play className="h-4 w-4" />
                    </Button>
                    {s.is_active ? (
                      <Button size="icon" variant="outline" title="Pause" onClick={async () => { await pauseSchedule(s.id!); qc.invalidateQueries({ queryKey: ["lg-scheduled"] }); toast.success("Paused"); }}><Pause className="h-4 w-4" /></Button>
                    ) : (
                      <Button size="icon" variant="outline" title="Resume" onClick={async () => { await resumeSchedule(s.id!); qc.invalidateQueries({ queryKey: ["lg-scheduled"] }); toast.success("Resumed"); }}><PlayCircle className="h-4 w-4" /></Button>
                    )}
                    <Button size="icon" variant="outline" title="Clone" onClick={async () => { await cloneSchedule(s.id!); qc.invalidateQueries({ queryKey: ["lg-scheduled"] }); toast.success("Cloned"); }}><Copy className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" onClick={() => { setEditing(s); setRecipientsText((s.recipients ?? []).join(", ")); }}>Edit</Button>
                    <Button size="icon" variant="ghost" onClick={async () => { await deleteScheduledReport(s.id!); qc.invalidateQueries({ queryKey: ["lg-scheduled"] }); toast.success("Deleted"); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!historyOf} onOpenChange={(o) => !o && setHistoryOf(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Execution history — {historyOf?.schedule_name}</DialogTitle></DialogHeader>
          <Table>
            <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Status</TableHead><TableHead>Recipients</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
            <TableBody>
              {((historyOf?.execution_history ?? []) as any[]).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No executions recorded yet.</TableCell></TableRow>}
              {((historyOf?.execution_history ?? []) as any[]).slice().reverse().map((h, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">{formatDateForDisplay(h.at)}</TableCell>
                  <TableCell><Badge variant={h.status === "sent" ? "default" : h.status === "failed" ? "destructive" : "secondary"}>{h.status}</Badge></TableCell>
                  <TableCell className="text-xs">{h.recipients ?? 0}</TableCell>
                  <TableCell className="text-xs text-destructive">{h.error ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────── EXPORT AUDIT ───────────────────────────
export function ExportAuditPanel() {
  const { data } = useQuery({ queryKey: ["lg-export-audit"], queryFn: () => listExportAudit(200) });
  return (
    <Card>
      <CardHeader><CardTitle>Export Audit</CardTitle>
        <CardDescription>Every export (downloaded or scheduled) is appended to lg_report_export_audit.</CardDescription></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>When</TableHead><TableHead>Report</TableHead><TableHead>Format</TableHead>
            <TableHead>Rows</TableHead><TableHead>Channel</TableHead><TableHead>File</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(data ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No exports yet.</TableCell></TableRow>}
            {(data ?? []).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{formatDateForDisplay(r.exported_at)}</TableCell>
                <TableCell>{r.report_name} <code className="text-xs text-muted-foreground">{r.report_code}</code></TableCell>
                <TableCell><Badge variant="outline">{r.format}</Badge></TableCell>
                <TableCell className="text-right">{r.row_count}</TableCell>
                <TableCell><Badge variant="secondary">{r.delivery_channel}</Badge></TableCell>
                <TableCell className="text-xs">{r.file_name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
