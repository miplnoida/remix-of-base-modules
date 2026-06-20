import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Save, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserCode } from "@/hooks/useUserCode";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { useLegalFeeHeads } from "@/hooks/legal/useLgFinancials";
import {
  useFeeRules,
  useUpsertFeeRule,
  useSetRuleStatus,
  useFeeBundlesAdmin,
  useUpsertBundle,
  useSetBundleItems,
  useFeeEvents,
} from "@/hooks/legal/useLgFees";

const blankRule = {
  fee_rule_code: "",
  fee_rule_name: "",
  country_code: "KN",
  event_code: "",
  fee_head_id: "",
  fee_head_code: "",
  calculation_type: "FIXED",
  base_variable: "outstanding_amount",
  fixed_amount: 0,
  percentage_rate: 0,
  min_amount: null as number | null,
  max_amount: null as number | null,
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: null as string | null,
  auto_apply: true,
  allow_waiver: true,
  waiver_requires_approval: true,
  status: "ACTIVE",
};

const blankBundle = {
  bundle_code: "",
  bundle_name: "",
  country_code: "KN",
  trigger_event: "",
  status: "ACTIVE",
  description: "",
};

const LgFeeConfig: React.FC = () => {
  const access = useLgAccess();
  const { userCode } = useUserCode();
  const { toast } = useToast();

  const rules = useFeeRules();
  const bundles = useFeeBundlesAdmin();
  const heads = useLegalFeeHeads();
  const events = useFeeEvents();
  const upsertRule = useUpsertFeeRule();
  const setStatus = useSetRuleStatus();
  const upsertBundle = useUpsertBundle();
  const setItems = useSetBundleItems();

  const [editing, setEditing] = useState<any | null>(null);
  const [bundleEditing, setBundleEditing] = useState<any | null>(null);

  const headsList = heads.data ?? [];
  const headById = useMemo(() => new Map(headsList.map((h) => [h.id, h])), [headsList]);

  if (!access.can("configureFees") && !access.isAdmin) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Alert variant="destructive"><Lock className="h-4 w-4" /><AlertDescription>Manager / Admin required to configure legal fees.</AlertDescription></Alert>
      </div>
    );
  }

  const saveRule = async () => {
    if (!editing.fee_rule_code || !editing.fee_rule_name) { toast({ title: "Code and name required", variant: "destructive" }); return; }
    const head = headById.get(editing.fee_head_id);
    try {
      await upsertRule.mutateAsync({
        row: { ...editing, fee_head_code: head?.code ?? editing.fee_head_code, fixed_amount: Number(editing.fixed_amount) || null, percentage_rate: Number(editing.percentage_rate) || null, min_amount: editing.min_amount ?? null, max_amount: editing.max_amount ?? null },
        userCode,
      });
      setEditing(null);
      toast({ title: "Saved" });
    } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
  };

  const saveBundle = async () => {
    if (!bundleEditing.bundle_code || !bundleEditing.bundle_name) { toast({ title: "Code and name required", variant: "destructive" }); return; }
    try {
      const saved = await upsertBundle.mutateAsync({ row: { ...bundleEditing }, userCode });
      if (bundleEditing.items) {
        await setItems.mutateAsync({ bundleId: saved.id, items: bundleEditing.items });
      }
      setBundleEditing(null);
      toast({ title: "Bundle saved" });
    } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Legal Fee Configuration</h1>
            <p className="text-sm text-muted-foreground">Rules and bundles drive auto-applied legal fees. Fee heads are managed centrally in the Income Codes master.</p>
          </div>
        </div>

        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules">Rules ({rules.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="bundles">Bundles ({bundles.data?.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-3">
            <div className="flex justify-end"><Button onClick={() => setEditing({ ...blankRule })}><Plus className="h-4 w-4 mr-1" /> New Rule</Button></div>
            <Card><CardContent className="pt-4">
              {rules.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <div className="space-y-2">
                  {rules.data?.map((r) => (
                    <div key={r.id} className="border rounded p-3 text-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{r.fee_rule_code} — {r.fee_rule_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.fee_head_code} · {r.calculation_type} · event {r.event_code || "—"} · {r.effective_from}{r.effective_to ? ` → ${r.effective_to}` : ""}
                          </div>
                          <div className="text-xs">
                            {r.calculation_type === "FIXED" && `Amount ${Number(r.fixed_amount ?? 0).toFixed(2)}`}
                            {r.calculation_type === "PERCENTAGE" && `${((r.percentage_rate ?? 0) * 100).toFixed(2)}% of ${r.base_variable} (min ${r.min_amount ?? "—"} · max ${r.max_amount ?? "—"})`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={r.status === "ACTIVE" ? "default" : "outline"}>{r.status}</Badge>
                          {r.auto_apply && <Badge variant="secondary">AUTO</Badge>}
                          {r.allow_waiver && <Badge variant="outline">Waivable</Badge>}
                          <Button size="sm" variant="outline" onClick={() => setEditing({ ...r })}>Edit</Button>
                          <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: r.id, status: r.status === "ACTIVE" ? "INACTIVE" : "ACTIVE", userCode })}>
                            {r.status === "ACTIVE" ? "Disable" : "Enable"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="bundles" className="space-y-3">
            <div className="flex justify-end"><Button onClick={() => setBundleEditing({ ...blankBundle, items: [] })}><Plus className="h-4 w-4 mr-1" /> New Bundle</Button></div>
            <Card><CardContent className="pt-4">
              {bundles.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <div className="space-y-2">
                  {bundles.data?.map((b) => (
                    <div key={b.id} className="border rounded p-3 text-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{b.bundle_code} — {b.bundle_name}</div>
                          <div className="text-xs text-muted-foreground">Trigger: {b.trigger_event || "—"} · {b.items?.length ?? 0} items</div>
                          <ol className="text-xs list-decimal ml-5 mt-1">
                            {b.items?.map((it) => (
                              <li key={it.id}>{it.rule?.fee_rule_code} — {it.rule?.fee_rule_name} {it.mandatory ? "" : "(optional)"}</li>
                            ))}
                          </ol>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={b.status === "ACTIVE" ? "default" : "outline"}>{b.status}</Badge>
                          <Button size="sm" variant="outline" onClick={() => setBundleEditing({
                            ...b,
                            items: (b.items ?? []).map((it) => ({ fee_rule_id: it.fee_rule_id, sequence_no: it.sequence_no, mandatory: it.mandatory, allow_waiver: it.allow_waiver })),
                          })}>Edit</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Rule editor */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-background border rounded-lg shadow-lg max-w-2xl w-full p-4 space-y-3 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="font-semibold">{editing.id ? "Edit Rule" : "New Rule"}</div>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Code"><input className="input" value={editing.fee_rule_code} onChange={(e) => setEditing({ ...editing, fee_rule_code: e.target.value })} /></Field>
              <Field label="Name"><input className="input" value={editing.fee_rule_name} onChange={(e) => setEditing({ ...editing, fee_rule_name: e.target.value })} /></Field>
              <Field label="Fee Head (central master)">
                <select className="input" value={editing.fee_head_id || ""} onChange={(e) => setEditing({ ...editing, fee_head_id: e.target.value, fee_head_code: headById.get(e.target.value)?.code })}>
                  <option value="">Select…</option>
                  {headsList.map((h) => <option key={h.id} value={h.id}>{h.code} — {h.description}</option>)}
                </select>
              </Field>
              <Field label="Event">
                <select className="input" value={editing.event_code || ""} onChange={(e) => setEditing({ ...editing, event_code: e.target.value })}>
                  <option value="">—</option>
                  {events.data?.map((ev: any) => <option key={ev.value_code} value={ev.value_code}>{ev.value_label}</option>)}
                </select>
              </Field>
              <Field label="Calculation Type">
                <select className="input" value={editing.calculation_type} onChange={(e) => setEditing({ ...editing, calculation_type: e.target.value })}>
                  {["FIXED", "PERCENTAGE", "FORMULA", "TIER", "MANUAL"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Base Variable">
                <select className="input" value={editing.base_variable || ""} onChange={(e) => setEditing({ ...editing, base_variable: e.target.value })}>
                  {["", "claim_amount", "outstanding_amount", "arrears_amount", "number_of_hearings", "days_overdue", "risk_score", "employer_size"].map((b) => <option key={b} value={b}>{b || "—"}</option>)}
                </select>
              </Field>
              <Field label="Fixed Amount"><input type="number" step="0.01" className="input" value={editing.fixed_amount ?? ""} onChange={(e) => setEditing({ ...editing, fixed_amount: e.target.value })} /></Field>
              <Field label="Percentage Rate (e.g. 0.05 = 5%)"><input type="number" step="0.0001" className="input" value={editing.percentage_rate ?? ""} onChange={(e) => setEditing({ ...editing, percentage_rate: e.target.value })} /></Field>
              <Field label="Min Amount"><input type="number" step="0.01" className="input" value={editing.min_amount ?? ""} onChange={(e) => setEditing({ ...editing, min_amount: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
              <Field label="Max Amount"><input type="number" step="0.01" className="input" value={editing.max_amount ?? ""} onChange={(e) => setEditing({ ...editing, max_amount: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
              <Field label="Effective From"><input type="date" className="input" value={editing.effective_from} onChange={(e) => setEditing({ ...editing, effective_from: e.target.value })} /></Field>
              <Field label="Effective To"><input type="date" className="input" value={editing.effective_to ?? ""} onChange={(e) => setEditing({ ...editing, effective_to: e.target.value || null })} /></Field>
            </div>
            <div className="flex gap-4 text-sm flex-wrap">
              <label className="flex items-center gap-1"><input type="checkbox" checked={!!editing.auto_apply} onChange={(e) => setEditing({ ...editing, auto_apply: e.target.checked })} /> Auto-apply</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={!!editing.allow_waiver} onChange={(e) => setEditing({ ...editing, allow_waiver: e.target.checked })} /> Allow waiver</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={!!editing.waiver_requires_approval} onChange={(e) => setEditing({ ...editing, waiver_requires_approval: e.target.checked })} /> Waiver requires approval</label>
              <select className="input" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                {["ACTIVE", "INACTIVE", "DRAFT"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveRule} disabled={upsertRule.isPending}><Save className="h-4 w-4 mr-1" /> Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Bundle editor */}
      {bundleEditing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setBundleEditing(null)}>
          <div className="bg-background border rounded-lg shadow-lg max-w-2xl w-full p-4 space-y-3 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="font-semibold">{bundleEditing.id ? "Edit Bundle" : "New Bundle"}</div>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Code"><input className="input" value={bundleEditing.bundle_code} onChange={(e) => setBundleEditing({ ...bundleEditing, bundle_code: e.target.value })} /></Field>
              <Field label="Name"><input className="input" value={bundleEditing.bundle_name} onChange={(e) => setBundleEditing({ ...bundleEditing, bundle_name: e.target.value })} /></Field>
              <Field label="Trigger Event">
                <select className="input" value={bundleEditing.trigger_event || ""} onChange={(e) => setBundleEditing({ ...bundleEditing, trigger_event: e.target.value })}>
                  <option value="">—</option>
                  {events.data?.map((ev: any) => <option key={ev.value_code} value={ev.value_code}>{ev.value_label}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select className="input" value={bundleEditing.status} onChange={(e) => setBundleEditing({ ...bundleEditing, status: e.target.value })}>
                  {["ACTIVE", "INACTIVE", "DRAFT"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Description" full><textarea rows={2} className="input" value={bundleEditing.description ?? ""} onChange={(e) => setBundleEditing({ ...bundleEditing, description: e.target.value })} /></Field>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">Items</div>
                <Button size="sm" variant="outline" onClick={() => setBundleEditing({ ...bundleEditing, items: [...(bundleEditing.items ?? []), { fee_rule_id: "", sequence_no: (bundleEditing.items?.length ?? 0) + 1, mandatory: true, allow_waiver: true }] })}><Plus className="h-3 w-3 mr-1" /> Add Rule</Button>
              </div>
              {(bundleEditing.items ?? []).map((it: any, idx: number) => (
                <div key={idx} className="grid grid-cols-6 gap-2 items-center">
                  <input type="number" className="input col-span-1" value={it.sequence_no} onChange={(e) => {
                    const items = [...bundleEditing.items];
                    items[idx] = { ...it, sequence_no: Number(e.target.value) };
                    setBundleEditing({ ...bundleEditing, items });
                  }} />
                  <select className="input col-span-3" value={it.fee_rule_id} onChange={(e) => {
                    const items = [...bundleEditing.items];
                    items[idx] = { ...it, fee_rule_id: e.target.value };
                    setBundleEditing({ ...bundleEditing, items });
                  }}>
                    <option value="">Select rule…</option>
                    {rules.data?.map((r) => <option key={r.id} value={r.id}>{r.fee_rule_code} — {r.fee_rule_name}</option>)}
                  </select>
                  <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={it.mandatory} onChange={(e) => {
                    const items = [...bundleEditing.items];
                    items[idx] = { ...it, mandatory: e.target.checked };
                    setBundleEditing({ ...bundleEditing, items });
                  }} /> Mandatory</label>
                  <Button size="sm" variant="ghost" onClick={() => setBundleEditing({ ...bundleEditing, items: bundleEditing.items.filter((_: any, i: number) => i !== idx) })}>Remove</Button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBundleEditing(null)}>Cancel</Button>
              <Button onClick={saveBundle} disabled={upsertBundle.isPending || setItems.isPending}><Save className="h-4 w-4 mr-1" /> Save</Button>
            </div>
          </div>
        </div>
      )}

      <style>{`.input{width:100%;border:1px solid hsl(var(--border));border-radius:0.375rem;height:2.25rem;padding:0 0.5rem;background:hsl(var(--background));font-size:0.875rem}textarea.input{height:auto;padding:0.5rem}`}</style>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode; full?: boolean }> = ({ label, children, full }) => (
  <div className={full ? "md:col-span-2" : undefined}>
    <label className="text-xs text-muted-foreground">{label}</label>
    {children}
  </div>
);

export default LgFeeConfig;
