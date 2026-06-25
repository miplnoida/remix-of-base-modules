import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { addCycle, listCycles, type ContractReview } from "@/services/legal/contractReviewService";
import { useUserCode } from "@/hooks/useUserCode";
import { formatDateForDisplay } from "@/lib/format-config";

const DIRECTIONS = ["LEGAL_TO_DEPT", "DEPT_TO_LEGAL", "LEGAL_TO_THIRD_PARTY", "THIRD_PARTY_TO_LEGAL"];

export function ContractCyclesTab({ review }: { review: ContractReview }) {
  const { userCode } = useUserCode();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ cycle_direction: "LEGAL_TO_DEPT", sent_to: "", due_date: "", notes: "" });

  const load = () => listCycles(review.id).then(setRows);
  useEffect(() => { load(); }, [review.id]);

  const save = async () => {
    await addCycle(review.id, { ...form, sent_by_user_code: userCode, due_date: form.due_date || null });
    toast.success("Cycle started");
    setOpen(false); setForm({ cycle_direction: "LEGAL_TO_DEPT", sent_to: "", due_date: "", notes: "" });
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Review Cycles</CardTitle>
        <Button size="sm" onClick={() => setOpen(o => !o)}><Plus className="h-4 w-4 mr-1" /> {open ? "Cancel" : "New Cycle"}</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {open && (
          <div className="grid grid-cols-2 gap-3 p-3 border rounded">
            <div><Label>Direction</Label>
              <Select value={form.cycle_direction} onValueChange={v => setForm(f => ({ ...f, cycle_direction: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DIRECTIONS.map(d => <SelectItem key={d} value={d}>{d.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Sent To</Label><Input value={form.sent_to} onChange={e => setForm(f => ({ ...f, sent_to: e.target.value }))} placeholder="user code or email" /></div>
            <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="col-span-2"><Button onClick={save}>Save Cycle</Button></div>
          </div>
        )}
        <Table>
          <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Direction</TableHead><TableHead>Sent To</TableHead><TableHead>Sent</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No cycles</TableCell></TableRow>}
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell>#{r.cycle_no}</TableCell>
                <TableCell className="text-xs">{r.cycle_direction.replace(/_/g, " ")}</TableCell>
                <TableCell>{r.sent_to ?? "—"}</TableCell>
                <TableCell>{formatDateForDisplay(r.sent_date)}</TableCell>
                <TableCell>{r.due_date ? formatDateForDisplay(r.due_date) : "—"}</TableCell>
                <TableCell><Badge variant={r.status === "OPEN" ? "secondary" : r.status === "OVERDUE" ? "destructive" : "default"}>{r.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
