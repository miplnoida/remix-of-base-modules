import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { addDocument, listDocuments, type ContractReview } from "@/services/legal/contractReviewService";
import { useUserCode } from "@/hooks/useUserCode";
import { formatDateForDisplay } from "@/lib/format-config";

const KINDS = ["CONTRACT_DRAFT", "SUPPORTING", "COUNTERPARTY", "REVIEWED", "SIGNED"];

export function ContractDocumentsTab({ review }: { review: ContractReview }) {
  const { userCode } = useUserCode();
  const [docs, setDocs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ document_kind: "CONTRACT_DRAFT", file_name: "", dms_document_id: "", confidentiality_level: "INTERNAL" });

  const load = () => listDocuments(review.id).then(setDocs);
  useEffect(() => { load(); }, [review.id]);

  const save = async () => {
    if (!form.file_name && !form.dms_document_id) { toast.error("Provide a file name or DMS document ID"); return; }
    await addDocument(review.id, { ...form, uploaded_by_user_code: userCode, source_department: review.source_department });
    toast.success("Document added");
    setOpen(false); setForm({ document_kind: "CONTRACT_DRAFT", file_name: "", dms_document_id: "", confidentiality_level: "INTERNAL" });
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Documents</CardTitle>
        <Button size="sm" onClick={() => setOpen(o => !o)}><Plus className="h-4 w-4 mr-1" /> {open ? "Cancel" : "Add Document"}</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {open && (
          <div className="grid grid-cols-2 gap-3 p-3 border rounded">
            <div><Label>Kind</Label>
              <Select value={form.document_kind} onValueChange={v => setForm(f => ({ ...f, document_kind: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KINDS.map(k => <SelectItem key={k} value={k}>{k.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Confidentiality</Label>
              <Select value={form.confidentiality_level} onValueChange={v => setForm(f => ({ ...f, confidentiality_level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"].map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>File Name</Label><Input value={form.file_name} onChange={e => setForm(f => ({ ...f, file_name: e.target.value }))} /></div>
            <div><Label>DMS Document ID</Label><Input value={form.dms_document_id} onChange={e => setForm(f => ({ ...f, dms_document_id: e.target.value }))} /></div>
            <div className="col-span-2"><Button onClick={save}>Save</Button></div>
          </div>
        )}
        <Table>
          <TableHeader><TableRow><TableHead>Kind</TableHead><TableHead>File</TableHead><TableHead>DMS ID</TableHead><TableHead>Conf.</TableHead><TableHead>Uploaded</TableHead><TableHead>By</TableHead></TableRow></TableHeader>
          <TableBody>
            {docs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No documents</TableCell></TableRow>}
            {docs.map(d => (
              <TableRow key={d.id}>
                <TableCell className="text-xs">{d.document_kind.replace(/_/g, " ")}</TableCell>
                <TableCell>{d.file_name ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{d.dms_document_id ?? "—"}</TableCell>
                <TableCell>{d.confidentiality_level}</TableCell>
                <TableCell>{formatDateForDisplay(d.uploaded_at)}</TableCell>
                <TableCell>{d.uploaded_by_user_code ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
