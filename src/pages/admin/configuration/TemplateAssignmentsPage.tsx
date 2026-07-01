import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";

/**
 * Configuration Center → Template Assignments.
 *
 * This screen ONLY assigns which Core Template is used for a given
 * (module, workflow, workflow stage, business event, channel, language)
 * combination. It never edits template content — clicking a template
 * opens the Core Template Designer.
 *
 * Underlying store: public.core_configuration_assignment
 *   domain          = 'TEMPLATE'
 *   scope_level     = MODULE | WORKFLOW | WORKFLOW_STAGE | ORG | GLOBAL
 *   scope_ref       = { module_code, workflow_code?, stage_code? }
 *   business_event  = event code (nullable = any event)
 *   resource_type   = 'CORE_TEMPLATE'
 *   resource_ref    = { template_code, base_layout_code?, fallback_template_code?, language?, channel? }
 *   priority        = integer (higher wins)
 *   is_active       = boolean
 */

const sb = supabase as any;

const MODULES = ["ORG", "LEGAL", "BENEFITS", "COMPLIANCE", "EMPLOYER", "MEMBER", "PAYMENTS", "AUDIT", "REPORTS", "COMMON"];
const CHANNELS = ["EMAIL", "PRINT_LETTER", "PDF", "SMS", "WHATSAPP", "PORTAL_MSG", "IN_APP"];
const LANGUAGES = ["en", "fr", "es"];
const SCOPE_LEVELS = ["ORG", "MODULE", "WORKFLOW", "WORKFLOW_STAGE"] as const;

interface Assignment {
  id: string;
  domain: string;
  business_event: string | null;
  scope_level: string;
  scope_ref: any;
  resource_type: string;
  resource_ref: any;
  rule_set: any;
  priority: number;
  is_active: boolean;
  notes: string | null;
}

interface CoreTpl {
  id: string;
  code: string;
  name: string;
  module_code: string;
  template_type: string;
}

interface BaseLayout {
  id: string;
  code: string;
  name: string;
}

function useTemplates() {
  const [templates, setTemplates] = useState<CoreTpl[]>([]);
  const [layouts, setLayouts] = useState<BaseLayout[]>([]);
  useEffect(() => {
    Promise.all([
      sb.from("core_template").select("id, code, name, module_code, template_type").eq("is_active", true).order("module_code").order("code"),
      sb.from("core_template_layout").select("id, code, name").eq("is_active", true).order("code"),
    ]).then(([t, l]: any[]) => {
      setTemplates((t.data || []) as CoreTpl[]);
      setLayouts((l.data || []) as BaseLayout[]);
    });
  }, []);
  return { templates, layouts };
}

function useAssignments(refresh: number) {
  const [rows, setRows] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    sb.from("core_configuration_assignment")
      .select("*")
      .eq("domain", "TEMPLATE")
      .eq("resource_type", "CORE_TEMPLATE")
      .order("priority", { ascending: false })
      .order("scope_level")
      .then(({ data }: any) => {
        setRows((data || []) as Assignment[]);
        setLoading(false);
      });
  }, [refresh]);
  return { rows, loading };
}

interface FormState {
  id?: string;
  scope_level: string;
  module_code: string;
  workflow_code: string;
  stage_code: string;
  business_event: string;
  template_code: string;
  base_layout_code: string;
  fallback_template_code: string;
  channel: string;
  language: string;
  priority: number;
  is_active: boolean;
  notes: string;
}

const emptyForm = (): FormState => ({
  scope_level: "MODULE",
  module_code: "",
  workflow_code: "",
  stage_code: "",
  business_event: "",
  template_code: "",
  base_layout_code: "",
  fallback_template_code: "",
  channel: "",
  language: "en",
  priority: 100,
  is_active: true,
  notes: "",
});

