/**
 * EPIC-06A.2 §5 — Reusable Link / Unlink dialog for Recoverable Liabilities.
 *
 * Consumed by Hearing, Order, Arrangement, Settlement, Task and Document
 * modules. Falls back to a clean empty-state banner when the case has no
 * liabilities yet — never fabricates data.
 */
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listLinkedLiabilityIds } from "@/services/legal/lgLiabilityRetrofitService";
import {
  listLiabilitiesForCase,
  linkLiabilityToHearing, unlinkLiabilityFromHearing,
  linkLiabilityToOrder, linkLiabilityToArrangement,
  linkLiabilityToSettlement, linkLiabilityToTask, linkLiabilityToDocument,
} from "@/services/legal/lgLiabilityService";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { LegalReferenceValueBadge } from "@/components/legal/reference/LegalReferenceSelect";
import { LG_REF } from "@/hooks/legal/useLegalReferenceData";

const sb = supabase as any;
const money = (n: number) => new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n ?? 0));

export type LiabilityLinkTarget =
  | { kind: "hearing"; id: string }
  | { kind: "order"; id: string }
  | { kind: "arrangement"; id: string }
  | { kind: "settlement"; id: string }
  | { kind: "task"; id: string }
  | { kind: "document"; id: string; docRole?: string };

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  caseId: string;
  target: LiabilityLinkTarget;
  onLinked?: () => void;
}

export function LiabilityLinkDialog({ open, onOpenChange, caseId, target, onLinked }: Props) {
  const qc = useQueryClient();
  const { profile, user } = useSupabaseAuth();
  const actor = (profile as any)?.user_code ?? user?.email ?? null;

  const rowsQ = useQuery({
    queryKey: ["liab-link-case", caseId],
    queryFn: () => listLiabilitiesForCase(caseId),
    enabled: open && !!caseId,
  });
  const linkedQ = useQuery({
    queryKey: ["liab-link-existing", target.kind, target.id],
    queryFn: () => listLinkedLiabilityIds(target.kind, target.id),
    enabled: open,
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => { if (open && linkedQ.data) setSelected(new Set(linkedQ.data)); }, [open, linkedQ.data]);
  const [saving, setSaving] = useState(false);

  const active = (rowsQ.data ?? []).filter((r) => r.status === "ACTIVE");

  const toggle = (id: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  };

  async function doSave() {
    setSaving(true);
    try {
      const existing = linkedQ.data ?? new Set<string>();
      const toAdd = Array.from(selected).filter((id) => !existing.has(id));
      const toRemove = Array.from(existing).filter((id) => !selected.has(id));

      for (const lid of toAdd) {
        const liab = active.find((r) => r.id === lid);
        const outstanding = Number(liab?.outstanding ?? 0);
        switch (target.kind) {
          case "hearing":     await linkLiabilityToHearing(target.id, lid, actor); break;
          case "order":       await linkLiabilityToOrder(target.id, lid, outstanding, actor); break;
          case "arrangement": await linkLiabilityToArrangement(target.id, lid, outstanding, actor); break;
          case "settlement":  await linkLiabilityToSettlement(target.id, lid, outstanding, 0, actor); break;
          case "task":        await linkLiabilityToTask(target.id, lid, actor); break;
          case "document":    await linkLiabilityToDocument(target.id, lid, target.docRole ?? "SUPPORT", actor); break;
        }
      }
      for (const lid of toRemove) {
        // Generic unlink — delete row from junction
        if (target.kind === "hearing") {
          await unlinkLiabilityFromHearing(target.id, lid);
        } else {
          const table = `lg_${target.kind}_liability`;
          const fk = `${target.kind}_id`;
          await sb.from(table).delete().eq(fk, target.id).eq("liability_id", lid);
        }
      }
      toast.success(`Liabilities updated (${toAdd.length} linked, ${toRemove.length} unlinked)`);
      qc.invalidateQueries({ queryKey: ["liab-link-existing", target.kind, target.id] });
      onLinked?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update liability links");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Link Recoverable Liabilities</DialogTitle>
          <DialogDescription>
            Choose which liabilities this {target.kind} covers. Financial rollups update automatically.
          </DialogDescription>
        </DialogHeader>

        {rowsQ.isLoading ? (
          <p className="text-sm text-muted-foreground py-6">Loading liabilities…</p>
        ) : active.length === 0 ? (
          <div className="rounded border bg-muted/30 p-4 text-sm text-muted-foreground">
            This matter has no active liabilities yet. Add liabilities from the Matter Workspace → Liabilities tab before linking.
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto border rounded divide-y">
            {active.map((r) => {
              const checked = selected.has(r.id);
              return (
                <label key={r.id} className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/40 text-xs">
                  <Checkbox checked={checked} onCheckedChange={(v) => toggle(r.id, !!v)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <LegalReferenceValueBadge groupCode={LG_REF.LIABILITY_TYPE} value={r.liability_type} />
                      {r.fund_type && <LegalReferenceValueBadge groupCode={LG_REF.FUND_TYPE} value={r.fund_type} />}
                      <Badge variant="secondary" className="text-[10px]">{r.recovery_status}</Badge>
                    </div>
                    <div className="text-muted-foreground mt-0.5">
                      Assessed {money(r.total_assessed)} · Paid {money(r.paid)} · Outstanding <span className="font-medium text-foreground">{money(r.outstanding)}</span>
                    </div>
                    {r.contribution_period_from && (
                      <div className="text-[10px] text-muted-foreground">
                        Period {r.contribution_period_from}{r.contribution_period_to ? ` → ${r.contribution_period_to}` : ""}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={doSave} disabled={saving || active.length === 0}>
            {saving ? "Saving…" : `Save (${selected.size} selected)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LiabilityLinkDialog;
