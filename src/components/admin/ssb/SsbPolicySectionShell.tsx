/**
 * SsbPolicySectionShell
 *
 * Data-driven policy configuration surface shared by every SSB Setup
 * section. Consumes the SSB policy tables directly and delegates all
 * lifecycle actions (approve / schedule / activate / retire / new
 * version) to `ssbPolicyLifecycleService`. Never overwrites an ACTIVE
 * row — editing an active row creates a new DRAFT version first.
 */
import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, CheckCircle2, Clock3, Archive, PlayCircle, FilePenLine,
  ChevronDown, ChevronRight, XCircle, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  approvePolicy, schedulePolicy, activatePolicy, retirePolicy,
  createNewVersion, type SsbPolicyTable,
} from "@/services/ssb/ssbPolicyLifecycleService";
import { useSsbImplementationConfig } from "@/hooks/ssb/useSsbImplementationConfig";
import { evaluateAssetHealth, type PolicyHealth } from "@/services/ssb/ssbPolicyHealthService";

const db: any = supabase;

// -------------------------------------------------------------------
// Field schema — one entry per editable column on the policy table.
// -------------------------------------------------------------------

export type FieldType =
  | "text" | "textarea" | "number" | "boolean"
  | "select" | "multiselect" | "json";

export interface FieldOption { value: string; label: string }

export interface FieldSpec {
  name: string;                       // column name on the policy table
  label: string;
  type: FieldType;
  required?: boolean;
  helpText?: string;
  options?: FieldOption[];            // for select / multiselect
  placeholder?: string;
}

export interface SectionConfig {
  sectionKey: string;
  assetKey: string;                   // e.g. "ssb.address"
  table: SsbPolicyTable;
  title: string;
  description: string;
  /** Scope keys shown as identity columns in the version table. */
  scopeColumns: string[];
  /** Columns rendered as form fields. */
  fields: FieldSpec[];
  /** Default value used when creating a brand-new draft row. */
  newDraftDefaults: (profileId: string) => Record<string, any>;
}

// -------------------------------------------------------------------
// Health chip
// -------------------------------------------------------------------

const healthMeta: Record<PolicyHealth, { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  ready:    { label: "Ready",    cls: "bg-emerald-100 text-emerald-800 border-emerald-300", Icon: CheckCircle2 },
  partial:  { label: "Partial",  cls: "bg-amber-100 text-amber-800 border-amber-300",       Icon: Clock3 },
  missing:  { label: "Missing",  cls: "bg-rose-100 text-rose-800 border-rose-300",          Icon: XCircle },
  deferred: { label: "Deferred", cls: "bg-slate-100 text-slate-700 border-slate-300",       Icon: Archive },
  error:    { label: "Error",    cls: "bg-rose-100 text-rose-800 border-rose-300",          Icon: XCircle },
};

function HealthChip({ h }: { h: PolicyHealth }) {
  const m = healthMeta[h];
  return (
    <Badge variant="outline" className={`gap-1 ${m.cls}`}>
      <m.Icon className="h-3 w-3" /> {m.label}
    </Badge>
  );
}

// -------------------------------------------------------------------
// Field renderer
// -------------------------------------------------------------------

function toArray(v: any): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (v == null || v === "") return [];
  if (typeof v === "string") {
    try { const parsed = JSON.parse(v); return Array.isArray(parsed) ? parsed.map(String) : v.split(",").map((s) => s.trim()).filter(Boolean); }
    catch { return v.split(",").map((s) => s.trim()).filter(Boolean); }
  }
  return [];
}