export default function TemplateAssignmentsPage() {
  const { toast } = useToast();
  const [refresh, setRefresh] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const { templates, layouts } = useTemplates();
  const { rows, loading } = useAssignments(refresh);

  const templateByCode = useMemo(() => {
    const m: Record<string, CoreTpl> = {};
    templates.forEach((t) => (m[t.code] = t));
    return m;
  }, [templates]);

  const openNew = () => {
    setForm(emptyForm());
    setDialogOpen(true);
  };
  const openEdit = (a: Assignment) => {
    setForm({
      id: a.id,
      scope_level: a.scope_level,
      module_code: a.scope_ref?.module_code || "",
      workflow_code: a.scope_ref?.workflow_code || "",
      stage_code: a.scope_ref?.stage_code || "",
      business_event: a.business_event || "",
      template_code: a.resource_ref?.template_code || "",
      base_layout_code: a.resource_ref?.base_layout_code || "",
      fallback_template_code: a.resource_ref?.fallback_template_code || "",
      channel: a.resource_ref?.channel || "",
      language: a.resource_ref?.language || "en",
      priority: a.priority || 100,
      is_active: a.is_active,
      notes: a.notes || "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.template_code) {
      toast({ title: "Template required", variant: "destructive" });
      return;
    }
    const payload = {
      domain: "TEMPLATE",
      business_event: form.business_event || null,
      scope_level: form.scope_level,
      scope_ref: {
        module_code: form.module_code || null,
        workflow_code: form.workflow_code || null,
        stage_code: form.stage_code || null,
      },
      resource_type: "CORE_TEMPLATE",
      resource_ref: {
        template_code: form.template_code,
        base_layout_code: form.base_layout_code || null,
        fallback_template_code: form.fallback_template_code || null,
        channel: form.channel || null,
        language: form.language || null,
      },
      priority: form.priority,
      is_active: form.is_active,
      notes: form.notes || null,
    };
    const q = form.id
      ? sb.from("core_configuration_assignment").update(payload).eq("id", form.id)
      : sb.from("core_configuration_assignment").insert(payload);
    const { error } = await q;
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: form.id ? "Assignment updated" : "Assignment created" });
    setDialogOpen(false);
    setRefresh((r) => r + 1);
  };

  const remove = async (a: Assignment) => {
    if (!confirm("Remove this template assignment?")) return;
    const { error } = await sb.from("core_configuration_assignment").delete().eq("id", a.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setRefresh((r) => r + 1);
  };

  const toggleActive = async (a: Assignment) => {
    await sb.from("core_configuration_assignment").update({ is_active: !a.is_active }).eq("id", a.id);
    setRefresh((r) => r + 1);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Template Assignments</CardTitle>
            <CardDescription>
              Bind a Core Template to a module / workflow / stage / event / channel / language combination.
              This screen only assigns — click a template to open the Core Template Designer for editing.
            </CardDescription>
          </div>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> New Assignment</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scope</TableHead>
                <TableHead>Module / Workflow / Stage</TableHead>
                <TableHead>Business Event</TableHead>
                <TableHead>Channel · Language</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Fallback</TableHead>
                <TableHead>Base Layout</TableHead>
                <TableHead className="text-right">Priority</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No assignments yet.</TableCell></TableRow>
              ) : rows.map((a) => {
                const tpl = templateByCode[a.resource_ref?.template_code];
                return (
                  <TableRow key={a.id}>
                    <TableCell><Badge variant="outline">{a.scope_level}</Badge></TableCell>
                    <TableCell className="text-xs">
                      {[a.scope_ref?.module_code, a.scope_ref?.workflow_code, a.scope_ref?.stage_code].filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell className="text-xs">{a.business_event || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {[a.resource_ref?.channel, a.resource_ref?.language].filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell>
                      {tpl ? (
                        <Link to={`/admin/notification-templates?tab=core&module=${tpl.module_code}`} className="text-primary hover:underline inline-flex items-center gap-1">
                          {tpl.code} <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-destructive">{a.resource_ref?.template_code || "—"}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{a.resource_ref?.fallback_template_code || "—"}</TableCell>
                    <TableCell className="text-xs">{a.resource_ref?.base_layout_code || "auto"}</TableCell>
                    <TableCell className="text-right">{a.priority}</TableCell>
                    <TableCell><Switch checked={a.is_active} onCheckedChange={() => toggleActive(a)} /></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(a)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? "Edit Template Assignment" : "New Template Assignment"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Scope Level</Label>
              <Select value={form.scope_level} onValueChange={(v) => setForm({ ...form, scope_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SCOPE_LEVELS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Module</Label>
              <Select value={form.module_code} onValueChange={(v) => setForm({ ...form, module_code: v })}>
                <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                <SelectContent>{MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Workflow Code</Label>
              <Input value={form.workflow_code} onChange={(e) => setForm({ ...form, workflow_code: e.target.value })} placeholder="e.g. LG_CASE_LIFECYCLE" />
            </div>
            <div>
              <Label>Workflow Stage</Label>
              <Input value={form.stage_code} onChange={(e) => setForm({ ...form, stage_code: e.target.value })} placeholder="e.g. HEARING_SCHEDULED" />
            </div>
            <div>
              <Label>Business Event</Label>
              <Input value={form.business_event} onChange={(e) => setForm({ ...form, business_event: e.target.value })} placeholder="e.g. LEGAL_HEARING_NOTICE" />
            </div>
            <div>
              <Label>Channel</Label>
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Language</Label>
              <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Template</Label>
              <Select value={form.template_code} onValueChange={(v) => setForm({ ...form, template_code: v })}>
                <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {templates
                    .filter((t) => !form.module_code || t.module_code === form.module_code)
                    .map((t) => <SelectItem key={t.id} value={t.code}>{t.code} — {t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fallback Template</Label>
              <Select value={form.fallback_template_code} onValueChange={(v) => setForm({ ...form, fallback_template_code: v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {templates.map((t) => <SelectItem key={t.id} value={t.code}>{t.code}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Base Layout</Label>
              <Select value={form.base_layout_code} onValueChange={(v) => setForm({ ...form, base_layout_code: v })}>
                <SelectTrigger><SelectValue placeholder="Use template default" /></SelectTrigger>
                <SelectContent>{layouts.map((l) => <SelectItem key={l.id} value={l.code}>{l.code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
