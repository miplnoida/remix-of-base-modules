import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowDown, ArrowUp, ArrowRight, ListOrdered, Save } from "lucide-react";
import { toast } from "sonner";
import type { PrecedenceRuleType } from "@/services/legal/lgRoutingService";

const sb = supabase as any;
const COUNTRY = "SKN";

const RULE_LABELS: Record<PrecedenceRuleType, string> = {
  STAGE_CASE_TYPE: "Stage + Case Type",
  STAGE: "Stage",
  CASE_TYPE: "Case Type",
  SOURCE_CASE_TYPE: "Source + Case Type",
  SOURCE: "Source",
  GLOBAL_DEFAULT: "Default",
  FALLBACK: "Fallback",
};

type Row = {
  id?: string;
  country_code: string;
  rule_type: PrecedenceRuleType;
  priority_order: number;
  is_active: boolean;
  description: string | null;
};

export default function RoutingPriorityChain() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["lg_routing_precedence", COUNTRY],
    queryFn: async () => {
      const { data } = await sb
        .from("lg_routing_precedence")
        .select("*")
        .eq("country_code", COUNTRY)
        .order("priority_order", { ascending: true });
      return (data ?? []) as Row[];
    },
  });

  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (q.data) {
      setRows(q.data.map((r) => ({ ...r })));
      setDirty(false);
    }
  }, [q.data]);

  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[idx], next[j]] = [next[j], next[idx]];
    next.forEach((r, i) => (r.priority_order = i + 1));
    setRows(next);
    setDirty(true);
  }

  function setActive(idx: number, v: boolean) {
    const next = [...rows];
    next[idx] = { ...next[idx], is_active: v };
    setRows(next);
    setDirty(true);
  }

  async function save() {
    const payload = rows.map((r, i) => ({
      id: r.id,
      country_code: COUNTRY,
      rule_type: r.rule_type,
      priority_order: i + 1,
      is_active: r.is_active,
      description: r.description,
    }));
    const { error } = await sb
      .from("lg_routing_precedence")
      .upsert(payload, { onConflict: "country_code,rule_type" });
    if (error) return toast.error("Failed to save", { description: error.message });
    toast.success("Priority order saved");
    qc.invalidateQueries({ queryKey: ["lg_routing_precedence", COUNTRY] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ListOrdered className="h-4 w-4" /> Routing Logic Priority
        </CardTitle>
        <CardDescription>
          Rules are evaluated top to bottom. The first matching rule is applied. Reorder with the arrows or turn a layer off.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li
              key={r.rule_type}
              className={`flex items-center gap-3 rounded-md border bg-card px-3 py-2.5 transition ${
                r.is_active ? "" : "opacity-50"
              }`}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{RULE_LABELS[r.rule_type]}</div>
                {r.description && (
                  <div className="text-xs text-muted-foreground truncate">{r.description}</div>
                )}
              </div>
              <Switch checked={r.is_active} onCheckedChange={(v) => setActive(i, v)} />
              <div className="flex gap-0.5">
                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ol>

        <div className="hidden md:flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t">
          <span className="font-medium text-foreground">Flow:</span>
          {rows.filter((r) => r.is_active).map((r, i, arr) => (
            <span key={r.rule_type} className="flex items-center gap-1.5">
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{RULE_LABELS[r.rule_type]}</span>
              {i < arr.length - 1 && <ArrowRight className="h-3 w-3" />}
            </span>
          ))}
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={!dirty}>
            <Save className="h-4 w-4 mr-2" /> Save Priority
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
