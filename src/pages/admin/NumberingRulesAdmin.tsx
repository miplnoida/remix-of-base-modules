import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Pencil, Plus, Copy, RotateCcw, Eye, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  coreNumberingService,
  type CoreNumberSequence,
  type NumberAuditEntry,
  USED_BY_REGISTRY,
} from "@/services/core/coreNumberingService";

const RESET_OPTIONS = ["NEVER", "YEARLY", "MONTHLY", "DAILY"] as const;
const TOKEN_HELP = "{MODULE} {ENTITY} {COUNTRY} {YYYY} {YY} {MM} {DD} {SEQ} {BRANCH} {DEPARTMENT}";

type EditDraft = Partial<Pick<CoreNumberSequence,
  "prefix_pattern" | "number_pattern" | "padding_length" | "separator" | "reset_frequency" | "is_active" | "description"
>>;

export default function NumberingRulesAdmin() {
  const [rows, setRows] = useState<CoreNumberSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [audit, setAudit] = useState<NumberAuditEntry[]>([]);
  const [lastIssued, setLastIssued] = useState<NumberAuditEntry | null>(null);
  const [filterModule, setFilterModule] = useState<string>("ALL");

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<EditDraft>({});
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setRows(await coreNumberingService.listSequences());
    } catch (e: any) {
      toast.error("Failed to load sequences", { description: e?.message });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void refresh(); }, []);

  const modules = useMemo(() => Array.from(new Set(rows.map(r => r.module_code))).sort(), [rows]);
  const filtered = useMemo(
    () => rows.filter(r => filterModule === "ALL" || r.module_code === filterModule),
    [rows, filterModule],
  );
  const selected = useMemo(() => rows.find(r => r.id === selectedId) ?? null, [rows, selectedId]);

  // Warn if any USED_BY entry has no active sequence
  const missingSequences = useMemo(() => {
    return USED_BY_REGISTRY.filter(u =>
      !rows.some(r => r.module_code === u.module_code && r.entity_type === u.entity_type && r.is_active)
    );
  }, [rows]);

  useEffect(() => {
    setPreview(null); setAudit([]); setLastIssued(null);
    setIsEditing(false); setDraft({});
    if (selected) void loadDetailMeta(selected.id);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDetailMeta(id: string) {
    try {
      const [p, last] = await Promise.all([
        coreNumberingService.preview({
          moduleCode: selected!.module_code,
          entityType: selected!.entity_type,
          countryCode: selected!.country_code,
        }).catch(() => null),
        coreNumberingService.lastIssuedNumber(id).catch(() => null),
      ]);
      setPreview(p);
      setLastIssued(last);
    } catch { /* noop */ }
  }

  function startEdit() {
    if (!selected) return;
    setDraft({
      prefix_pattern: selected.prefix_pattern,
      number_pattern: selected.number_pattern,
      padding_length: selected.padding_length,
      separator: selected.separator,
      reset_frequency: selected.reset_frequency,
      is_active: selected.is_active,
      description: selected.description,
    });
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setDraft({});
  }

  async function saveEdit() {
    if (!selected) return;
    const patternErrors = coreNumberingService.validatePattern(draft.number_pattern ?? selected.number_pattern);
    if (patternErrors.length) {
      toast.error("Invalid pattern", { description: patternErrors.join(", ") });
      return;
    }
    if ((draft.padding_length ?? selected.padding_length) < 1) {
      toast.error("Padding must be at least 1");
      return;
    }
    setSaving(true);
    try {
      const updated = await coreNumberingService.updateSequence(selected.id, draft);
      setRows(prev => prev.map(r => r.id === updated.id ? updated : r));
      setIsEditing(false);
      setDraft({});
      toast.success("Sequence saved");
      void loadDetailMeta(updated.id);
    } catch (e: any) {
      toast.error("Save failed", { description: e?.message });
    } finally {
      setSaving(false);
    }
  }

  async function previewNext() {
    if (!selected) return;
    try {
      const p = await coreNumberingService.preview({
        moduleCode: selected.module_code,
        entityType: selected.entity_type,
        countryCode: selected.country_code,
      });
      setPreview(p);
    } catch (e: any) {
      toast.error("Preview failed", { description: e?.message });
    }
  }

  async function loadAudit() {
    if (!selected) return;
    try {
      setAudit(await coreNumberingService.listAudit(selected.id, 200));
    } catch (e: any) {
      toast.error("Failed to load audit", { description: e?.message });
    }
  }

  async function duplicateSelected() {
    if (!selected) return;
    try {
      const copy = await coreNumberingService.duplicateSequence(selected.id);
      toast.success(`Created copy: ${copy.entity_type} (inactive)`);
      await refresh();
      setSelectedId(copy.id);
    } catch (e: any) {
      toast.error("Duplicate failed", { description: e?.message });
    }
  }

  // -------------------- UI --------------------
  if (typeof document !== "undefined") document.title = "Numbering Rules | Core Configuration";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Numbering Rules</h1>
          <p className="text-sm text-muted-foreground">
            Central, configurable reference-number generation used by every module. Tokens: <code className="text-xs">{TOKEN_HELP}</code>
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" />New Sequence</Button>
      </div>

      {missingSequences.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Missing active sequences ({missingSequences.length})</AlertTitle>
          <AlertDescription>
            The following module/entity codes are wired in code but have no active sequence — number generation will fail:{" "}
            <span className="font-mono">{missingSequences.map(m => `${m.module_code}/${m.entity_type}`).join(", ")}</span>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Sequences</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Module</Label>
              <Select value={filterModule} onValueChange={setFilterModule}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  {modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => void refresh()}>Refresh</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Pattern</TableHead>
                  <TableHead>Pad</TableHead>
                  <TableHead>Reset</TableHead>
                  <TableHead className="text-right">Current #</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No sequences configured</TableCell></TableRow>
                )}
                {filtered.map(r => (
                  <TableRow
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`cursor-pointer ${selectedId === r.id ? "bg-muted/50" : ""}`}
                  >
                    <TableCell>{r.module_code}</TableCell>
                    <TableCell className="font-mono text-xs">{r.entity_type}</TableCell>
                    <TableCell>{r.country_code}</TableCell>
                    <TableCell className="font-mono text-xs">{r.number_pattern}</TableCell>
                    <TableCell>{r.padding_length}</TableCell>
                    <TableCell>{r.reset_frequency}</TableCell>
                    <TableCell className="text-right font-mono">{r.current_number}</TableCell>
                    <TableCell>
                      <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sequence Detail</CardTitle>
            {selected && (
              <div className="flex gap-1">
                {!isEditing && <Button size="sm" variant="outline" onClick={startEdit}><Pencil className="h-3 w-3 mr-1" />Edit</Button>}
                {!isEditing && <Button size="sm" variant="outline" onClick={duplicateSelected}><Copy className="h-3 w-3 mr-1" />Duplicate</Button>}
                {!isEditing && <Button size="sm" variant="outline" onClick={() => setResetOpen(true)}><RotateCcw className="h-3 w-3 mr-1" />Adjust</Button>}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-sm text-muted-foreground">Select a sequence to edit, preview, or audit.</p>
            ) : (
              <Tabs defaultValue="edit">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                  <TabsTrigger value="preview" onClick={() => void previewNext()}>Preview</TabsTrigger>
                  <TabsTrigger value="audit" onClick={() => void loadAudit()}>Audit</TabsTrigger>
                  <TabsTrigger value="usedby">Used By</TabsTrigger>
                </TabsList>

                <TabsContent value="edit" className="space-y-3 pt-3">
                  <div className="rounded border bg-muted/40 p-3 grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Current running #</span><div className="font-mono text-lg">{selected.current_number}</div></div>
                    <div><span className="text-muted-foreground">Next (preview)</span><div className="font-mono text-lg">{preview ?? "—"}</div></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Last issued</span>
                      <div className="font-mono text-xs">{lastIssued ? `${lastIssued.generated_number} • ${new Date(lastIssued.generated_at).toLocaleString()}` : "—"}</div>
                    </div>
                  </div>

                  <div>
                    <Label>Module / Entity / Country</Label>
                    <Input readOnly value={`${selected.module_code} / ${selected.entity_type} / ${selected.country_code}`} />
                  </div>
                  <div>
                    <Label>Prefix Pattern</Label>
                    <Input
                      disabled={!isEditing}
                      value={isEditing ? (draft.prefix_pattern ?? "") : selected.prefix_pattern}
                      onChange={e => setDraft(d => ({ ...d, prefix_pattern: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Number Pattern</Label>
                    <Input
                      disabled={!isEditing}
                      className="font-mono"
                      value={isEditing ? (draft.number_pattern ?? "") : selected.number_pattern}
                      onChange={e => setDraft(d => ({ ...d, number_pattern: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Tokens: {TOKEN_HELP}. Must contain <code>{"{SEQ}"}</code>.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Padding</Label>
                      <Input
                        disabled={!isEditing}
                        type="number"
                        value={isEditing ? (draft.padding_length ?? 0) : selected.padding_length}
                        onChange={e => setDraft(d => ({ ...d, padding_length: parseInt(e.target.value, 10) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label>Separator</Label>
                      <Input
                        disabled={!isEditing}
                        value={isEditing ? (draft.separator ?? "") : selected.separator}
                        onChange={e => setDraft(d => ({ ...d, separator: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Reset Frequency</Label>
                    <Select
                      disabled={!isEditing}
                      value={(isEditing ? draft.reset_frequency : selected.reset_frequency) as string}
                      onValueChange={(v) => setDraft(d => ({ ...d, reset_frequency: v as any }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RESET_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between border rounded p-2">
                    <Label>Active</Label>
                    <Switch
                      disabled={!isEditing}
                      checked={isEditing ? !!draft.is_active : selected.is_active}
                      onCheckedChange={(v) => setDraft(d => ({ ...d, is_active: v }))}
                    />
                  </div>

                  {isEditing && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={saveEdit} disabled={saving}><Save className="h-3 w-3 mr-1" />{saving ? "Saving…" : "Save"}</Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}><X className="h-3 w-3 mr-1" />Cancel</Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="preview" className="space-y-3 pt-3">
                  <p className="text-sm text-muted-foreground">Read-only preview. No number is consumed.</p>
                  <div className="rounded border p-3 font-mono text-base">{preview ?? "—"}</div>
                  <Button onClick={() => void previewNext()} size="sm"><Eye className="h-3 w-3 mr-1" />Refresh preview</Button>
                </TabsContent>

                <TabsContent value="audit" className="space-y-3 pt-3">
                  <p className="text-sm text-muted-foreground">Last 200 numbers issued / adjusted for this sequence.</p>
                  <div className="max-h-96 overflow-auto border rounded">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Number / Action</TableHead>
                          <TableHead>Seq</TableHead>
                          <TableHead>By</TableHead>
                          <TableHead>When</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {audit.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No entries</TableCell></TableRow>
                        )}
                        {audit.map(a => (
                          <TableRow key={a.id}>
                            <TableCell className="font-mono text-xs">
                              {a.generated_number}
                              {a.override_reason && <div className="text-muted-foreground italic">{a.override_reason}</div>}
                            </TableCell>
                            <TableCell>{a.sequence_value}</TableCell>
                            <TableCell>{a.generated_by ?? "—"}</TableCell>
                            <TableCell className="text-xs">{new Date(a.generated_at).toLocaleString()}</TableCell>
                            <TableCell>
                              {a.is_override ? <Badge variant="destructive">Override</Badge> : <Badge variant="secondary">Auto</Badge>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="usedby" className="space-y-3 pt-3">
                  <p className="text-sm text-muted-foreground">Code locations consuming this sequence.</p>
                  <div className="border rounded">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Used In</TableHead>
                          <TableHead>Purpose</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {USED_BY_REGISTRY.filter(u => u.module_code === selected.module_code && u.entity_type === selected.entity_type).map((u, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{u.used_in}</TableCell>
                            <TableCell className="text-xs">{u.description}</TableCell>
                          </TableRow>
                        ))}
                        {USED_BY_REGISTRY.filter(u => u.module_code === selected.module_code && u.entity_type === selected.entity_type).length === 0 && (
                          <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No registered consumers — sequence is orphaned.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateSequenceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        existing={rows}
        onCreated={async (id) => { await refresh(); setSelectedId(id); }}
      />
      {selected && (
        <ResetSequenceDialog
          open={resetOpen}
          onOpenChange={setResetOpen}
          sequence={selected}
          onDone={async () => { await refresh(); }}
        />
      )}
    </div>
  );
}

// =====================================================================
// Create dialog
// =====================================================================
function CreateSequenceDialog({
  open, onOpenChange, existing, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing: CoreNumberSequence[];
  onCreated: (id: string) => void | Promise<void>;
}) {
  const [form, setForm] = useState({
    module_code: "", entity_type: "", country_code: "SKN",
    prefix_pattern: "", number_pattern: "", padding_length: 6,
    separator: "-", reset_frequency: "YEARLY" as CoreNumberSequence["reset_frequency"],
    description: "", is_active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        module_code: "", entity_type: "", country_code: "SKN",
        prefix_pattern: "", number_pattern: "", padding_length: 6,
        separator: "-", reset_frequency: "YEARLY", description: "", is_active: true,
      });
    }
  }, [open]);

  async function submit() {
    const errs = coreNumberingService.validatePattern(form.number_pattern);
    if (!form.module_code || !form.entity_type) {
      toast.error("Module and Entity codes are required"); return;
    }
    if (errs.length) { toast.error("Invalid pattern", { description: errs.join(", ") }); return; }
    const dup = existing.find(r =>
      r.module_code === form.module_code.toUpperCase() &&
      r.entity_type === form.entity_type.toUpperCase() &&
      r.country_code === form.country_code.toUpperCase() &&
      r.is_active && form.is_active,
    );
    if (dup) { toast.error("An active sequence already exists for this module/entity/country"); return; }
    setSaving(true);
    try {
      const created = await coreNumberingService.createSequence(form);
      toast.success("Sequence created");
      onOpenChange(false);
      await onCreated(created.id);
    } catch (e: any) {
      toast.error("Create failed", { description: e?.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Numbering Sequence</DialogTitle>
          <DialogDescription>Pattern must contain {"{SEQ}"}.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Module Code</Label><Input value={form.module_code} onChange={e => setForm(f => ({ ...f, module_code: e.target.value }))} /></div>
          <div><Label>Entity Type</Label><Input value={form.entity_type} onChange={e => setForm(f => ({ ...f, entity_type: e.target.value }))} /></div>
          <div><Label>Country</Label><Input value={form.country_code} onChange={e => setForm(f => ({ ...f, country_code: e.target.value }))} /></div>
          <div><Label>Padding</Label><Input type="number" value={form.padding_length} onChange={e => setForm(f => ({ ...f, padding_length: parseInt(e.target.value, 10) || 0 }))} /></div>
          <div className="col-span-2"><Label>Prefix Pattern</Label><Input value={form.prefix_pattern} onChange={e => setForm(f => ({ ...f, prefix_pattern: e.target.value }))} /></div>
          <div className="col-span-2"><Label>Number Pattern</Label><Input className="font-mono" placeholder="LG-SKN-{YYYY}-{SEQ}" value={form.number_pattern} onChange={e => setForm(f => ({ ...f, number_pattern: e.target.value }))} /></div>
          <div><Label>Separator</Label><Input value={form.separator} onChange={e => setForm(f => ({ ...f, separator: e.target.value }))} /></div>
          <div>
            <Label>Reset</Label>
            <Select value={form.reset_frequency} onValueChange={v => setForm(f => ({ ...f, reset_frequency: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RESET_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="col-span-2 flex items-center justify-between border rounded p-2">
            <Label>Active</Label>
            <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Creating…" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================================
// Reset / Adjust dialog
// =====================================================================
function ResetSequenceDialog({
  open, onOpenChange, sequence, onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sequence: CoreNumberSequence;
  onDone: () => void | Promise<void>;
}) {
  const [newCurrent, setNewCurrent] = useState<number>(sequence.current_number);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setNewCurrent(sequence.current_number); setReason(""); }
  }, [open, sequence.current_number]);

  async function submit() {
    if (reason.trim().length < 3) { toast.error("Reason is required (min 3 chars)"); return; }
    if (newCurrent < 0) { toast.error("Number must be >= 0"); return; }
    setSaving(true);
    try {
      await coreNumberingService.resetSequence(sequence.id, newCurrent, reason.trim());
      toast.success("Sequence adjusted");
      onOpenChange(false);
      await onDone();
    } catch (e: any) {
      toast.error("Adjust failed", { description: e?.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset / Adjust Current Number</DialogTitle>
          <DialogDescription>
            This changes the running counter for <span className="font-mono">{sequence.module_code}/{sequence.entity_type}/{sequence.country_code}</span>. Action is audited.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Current</Label>
            <Input readOnly value={sequence.current_number} />
          </div>
          <div>
            <Label>New Current Number</Label>
            <Input type="number" value={newCurrent} onChange={e => setNewCurrent(parseInt(e.target.value, 10) || 0)} />
          </div>
          <div>
            <Label>Reason (required)</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this adjustment needed?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={saving}>{saving ? "Saving…" : "Apply Adjustment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
