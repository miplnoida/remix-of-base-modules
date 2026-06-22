import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, ListOrdered, Save } from "lucide-react";
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
  GLOBAL_DEFAULT: "Global Default",
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

export default function RoutingPrecedenceCard({ userCode }: { userCode?: string }) {
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
    const next = [...rows];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    next.forEach((r, i) => (r.priority_order = i + 1));
    setRows(next);
    setDirty(true);
  }

  function setPriority(idx: number, val: number) {
    const next = [...rows];
    next[idx] = { ...next[idx], priority_order: val };
    setRows(next);
    setDirty(true);
  }

  function setActive(idx: number, v: boolean) {
    const next = [...rows];
    next[idx] = { ...next[idx], is_active: v };
    setRows(next);
    setDirty(true);
  }

  function setDescription(idx: number, v: string) {
    const next = [...rows];
    next[idx] = { ...next[idx], description: v };
    setRows(next);
    setDirty(true);
  }

  async function save() {
    // Re-normalize order based on priority_order then sequence index
    const sorted = [...rows].sort((a, b) => a.priority_order - b.priority_order);
    sorted.forEach((r, i) => (r.priority_order = i + 1));
    const payload = sorted.map((r) => ({
      id: r.id,
      country_code: COUNTRY,
      rule_type: r.rule_type,
      priority_order: r.priority_order,
      is_active: r.is_active,
      description: r.description,
      updated_by: userCode ?? null,
    }));
    const { error } = await sb
      .from("lg_routing_precedence")
      .upsert(payload, { onConflict: "country_code,rule_type" });
    if (error) {
      toast.error("Failed to save precedence", { description: error.message });
      return;
    }
    toast.success("Routing precedence saved");
    qc.invalidateQueries({ queryKey: ["lg_routing_precedence", COUNTRY] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ListOrdered className="h-4 w-4" /> Routing Precedence
        </CardTitle>
        <CardDescription>
          The routing engine evaluates rules in this order and uses the first match. Reorder rows to change which rule
          wins. Deactivate a row to skip that layer entirely.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Order</TableHead>
              <TableHead>Rule Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-24">Active</TableHead>
              <TableHead className="w-28">Reorder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={r.rule_type}>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    className="h-8 w-16"
                    value={r.priority_order}
                    onChange={(e) => setPriority(idx, Number(e.target.value) || 1)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{RULE_LABELS[r.rule_type]}</span>
                    <Badge variant="outline" className="font-mono text-[10px] w-fit mt-1">{r.rule_type}</Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    className="h-8"
                    value={r.description ?? ""}
                    onChange={(e) => setDescription(idx, e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Switch checked={r.is_active} onCheckedChange={(v) => setActive(idx, v)} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => move(idx, -1)} disabled={idx === 0}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => move(idx, 1)} disabled={idx === rows.length - 1}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-end">
          <Button onClick={save} disabled={!dirty}>
            <Save className="h-4 w-4 mr-2" /> Save Precedence
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