function FieldInput({ field, value, onChange, disabled }: { field: FieldSpec; value: any; onChange: (v: any) => void; disabled?: boolean }) {
  switch (field.type) {
    case "text":
      return <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} disabled={disabled} />;
    case "textarea":
      return <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} disabled={disabled} rows={3} />;
    case "number":
      return <Input type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} disabled={disabled} />;
    case "boolean":
      return <Switch checked={!!value} onCheckedChange={onChange} disabled={disabled} />;
    case "select":
      return (
        <Select value={value ?? ""} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger><SelectValue placeholder={field.placeholder ?? "Select"} /></SelectTrigger>
          <SelectContent>
            {field.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    case "multiselect": {
      const selected = toArray(value);
      return (
        <div className="flex flex-wrap gap-2 rounded-md border p-2 min-h-[42px]">
          {field.options?.map((o) => {
            const active = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange(active ? selected.filter((x) => x !== o.value) : [...selected, o.value])}
                className={`px-2 py-1 rounded-md text-xs border ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      );
    }
    case "json":
      return (
        <Textarea
          value={typeof value === "string" ? value : JSON.stringify(value ?? null, null, 2)}
          onChange={(e) => { try { onChange(JSON.parse(e.target.value)); } catch { onChange(e.target.value); } }}
          rows={4} className="font-mono text-xs" disabled={disabled}
        />
      );
  }
}

function statusColor(status: string) {
  const s = (status ?? "").toUpperCase();
  if (s === "ACTIVE")     return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (s === "SCHEDULED")  return "bg-sky-100 text-sky-800 border-sky-300";
  if (s === "DRAFT")      return "bg-amber-100 text-amber-800 border-amber-300";
  if (s === "SUPERSEDED") return "bg-slate-100 text-slate-700 border-slate-300";
  if (s === "RETIRED")    return "bg-rose-100 text-rose-800 border-rose-300";
  return "bg-slate-100 text-slate-700 border-slate-300";
}

// -------------------------------------------------------------------
// Row editor
// -------------------------------------------------------------------

function RowEditor({
  config, row, profileId, onSaved, onCancel,
}: {
  config: SectionConfig; row: any | null; profileId: string;
  onSaved: () => void; onCancel: () => void;
}) {
  const initial = row ?? config.newDraftDefaults(profileId);
  const [values, setValues] = useState<Record<string, any>>(initial);
  const [saving, setSaving] = useState(false);
  const isNew = !row;
  const isActive = (row?.status ?? "").toUpperCase() === "ACTIVE";

  const save = async () => {
    setSaving(true);
    try {
      // Editing an ACTIVE row → clone as DRAFT first, then patch clone.
      if (isActive) {
        const draft = await createNewVersion({ table: config.table, fromPolicyId: row.id });
        const patch: Record<string, any> = {};
        for (const f of config.fields) patch[f.name] = values[f.name];
        const { error } = await db.from(config.table).update(patch).eq("id", draft.id);
        if (error) throw error;
        toast.success("New DRAFT version created from active row");
      } else if (isNew) {
        const payload: Record<string, any> = {
          profile_id: profileId, status: "DRAFT", is_current: false, version_no: 1,
        };
        for (const f of config.fields) payload[f.name] = values[f.name];
        // include scope columns not in fields
        for (const sc of config.scopeColumns) {
          if (payload[sc] === undefined && values[sc] !== undefined) payload[sc] = values[sc];
        }
        const { error } = await db.from(config.table).insert(payload);
        if (error) throw error;
        toast.success("Draft created");
      } else {
        // DRAFT / SCHEDULED — update in place
        const patch: Record<string, any> = {};
        for (const f of config.fields) patch[f.name] = values[f.name];
        const { error } = await db.from(config.table).update(patch).eq("id", row.id);
        if (error) throw error;
        toast.success("Saved");
      }
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "New draft" : isActive ? "Edit active (clones as new draft)" : `Edit ${row.status}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {/* Scope columns for new drafts */}
          {isNew && config.scopeColumns.filter((sc) => sc !== "profile_id" && !config.fields.some((f) => f.name === sc)).map((sc) => (
            <div key={sc}>
              <Label className="text-xs">{sc}</Label>
              <Input value={values[sc] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [sc]: e.target.value }))} placeholder={sc} />
            </div>
          ))}
          {config.fields.map((f) => (
            <div key={f.name} className={f.type === "boolean" ? "flex items-center justify-between" : ""}>
              <Label className="text-xs">
                {f.label}{f.required && <span className="text-rose-600"> *</span>}
                {f.helpText && <span className="ml-1 text-muted-foreground font-normal">— {f.helpText}</span>}
              </Label>
              <div className={f.type === "boolean" ? "" : "mt-1"}>
                <FieldInput field={f} value={values[f.name]} onChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))} />
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save draft"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------------
// Shell
// -------------------------------------------------------------------

export function SsbPolicySectionShell({ config }: { config: SectionConfig }) {
  const qc = useQueryClient();
  const { data: profile } = useSsbImplementationConfig();
  const profileId = profile?.id;

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["ssb-policy", config.table, profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await db.from(config.table)
        .select("*")
        .eq("profile_id", profileId)
        .order("version_no", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: health } = useQuery({
    queryKey: ["ssb-health", config.assetKey, profileId, rows.length],
    enabled: !!profileId,
    queryFn: () => evaluateAssetHealth(config.assetKey),
  });

  const [editing, setEditing] = useState<any | "new" | null>(null);

  const refresh = () => { refetch(); qc.invalidateQueries({ queryKey: ["ssb-health"] }); qc.invalidateQueries({ queryKey: ["cg"] }); };

  const doAction = async (fn: () => Promise<any>, msg: string) => {
    try { await fn(); toast.success(msg); refresh(); }
    catch (e: any) { toast.error(e.message ?? "Action failed"); }
  };

  const activeRows = rows.filter((r: any) => r.status === "ACTIVE" && r.is_current);

  if (!profileId) {
    return <div className="text-sm text-muted-foreground p-4">Loading KN profile…</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {config.title}
              </CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {health && <HealthChip h={health.health} />}
              <Button size="sm" onClick={() => setEditing("new")}>
                <Plus className="mr-1 h-4 w-4" /> New draft
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {health && health.reasons.length > 0 && health.health !== "ready" && (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <div className="font-medium mb-1">Health notes</div>
              <ul className="list-disc list-inside space-y-0.5">
                {health.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading policies…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-md">
              No policy rows yet. Click <b>New draft</b> to add one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {config.scopeColumns.filter((c) => c !== "profile_id").map((c) => (
                    <TableHead key={c} className="text-xs">{c}</TableHead>
                  ))}
                  <TableHead>Status</TableHead>
                  <TableHead>Ver</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any) => {
                  const status = (r.status ?? "").toUpperCase();
                  return (
                    <TableRow key={r.id}>
                      {config.scopeColumns.filter((c) => c !== "profile_id").map((c) => (
                        <TableCell key={c} className="text-xs">{String(r[c] ?? "—")}</TableCell>
                      ))}
                      <TableCell>
                        <Badge variant="outline" className={statusColor(status)}>{status}</Badge>
                        {r.is_current && <Badge variant="outline" className="ml-1 text-[10px]">current</Badge>}
                      </TableCell>
                      <TableCell className="text-xs">v{r.version_no}</TableCell>
                      <TableCell className="text-xs">{r.effective_from ?? "—"}{r.effective_to ? ` → ${r.effective_to}` : ""}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                          <FilePenLine className="h-3.5 w-3.5" />
                        </Button>
                        {status === "DRAFT" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => doAction(() => approvePolicy({ table: config.table, policyId: r.id }), "Approved")}>Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => doAction(() => schedulePolicy({ table: config.table, policyId: r.id, effectiveFrom: new Date().toISOString().slice(0, 10) }), "Scheduled")}>Schedule</Button>
                            <Button size="sm" onClick={() => doAction(() => activatePolicy({ table: config.table, policyId: r.id }), "Activated")}>
                              <PlayCircle className="mr-1 h-3.5 w-3.5" />Activate
                            </Button>
                          </>
                        )}
                        {status === "SCHEDULED" && (
                          <Button size="sm" onClick={() => doAction(() => activatePolicy({ table: config.table, policyId: r.id }), "Activated")}>
                            <PlayCircle className="mr-1 h-3.5 w-3.5" />Activate now
                          </Button>
                        )}
                        {status === "ACTIVE" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => doAction(() => createNewVersion({ table: config.table, fromPolicyId: r.id }), "New draft version created")}>New version</Button>
                            <Button size="sm" variant="outline" onClick={() => doAction(() => retirePolicy({ table: config.table, policyId: r.id, reason: "Retired via SSB Setup" }), "Retired")}>Retire</Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <div className="mt-4 text-xs text-muted-foreground">
            {activeRows.length} active · {rows.length} total versions · Table <code>{config.table}</code> · Asset <code>{config.assetKey}</code>
          </div>
        </CardContent>
      </Card>

      {editing !== null && (
        <RowEditor
          config={config}
          row={editing === "new" ? null : editing}
          profileId={profileId}
          onSaved={() => { setEditing(null); refresh(); }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
