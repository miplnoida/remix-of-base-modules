import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listChecklistItems, listChecklistResponses, upsertChecklistResponse, type ContractReview } from "@/services/legal/contractReviewService";

const STATUSES = ["PENDING", "PRESENT", "MISSING", "NA", "NEEDS_REVISION"];

export function ContractChecklistTab({ review }: { review: ContractReview }) {
  const [items, setItems] = useState<any[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});

  const load = async () => {
    const [its, rsp] = await Promise.all([listChecklistItems(review.contract_type), listChecklistResponses(review.id)]);
    setItems(its);
    const map: Record<string, any> = {};
    rsp.forEach((r: any) => map[r.checklist_item_id] = r);
    setResponses(map);
  };
  useEffect(() => { load(); }, [review.id, review.contract_type]);

  const update = async (item_id: string, patch: any) => {
    const current = responses[item_id] ?? { status: "PENDING", notes: "" };
    const next = { ...current, ...patch };
    setResponses(r => ({ ...r, [item_id]: next }));
    await upsertChecklistResponse(review.id, item_id, next.status, next.notes);
  };

  return (
    <Card>
      <CardHeader><CardTitle>Checklist — {review.contract_type.replace(/_/g, " ")}</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 && <div className="text-center text-muted-foreground py-6">No checklist items defined for this contract type</div>}
        {items.length > 0 && (
          <Table>
            <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead className="w-48">Status</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map(it => {
                const r = responses[it.id] ?? { status: "PENDING", notes: "" };
                return (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">{it.item_label}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{it.category ?? "—"}</TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={v => update(it.id, { status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input value={r.notes ?? ""} onChange={e => update(it.id, { notes: e.target.value })} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
