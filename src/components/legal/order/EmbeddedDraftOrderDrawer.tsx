/**
 * EPIC-06C Phase 2 — Embedded Draft Order drawer.
 *
 * Opened from the Hearing Outcome flow when the recorded outcome implies an
 * order/judgment. Prepopulates matter, hearing, court, officer, order type,
 * compliance date (from SLA policy) and appeal deadline (from SLA policy).
 * Creates the order via the existing lgOrderService — no duplicated logic —
 * and links selected hearing liabilities via lg_order_liability so the
 * liability lifecycle stays consistent.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Gavel } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLgReference } from "@/hooks/legal/useLgCases";
import { useUserCode } from "@/hooks/useUserCode";
import { createLgOrder } from "@/services/legal/lgOrderService";
import { getSlaDays } from "@/services/legal/lgSlaPolicyService";
import { dispatch as dispatchNotification } from "@/services/legal/lgNotificationRuleEngine";
import { logJudicialActivity } from "@/services/legal/lgAuditService";

const sb = supabase as any;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lgCaseId: string;
  hearingId: string;
  hearing: {
    court_name?: string | null;
    court_room?: string | null;
    hearing_date?: string | null;
    outcome_code?: string | null;
    minutes?: string | null;
  } | null;
}

interface HearingLiability {
  id: string;                  // lg_hearing_liability row id
  liability_id: string;
  fund?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  outstanding?: number | null;
}

export function EmbeddedDraftOrderDrawer({ open, onOpenChange, lgCaseId, hearingId, hearing }: Props) {
  const { data: orderTypes = [] } = useLgReference("LG_ORDER_TYPE");
  const { userCode } = useUserCode();
  const qc = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liabilities, setLiabilities] = useState<HearingLiability[]>([]);
  const [complianceDays, setComplianceDays] = useState(30);
  const [appealDays, setAppealDays] = useState(14);

  const [form, setForm] = useState({
    order_type_code: "",
    issued_by_court: "",
    issued_date: "",
    compliance_date: "",
    appeal_deadline: "",
    ordered_amount: "",
    terms: "",
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Prepopulate from SLA policy (fallback safe defaults).
        const [compDays, appealD] = await Promise.all([
          getSlaDays("COMPLIANCE_REVIEW", 30),
          getSlaDays("APPEAL_FILING", 14),
        ]);
        if (cancelled) return;
        setComplianceDays(compDays);
        setAppealDays(appealD);

        const issued = (hearing?.hearing_date as string) ?? new Date().toISOString().slice(0, 10);
        const d = new Date(issued);
        const comp = new Date(d); comp.setDate(comp.getDate() + compDays);
        const app  = new Date(d); app.setDate(app.getDate() + appealD);

        const suggestedType = /JUDG/i.test(hearing?.outcome_code ?? "") ? "JUDGMENT" : "ORDER";
        setForm({
          order_type_code: suggestedType,
          issued_by_court: hearing?.court_name ?? "",
          issued_date: issued,
          compliance_date: comp.toISOString().slice(0, 10),
          appeal_deadline: app.toISOString().slice(0, 10),
          ordered_amount: "",
          terms: hearing?.minutes ?? "",
        });

        // Load hearing-linked liabilities (junction populated during hearing prep).
        const { data } = await sb
          .from("lg_hearing_liability")
          .select("id, liability_id, lg_recoverable_liability:liability_id (id, fund_code, period_start, period_end, outstanding_amount)")
          .eq("hearing_id", hearingId);
        if (cancelled) return;
        const rows: HearingLiability[] = (data ?? []).map((r: any) => ({
          id: r.id,
          liability_id: r.liability_id,
          fund: r.lg_recoverable_liability?.fund_code ?? null,
          period_start: r.lg_recoverable_liability?.period_start ?? null,
          period_end: r.lg_recoverable_liability?.period_end ?? null,
          outstanding: r.lg_recoverable_liability?.outstanding_amount ?? null,
        }));
        setLiabilities(rows);
        setSelected(new Set(rows.map((r) => r.liability_id)));
      } catch (e) {
        console.warn("[embedded-draft-order] prepopulate failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, hearingId, hearing]);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const totalOutstanding = useMemo(
    () => liabilities
      .filter((l) => selected.has(l.liability_id))
      .reduce((sum, l) => sum + Number(l.outstanding ?? 0), 0),
    [liabilities, selected],
  );

  const submit = async () => {
    if (!form.order_type_code) { toast.error("Select an order type"); return; }
    setSaving(true);
    try {
      const order = await createLgOrder({
        lg_case_id: lgCaseId,
        hearing_id: hearingId,
        order_type_code: form.order_type_code,
        issued_by_court: form.issued_by_court || null,
        issued_date: form.issued_date || null,
        compliance_date: form.compliance_date || null,
        ordered_amount: form.ordered_amount ? Number(form.ordered_amount) : (totalOutstanding || null),
        terms: form.terms || null,
        status: "DRAFT",
        created_by: userCode ?? null,
      });

      // Link selected liabilities via lg_order_liability (best-effort).
      const linkRows = Array.from(selected).map((liability_id) => ({
        order_id: order.id,
        liability_id,
        allocation_amount: liabilities.find((l) => l.liability_id === liability_id)?.outstanding ?? null,
      }));
      if (linkRows.length) {
        try { await sb.from("lg_order_liability").insert(linkRows); } catch { /* junction optional */ }
      }

      // Judicial activity + notification dispatch — dedupe-safe.
      await logJudicialActivity({
        lg_case_id: lgCaseId,
        activity_type: "ORDER_DRAFTED",
        event_code: "ORDER_CREATED",
        entity_type: "LG_ORDER",
        entity_id: order.id,
        description: `Draft ${form.order_type_code} created from hearing outcome`,
        performed_by: userCode ?? null,
        payload: {
          hearing_id: hearingId,
          liabilities: linkRows.length,
          appeal_deadline: form.appeal_deadline,
        },
      });
      await dispatchNotification("ORDER_CREATED", {
        lg_case_id: lgCaseId,
        entity_type: "LG_ORDER",
        entity_id: order.id,
        actor_user_code: userCode ?? null,
        title: `Draft order ${order.order_no ?? ""}`,
        description: `Draft ${form.order_type_code} created from hearing outcome`,
        payload: { order_id: order.id, hearing_id: hearingId },
      });

      // Invalidate cross-module caches so no manual refresh is required.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["lg_order"] }),
        qc.invalidateQueries({ queryKey: ["lg_orders", lgCaseId] }),
        qc.invalidateQueries({ queryKey: ["lg_hearing", hearingId] }),
        qc.invalidateQueries({ queryKey: ["lg_case", lgCaseId] }),
        qc.invalidateQueries({ queryKey: ["lg_recovery_workbench"] }),
        qc.invalidateQueries({ queryKey: ["lg_unified_timeline", lgCaseId] }),
        qc.invalidateQueries({ queryKey: ["lg_case_task"] }),
      ]);

      toast.success(`Draft order ${order.order_no ?? ""} created`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create draft order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Draft Order from Hearing
          </SheetTitle>
          <SheetDescription>
            Prepopulated from the hearing. Adjust as needed and save to remain in the hearing workflow.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Order Type *</Label>
                <Select value={form.order_type_code} onValueChange={(v) => set("order_type_code", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {orderTypes.map((t) => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Issued By (Court)</Label>
                <Input value={form.issued_by_court} onChange={(e) => set("issued_by_court", e.target.value)} />
              </div>
              <div>
                <Label>Issued Date</Label>
                <Input type="date" value={form.issued_date} onChange={(e) => set("issued_date", e.target.value)} />
              </div>
              <div>
                <Label>Compliance Date <span className="text-xs text-muted-foreground">(SLA {complianceDays}d)</span></Label>
                <Input type="date" value={form.compliance_date} onChange={(e) => set("compliance_date", e.target.value)} />
              </div>
              <div>
                <Label>Appeal Deadline <span className="text-xs text-muted-foreground">(SLA {appealDays}d)</span></Label>
                <Input type="date" value={form.appeal_deadline} onChange={(e) => set("appeal_deadline", e.target.value)} />
              </div>
              <div>
                <Label>Ordered Amount</Label>
                <Input
                  type="number" step="0.01"
                  value={form.ordered_amount}
                  placeholder={totalOutstanding ? totalOutstanding.toFixed(2) : "0.00"}
                  onChange={(e) => set("ordered_amount", e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Terms / Order Text</Label>
                <Textarea rows={4} value={form.terms} onChange={(e) => set("terms", e.target.value)} />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Linked Recoverable Liabilities</Label>
              {liabilities.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-1">
                  No liabilities linked to this hearing. Link liabilities from the hearing before drafting the order.
                </p>
              ) : (
                <div className="mt-2 rounded-md border divide-y">
                  {liabilities.map((l) => (
                    <label key={l.id} className="flex items-center gap-3 p-2 text-sm cursor-pointer hover:bg-muted/40">
                      <Checkbox
                        checked={selected.has(l.liability_id)}
                        onCheckedChange={() => toggle(l.liability_id)}
                      />
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <span>{l.fund ?? "—"}</span>
                        <span className="text-muted-foreground">
                          {l.period_start ?? ""}{l.period_end ? ` → ${l.period_end}` : ""}
                        </span>
                        <span className="text-right tabular-nums">
                          {Number(l.outstanding ?? 0).toFixed(2)}
                        </span>
                      </div>
                    </label>
                  ))}
                  <div className="flex justify-between p-2 text-sm font-medium bg-muted/30">
                    <span>Selected outstanding</span>
                    <span className="tabular-nums">{totalOutstanding.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Create Draft Order
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
