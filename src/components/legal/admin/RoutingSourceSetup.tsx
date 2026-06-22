import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLegalTeams, useLegalReferenceValues } from "@/hooks/legal/useLegalTeams";
import { useLgSources, useLgSourceAllowance } from "@/hooks/legal/useLgCaseSourceConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Save, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { SourceCaseType, SourceConfig, SourceStage } from "@/services/legal/lgCaseSourceConfigService";

const sb = supabase as any;
const COUNTRY = "SKN";
const NONE = "__none__";
const toDb = (v?: string | null) => (!v || v === NONE ? null : v);
const fromDb = (v: string | null | undefined) => v ?? NONE;

export default function RoutingSourceSetup() {
  const qc = useQueryClient();
  const { data: sources = [] } = useLgSources();
  const { data: teams = [] } = useLegalTeams();
  const { data: workbaskets = [] } = useLegalReferenceValues("LG_WORKBASKET");
  const { data: stages = [] } = useLegalReferenceValues("LG_CASE_STAGE");
  const { data: caseTypes = [] } = useLegalReferenceValues("LG_CASE_TYPE");
  const { data: priorities = [] } = useLegalReferenceValues("LG_PRIORITY");
  const activeTeams = (teams as any[]).filter((t) => t.is_active);

  const [selected, setSelected] = useState<string | null>(null);
  const currentSource = sources.find((s) => s.source_code === selected) ?? sources[0] ?? null;
  const selectedCode = currentSource?.source_code ?? null;

  const { data: allowance } = useLgSourceAllowance(selectedCode);

  // ---- mutations ----
  async function patchSource(source: SourceConfig, patch: Partial<SourceConfig>) {
    const { error } = await sb.from("lg_case_source_config").update(patch).eq("id", source.id);
    if (error) return toast.error("Save failed", { description: error.message });
    qc.invalidateQueries({ queryKey: ["lg_case_source_config_all", COUNTRY] });
    qc.invalidateQueries({ queryKey: ["lg_case_source_allowance", COUNTRY, source.source_code] });
  }

  async function addCaseType(case_type_code: string) {
    if (!selectedCode) return;
    const { error } = await sb.from("lg_case_source_case_type").insert({
      country_code: COUNTRY, source_code: selectedCode, case_type_code, is_active: true,
    });
    if (error) return toast.error("Add failed", { description: error.message });
    qc.invalidateQueries({ queryKey: ["lg_case_source_allowance", COUNTRY, selectedCode] });
  }
  async function patchCaseType(row: SourceCaseType, patch: Partial<SourceCaseType>) {
    const { error } = await sb.from("lg_case_source_case_type").update(patch).eq("id", row.id);
    if (error) return toast.error("Save failed", { description: error.message });
    qc.invalidateQueries({ queryKey: ["lg_case_source_allowance", COUNTRY, row.source_code] });
  }
  async function removeCaseType(row: SourceCaseType) {
    const { error } = await sb.from("lg_case_source_case_type").delete().eq("id", row.id);
    if (error) return toast.error("Delete failed", { description: error.message });
    qc.invalidateQueries({ queryKey: ["lg_case_source_allowance", COUNTRY, row.source_code] });
  }

  async function addStage(stage_code: string) {
    if (!selectedCode) return;
    const { error } = await sb.from("lg_case_source_stage").insert({
      country_code: COUNTRY, source_code: selectedCode, stage_code,
      allowed_as_initial_stage: true, allowed_as_transition_stage: true, is_active: true,
    });
    if (error) return toast.error("Add failed", { description: error.message });
    qc.invalidateQueries({ queryKey: ["lg_case_source_allowance", COUNTRY, selectedCode] });
  }
  async function patchStage(row: SourceStage, patch: Partial<SourceStage>) {
    const { error } = await sb.from("lg_case_source_stage").update(patch).eq("id", row.id);
    if (error) return toast.error("Save failed", { description: error.message });
    qc.invalidateQueries({ queryKey: ["lg_case_source_allowance", COUNTRY, row.source_code] });
  }
  async function removeStage(row: SourceStage) {
    const { error } = await sb.from("lg_case_source_stage").delete().eq("id", row.id);
    if (error) return toast.error("Delete failed", { description: error.message });
    qc.invalidateQueries({ queryKey: ["lg_case_source_allowance", COUNTRY, row.source_code] });
  }

  const usedCaseTypes = new Set((allowance?.caseTypes ?? []).map((c) => c.case_type_code));
  const usedStages = new Set((allowance?.stages ?? []).map((s) => s.stage_code));
  const availCaseTypes = (caseTypes as any[]).filter((c) => !usedCaseTypes.has(c.value_code));
  const availStages = (stages as any[]).filter((s) => !usedStages.has(s.value_code));

  const warnings = useMemo(() => {
    if (!allowance?.source) return [] as string[];
    const w: string[] = [];
    if ((allowance.caseTypes ?? []).length === 0) w.push("This source has no allowed case types — cases cannot be created from it.");
    if (!(allowance.stages ?? []).some((s) => s.allowed_as_initial_stage)) w.push("This source has no allowed initial stage — cases cannot start.");
    return w;
  }, [allowance]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Source Setup</CardTitle>
        <CardDescription>
          Configure each case source: what case types it can raise, what stages it can start in, and default routing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Source picker chips */}
        <div className="flex flex-wrap gap-1.5">
          {sources.map((s) => (
            <Button
              key={s.source_code}
              variant={selectedCode === s.source_code ? "default" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setSelected(s.source_code)}
            >
              {s.source_name}
              {!s.is_active && <span className="ml-1.5 text-[10px] opacity-60">(off)</span>}
            </Button>
          ))}
        </div>

        {currentSource && (
          <>
            {warnings.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-1">
                {warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            <Tabs defaultValue="defaults">
              <TabsList>
                <TabsTrigger value="defaults">A. Defaults</TabsTrigger>
                <TabsTrigger value="types">B. Allowed Case Types</TabsTrigger>
                <TabsTrigger value="stages">C. Allowed Stages</TabsTrigger>
              </TabsList>

              {/* A. Defaults */}
              <TabsContent value="defaults" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Default Stage">
                    <Select value={fromDb(currentSource.default_stage_code)} onValueChange={(v) => patchSource(currentSource, { default_stage_code: toDb(v) })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>—</SelectItem>
                        {(stages as any[]).map((s) => <SelectItem key={s.value_code} value={s.value_code}>{s.value_label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Default Workbasket">
                    <Select value={fromDb(currentSource.default_workbasket_code)} onValueChange={(v) => patchSource(currentSource, { default_workbasket_code: toDb(v) })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>—</SelectItem>
                        {(workbaskets as any[]).map((w) => <SelectItem key={w.value_code} value={w.value_code}>{w.value_label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Default Team">
                    <Select value={fromDb(currentSource.default_team_code)} onValueChange={(v) => patchSource(currentSource, { default_team_code: toDb(v) })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>—</SelectItem>
                        {activeTeams.map((t: any) => <SelectItem key={t.team_code} value={t.team_code}>{t.team_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="flex flex-wrap gap-4 pt-2 border-t">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={currentSource.allow_manual_entry}
                      onCheckedChange={(v) => patchSource(currentSource, { allow_manual_entry: v })}
                    />
                    <span>Allow manual entry</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={currentSource.is_active}
                      onCheckedChange={(v) => patchSource(currentSource, { is_active: v })}
                    />
                    <span>Source active</span>
                  </label>
                </div>
              </TabsContent>

              {/* B. Case types */}
              <TabsContent value="types" className="space-y-3">
                <div className="flex items-center gap-2">
                  <Select onValueChange={(v) => addCaseType(v)}>
                    <SelectTrigger className="h-9 max-w-sm"><SelectValue placeholder="Add allowed case type…" /></SelectTrigger>
                    <SelectContent>
                      {availCaseTypes.length === 0 ? (
                        <SelectItem value="__empty" disabled>All case types already added</SelectItem>
                      ) : availCaseTypes.map((c) => <SelectItem key={c.value_code} value={c.value_code}>{c.value_label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {(allowance?.caseTypes ?? []).length === 0 ? (
                  <EmptyHint>No case types configured for this source.</EmptyHint>
                ) : (
                  <div className="rounded-md border divide-y">
                    {(allowance?.caseTypes ?? []).map((row) => (
                      <div key={row.id} className="grid grid-cols-12 gap-2 p-2 items-center text-sm">
                        <div className="col-span-12 md:col-span-3 font-medium truncate">{row.case_type_code}</div>
                        <div className="col-span-6 md:col-span-3">
                          <Select value={fromDb(row.default_stage_code)} onValueChange={(v) => patchCaseType(row, { default_stage_code: toDb(v) })}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Stage default" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>Source default</SelectItem>
                              {(stages as any[]).map((s) => <SelectItem key={s.value_code} value={s.value_code}>{s.value_label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <Select value={fromDb(row.default_workbasket_code)} onValueChange={(v) => patchCaseType(row, { default_workbasket_code: toDb(v) })}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Workbasket default" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>Source default</SelectItem>
                              {(workbaskets as any[]).map((w) => <SelectItem key={w.value_code} value={w.value_code}>{w.value_label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-8 md:col-span-2">
                          <Select value={fromDb(row.priority_code)} onValueChange={(v) => patchCaseType(row, { priority_code: toDb(v) })}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Priority" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>—</SelectItem>
                              {((priorities as any[]).length ? (priorities as any[]).map((p) => p.value_code) : ["LOW","NORMAL","HIGH","URGENT"]).map((p: string) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-4 md:col-span-1 flex items-center justify-end gap-1">
                          <Switch checked={row.is_active} onCheckedChange={(v) => patchCaseType(row, { is_active: v })} />
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeCaseType(row)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* C. Stages */}
              <TabsContent value="stages" className="space-y-3">
                <div className="flex items-center gap-2">
                  <Select onValueChange={(v) => addStage(v)}>
                    <SelectTrigger className="h-9 max-w-sm"><SelectValue placeholder="Add allowed stage…" /></SelectTrigger>
                    <SelectContent>
                      {availStages.length === 0 ? (
                        <SelectItem value="__empty" disabled>All stages already added</SelectItem>
                      ) : availStages.map((s) => <SelectItem key={s.value_code} value={s.value_code}>{s.value_label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {(allowance?.stages ?? []).length === 0 ? (
                  <EmptyHint>No stages configured for this source.</EmptyHint>
                ) : (
                  <div className="rounded-md border divide-y">
                    <div className="grid grid-cols-12 gap-2 p-2 text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/40">
                      <div className="col-span-5">Stage</div>
                      <div className="col-span-3 text-center">Initial</div>
                      <div className="col-span-3 text-center">Transition</div>
                      <div className="col-span-1"></div>
                    </div>
                    {(allowance?.stages ?? []).map((row) => (
                      <div key={row.id} className="grid grid-cols-12 gap-2 p-2 items-center text-sm">
                        <div className="col-span-5 font-medium truncate">
                          {row.stage_code}
                          {!row.is_active && <Badge variant="outline" className="ml-2 text-[10px]">off</Badge>}
                        </div>
                        <div className="col-span-3 flex justify-center">
                          <Switch checked={row.allowed_as_initial_stage} onCheckedChange={(v) => patchStage(row, { allowed_as_initial_stage: v })} />
                        </div>
                        <div className="col-span-3 flex justify-center">
                          <Switch checked={row.allowed_as_transition_stage} onCheckedChange={(v) => patchStage(row, { allowed_as_transition_stage: v })} />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeStage(row)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
