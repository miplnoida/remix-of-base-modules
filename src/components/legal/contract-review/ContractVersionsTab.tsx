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
import { addVersion, listVersions, type ContractReview } from "@/services/legal/contractReviewService";
import { formatDateForDisplay } from "@/lib/format-config";

const LABELS = ["ORIGINAL", "LEGAL_REVIEWED", "DEPT_REVISED", "THIRD_PARTY", "FINAL", "SIGNED"];

export function ContractVersionsTab({ review }: { review: ContractReview }) {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ version_label: "ORIGINAL", notes: "", dms_document_id: "" });

  const load = () => listVersions(review.id).then(setRows);
  useEffect(() => { load(); }, [review.id]);

  const save = async () => {
    await addVersion(review.id, form.version_label, form.notes, form.dms_document_id || undefined);
    toast.success("Version added");
    setOpen(false); setForm({ version_label: "ORIGINAL", notes: "", dms_document_id: "" });
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Versions</CardTitle>
        <Button size="sm" onClick={() => setOpen(o => !o)}><Plus className="h-4 w-4 mr-1" /> {open ? "Cancel" : "New Version"}</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {open && (
          <div className="grid grid-cols-2 gap-3 p-3 border rounded">
            <div><Label>Label</Label>
              <Select value={form.version_label} onValueChange={v => setForm(f => ({ ...f, version_label: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LABELS.map(l => <SelectItem key={l} value={l}>{l.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>DMS Document ID (optional)</Label><Input value={form.dms_document_id} onChange={e => setForm(f => ({ ...f, dms_document_id: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="col-span-2"><Button onClick={save}>Save Version</Button></div>
          </div>
        )}
        <Table>
          <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Label</TableHead><TableHead>DMS</TableHead><TableHead>Notes</TableHead><TableHead>Created</TableHead><TableHead>Current</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No versions</TableCell></TableRow>}
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell>v{r.version_no}</TableCell>
                <TableCell>{r.version_label}</TableCell>
                <TableCell className="font-mono text-xs">{r.dms_document_id ?? "—"}</TableCell>
                <TableCell className="max-w-md truncate">{r.notes ?? "—"}</TableCell>
                <TableCell>{formatDateForDisplay(r.created_at)}</TableCell>
                <TableCell>{r.is_current && <Badge>Current</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
