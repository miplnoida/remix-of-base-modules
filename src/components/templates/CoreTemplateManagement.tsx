import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Eye, Pencil, Plus, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  coreTemplateService,
  CoreTemplate,
  CoreTemplateLayout,
  CoreTemplateToken,
  CoreTemplateVersion,
} from "@/services/coreTemplateService";

interface Props {
  fixedModuleCode?: string; // when provided, screen is module-scoped
  title?: string;
  description?: string;
  showAllModules?: boolean;
}

const TEMPLATE_TYPES = ["LETTER", "NOTICE", "EMAIL", "SMS", "PDF", "FORM"];
const MODULES = ["LEGAL", "BENEFITS", "COMPLIANCE", "EMPLOYER", "COMMON"];

export default function CoreTemplateManagement({
  fixedModuleCode,
  title,
  description,
  showAllModules = false,
}: Props) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<CoreTemplate[]>([]);
  const [layouts, setLayouts] = useState<CoreTemplateLayout[]>([]);
  const [tokens, setTokens] = useState<CoreTemplateToken[]>([]);
  const [loading, setLoading] = useState(true);

  const [moduleFilter, setModuleFilter] = useState<string>(fixedModuleCode || "ALL");
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<CoreTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [previewTpl, setPreviewTpl] = useState<CoreTemplate | null>(null);
  const [previewVer, setPreviewVer] = useState<CoreTemplateVersion | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (fixedModuleCode) filters.module_code = fixedModuleCode;
      else if (moduleFilter !== "ALL") filters.module_code = moduleFilter;
      const [t, l, k] = await Promise.all([
        coreTemplateService.listTemplates(filters),
        coreTemplateService.listLayouts(),
        coreTemplateService.listTokens(fixedModuleCode),
      ]);
      setTemplates(t);
      setLayouts(l);
      setTokens(k);
    } catch (e: any) {
      toast({ title: "Failed to load templates", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [fixedModuleCode, moduleFilter]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return templates.filter(t =>
      !q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)
    );
  }, [templates, search]);

  const openPreview = async (tpl: CoreTemplate) => {
    setPreviewTpl(tpl);
    const ver = await coreTemplateService.getActiveVersion(tpl.id);
    setPreviewVer(ver);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title || "Template Management"}</h1>
        <p className="text-muted-foreground">{description || "Manage central templates"}</p>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="layouts">Layouts ({layouts.length})</TabsTrigger>
          <TabsTrigger value="tokens">Tokens ({tokens.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-end gap-3 justify-between">
                <div className="flex flex-wrap items-end gap-3">
                  {showAllModules && (
                    <div>
                      <Label className="text-xs">Module</Label>
                      <Select value={moduleFilter} onValueChange={setModuleFilter}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All</SelectItem>
                          {MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Search</Label>
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or code" className="w-64" />
                  </div>
                </div>
                <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-2" />New Template</Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="text-sm text-muted-foreground">No templates</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      {showAllModules && <TableHead>Module</TableHead>}
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{t.code}</TableCell>
                        <TableCell>{t.name}</TableCell>
                        {showAllModules && <TableCell><Badge variant="outline">{t.module_code}</Badge></TableCell>}
                        <TableCell>{t.template_type}</TableCell>
                        <TableCell>{t.template_category || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={t.source_system === "CORE" ? "default" : "secondary"}>
                            {t.source_system}
                          </Badge>
                        </TableCell>
                        <TableCell><Badge>{t.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Preview" onClick={() => openPreview(t)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit"
                                  disabled={t.source_system === "COMPLIANCE_LEGACY"}
                                  onClick={() => setEditing(t)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layouts">
          <Card>
            <CardHeader><CardTitle>Layouts</CardTitle><CardDescription>Letterhead and document layout presets</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Code</TableHead><TableHead>Name</TableHead>
                  <TableHead>Letterhead</TableHead><TableHead>Page #s</TableHead>
                  <TableHead>Pre-Printed</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {layouts.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs">{l.code}</TableCell>
                      <TableCell>{l.name}</TableCell>
                      <TableCell>{l.has_letterhead ? "Yes" : "No"}</TableCell>
                      <TableCell>{l.show_page_numbers ? "Yes" : "No"}</TableCell>
                      <TableCell>{l.is_pre_printed ? "Yes" : "No"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokens">
          <Card>
            <CardHeader><CardTitle>Tokens</CardTitle><CardDescription>Available merge tokens</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Token</TableHead><TableHead>Label</TableHead>
                  <TableHead>Module</TableHead><TableHead>Entity</TableHead>
                  <TableHead>Sample</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {tokens.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{`{{${t.token_code}}}`}</TableCell>
                      <TableCell>{t.token_label}</TableCell>
                      <TableCell><Badge variant="outline">{t.module_code}</Badge></TableCell>
                      <TableCell>{t.entity_type || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.sample_value || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview */}
      <Dialog open={!!previewTpl} onOpenChange={(o) => { if (!o) { setPreviewTpl(null); setPreviewVer(null); } }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{previewTpl?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="text-xs text-muted-foreground">Code: {previewTpl?.code} · Type: {previewTpl?.template_type}</div>
            {previewVer?.subject && <div><strong>Subject:</strong> {previewVer.subject}</div>}
            <div className="border rounded p-4 max-h-96 overflow-auto prose prose-sm"
                 dangerouslySetInnerHTML={{ __html: previewVer?.body_html || "<em>No active version</em>" }} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit */}
      <TemplateFormDialog
        open={creating || !!editing}
        template={editing}
        defaultModule={fixedModuleCode}
        layouts={layouts}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSaved={() => { setCreating(false); setEditing(null); reload(); }}
      />
    </div>
  );
}

function TemplateFormDialog({
  open, template, defaultModule, layouts, onClose, onSaved,
}: {
  open: boolean;
  template: CoreTemplate | null;
  defaultModule?: string;
  layouts: CoreTemplateLayout[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<any>({});
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [layoutId, setLayoutId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setForm({
        code: template.code, name: template.name,
        module_code: template.module_code,
        template_type: template.template_type,
        template_category: template.template_category || "",
        description: template.description || "",
      });
      setLayoutId(template.default_layout_id || "");
      coreTemplateService.getActiveVersion(template.id).then(v => {
        setBody(v?.body_html || "");
        setSubject(v?.subject || "");
      });
    } else if (open) {
      setForm({
        code: "", name: "",
        module_code: defaultModule || "LEGAL",
        template_type: "LETTER",
        template_category: "",
        description: "",
      });
      setBody(""); setSubject(""); setLayoutId(layouts[0]?.id || "");
    }
  }, [template, open, defaultModule, layouts]);

  const save = async () => {
    if (!form.code || !form.name) {
      toast({ title: "Code and Name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let tpl = template;
      if (!tpl) {
        tpl = await coreTemplateService.createTemplate({
          ...form, status: "DRAFT", source_system: "CORE", is_active: true,
          default_layout_id: layoutId || null,
        });
      } else {
        tpl = await coreTemplateService.updateTemplate(tpl.id, {
          name: form.name, description: form.description,
          template_type: form.template_type, template_category: form.template_category,
          default_layout_id: layoutId || null,
        });
      }
      const ver = await coreTemplateService.createDraftVersion(tpl.id, body, subject, layoutId || null);
      await coreTemplateService.publishVersion(ver.id);
      toast({ title: "Template saved" });
      onSaved();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{template ? "Edit Template" : "New Template"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Code *</Label>
            <Input value={form.code || ""} disabled={!!template}
                   onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <Label>Name *</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.template_type} onValueChange={(v) => setForm({ ...form, template_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEMPLATE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Input value={form.template_category || ""} onChange={(e) => setForm({ ...form, template_category: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Layout</Label>
            <Select value={layoutId} onValueChange={setLayoutId}>
              <SelectTrigger><SelectValue placeholder="Choose layout" /></SelectTrigger>
              <SelectContent>
                {layouts.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Body (HTML, supports {`{{tokens}}`})</Label>
            <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />{saving ? "Saving…" : "Save & Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
