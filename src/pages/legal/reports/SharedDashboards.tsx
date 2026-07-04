/**
 * EPIC-09C Part 8 — Shared Dashboards
 * List, share, clone and remove dashboards with scope (private/team/dept/org/template).
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Copy, Plus, Trash2 } from "lucide-react";
import {
  listSharedDashboards, saveSharedDashboard, cloneSharedDashboard, deleteSharedDashboard,
  type SharedDashboard,
} from "@/services/legal/lgReportGovernanceService";
import { toast } from "sonner";
import { useLgAccess } from "@/hooks/legal/useLgAccess";

const SCOPES: SharedDashboard["scope"][] = ["private", "team", "department", "organization", "template"];

export default function SharedDashboards() {
  const qc = useQueryClient();
  const access = useLgAccess();
  const canShare = access.can("shareDashboards");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<SharedDashboard>>({ name: "", scope: "team", access_mode: "read_only" });

  const q = useQuery({ queryKey: ["shared-dashboards"], queryFn: listSharedDashboards });

  const save = useMutation({
    mutationFn: () => saveSharedDashboard(form as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shared-dashboards"] }); setOpen(false); setForm({ name: "", scope: "team", access_mode: "read_only" }); toast.success("Dashboard shared"); },
    onError: (e: any) => toast.error(e.message ?? "Failed to share"),
  });
  const clone = useMutation({
    mutationFn: (d: SharedDashboard) => cloneSharedDashboard(d.id, `${d.name} (copy)`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shared-dashboards"] }); toast.success("Cloned to My Dashboards"); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteSharedDashboard(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shared-dashboards"] }); toast.success("Deleted"); },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Shared Dashboards"
        subtitle="Publish dashboards to your team, department or the whole organization. Templates can be cloned."
        breadcrumbs={[{ label: "Legal Management", href: "/legal/dashboard" }, { label: "Reports", href: "/legal/reports" }, { label: "Shared" }]}
        actions={
          canShare && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Share Dashboard</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Share Dashboard</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><label className="text-xs">Name</label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><label className="text-xs">Description</label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs">Scope</label>
                      <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v as any })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{SCOPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs">Access</label>
                      <Select value={form.access_mode} onValueChange={(v) => setForm({ ...form, access_mode: v as any })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read_only">Read only</SelectItem>
                          <SelectItem value="editable">Editable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs">Team code</label><Input value={form.team_code ?? ""} onChange={(e) => setForm({ ...form, team_code: e.target.value })} /></div>
                    <div><label className="text-xs">Department code</label><Input value={form.department_code ?? ""} onChange={(e) => setForm({ ...form, department_code: e.target.value })} /></div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1"><input type="checkbox" checked={!!form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Published</label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={!!form.is_template} onChange={(e) => setForm({ ...form, is_template: e.target.checked })} /> Template</label>
                  </div>
                </div>
                <DialogFooter><Button onClick={() => save.mutate()} disabled={!form.name || save.isPending}>Share</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Dashboards visible to you</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Scope</TableHead><TableHead>Access</TableHead>
              <TableHead>Published</TableHead><TableHead>Template</TableHead>
              <TableHead>Updated</TableHead><TableHead className="w-32"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {q.isLoading ? <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">Loading…</TableCell></TableRow>
                : q.data?.length ? q.data.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs font-medium">{d.name}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{d.scope}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{d.access_mode}</Badge></TableCell>
                    <TableCell className="text-xs">{d.is_published ? "Yes" : "—"}</TableCell>
                    <TableCell className="text-xs">{d.is_template ? "Yes" : "—"}</TableCell>
                    <TableCell className="text-xs">{new Date(d.updated_at).toLocaleDateString()}</TableCell>
                    <TableCell className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" title="Clone" onClick={() => clone.mutate(d)}><Copy className="h-3 w-3" /></Button>
                      {canShare && <Button size="icon" variant="ghost" title="Delete" onClick={() => remove.mutate(d.id)}><Trash2 className="h-3 w-3" /></Button>}
                    </TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">No shared dashboards yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
