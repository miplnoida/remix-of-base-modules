import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, Link2, Download } from "lucide-react";
import { toast } from "sonner";
import {
  addDocument, listDocuments, uploadDocumentFile, getDocumentSignedUrl,
  DOCUMENT_ROLES, CONFIDENTIALITY_LEVELS, type ContractReview,
} from "@/services/legal/contractReviewService";
import { useUserCode } from "@/hooks/useUserCode";
import { formatDateForDisplay } from "@/lib/format-config";

type Mode = "upload" | "dms";

export function ContractDocumentsTab({ review }: { review: ContractReview }) {
  const { userCode } = useUserCode();
  const [docs, setDocs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    document_role: "ORIGINAL_DRAFT",
    dms_document_id: "",
    confidentiality_level: review.confidentiality_level ?? "INTERNAL",
    ai_analysis_allowed: true,
    version_no: "" as string | number,
  });

  const load = () => listDocuments(review.id).then(setDocs);
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [review.id]);

  const reset = () => {
    setFile(null);
    setForm({ document_role: "ORIGINAL_DRAFT", dms_document_id: "", confidentiality_level: review.confidentiality_level ?? "INTERNAL", ai_analysis_allowed: true, version_no: "" });
  };

  const save = async () => {
    if (mode === "upload" && !file) { toast.error("Choose a file to upload"); return; }
    if (mode === "dms" && !form.dms_document_id) { toast.error("Provide a DMS document ID"); return; }
    setBusy(true);
    try {
      let storage_path: string | null = null;
      let file_name: string | null = null;
      let file_size: number | null = null;
      let mime_type: string | null = null;
      if (mode === "upload" && file) {
        const up = await uploadDocumentFile(review.id, file);
        storage_path = up.storage_path;
        file_name = file.name;
        file_size = file.size;
        mime_type = file.type || null;
      }
      await addDocument(review.id, {
        document_role: form.document_role,
        document_kind: form.document_role,
        dms_document_id: form.dms_document_id || null,
        storage_path,
        file_name,
        file_size,
        mime_type,
        confidentiality_level: form.confidentiality_level,
        ai_analysis_allowed: form.ai_analysis_allowed,
        version_no: form.version_no ? Number(form.version_no) : null,
        uploaded_by_user_code: userCode,
        source_department: review.source_department,
      });
      toast.success("Document added");
      setOpen(false); reset(); load();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const download = async (d: any) => {
    if (!d.storage_path) { toast.error("No file attached (DMS-linked document)"); return; }
    try {
      const url = await getDocumentSignedUrl(d.storage_path);
      window.open(url, "_blank");
    } catch (e: any) { toast.error(e.message ?? "Cannot fetch file"); }
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
            <div className="col-span-2 flex gap-2">
              <Button type="button" size="sm" variant={mode === "upload" ? "default" : "outline"} onClick={() => setMode("upload")}>
                <Upload className="h-4 w-4 mr-1" /> Upload File
              </Button>
              <Button type="button" size="sm" variant={mode === "dms" ? "default" : "outline"} onClick={() => setMode("dms")}>
                <Link2 className="h-4 w-4 mr-1" /> Link Existing DMS Document
              </Button>
            </div>

            <div>
              <Label>Document Role *</Label>
              <Select value={form.document_role} onValueChange={v => setForm(f => ({ ...f, document_role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOCUMENT_ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Confidentiality</Label>
              <Select value={form.confidentiality_level} onValueChange={v => setForm(f => ({ ...f, confidentiality_level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONFIDENTIALITY_LEVELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {mode === "upload" ? (
              <div className="col-span-2">
                <Label>File *</Label>
                <Input type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                {file && <div className="text-xs text-muted-foreground mt-1">{file.name} · {(file.size / 1024).toFixed(1)} KB</div>}
              </div>
            ) : (
              <div className="col-span-2"><Label>DMS Document ID *</Label><Input value={form.dms_document_id} onChange={e => setForm(f => ({ ...f, dms_document_id: e.target.value }))} placeholder="dms-12345…" /></div>
            )}

            <div>
              <Label>Version No (optional)</Label>
              <Input type="number" value={form.version_no} onChange={e => setForm(f => ({ ...f, version_no: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3 pt-7">
              <Switch checked={form.ai_analysis_allowed} onCheckedChange={v => setForm(f => ({ ...f, ai_analysis_allowed: v }))} />
              <Label>AI analysis allowed on this document</Label>
            </div>

            <div className="col-span-2"><Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save Document"}</Button></div>
          </div>
        )}

        <Table>
          <TableHeader><TableRow>
            <TableHead>Role</TableHead><TableHead>File / DMS</TableHead><TableHead>Version</TableHead>
            <TableHead>Confidentiality</TableHead><TableHead>AI</TableHead><TableHead>Uploaded</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {docs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No documents yet</TableCell></TableRow>}
            {docs.map(d => (
              <TableRow key={d.id}>
                <TableCell className="text-xs font-medium">{(d.document_role ?? d.document_kind ?? "").replace(/_/g, " ")}</TableCell>
                <TableCell className="text-xs">{d.file_name ?? d.dms_document_id ?? "—"}</TableCell>
                <TableCell>{d.version_no ?? "—"}</TableCell>
                <TableCell><Badge variant="outline">{d.confidentiality_level ?? "—"}</Badge></TableCell>
                <TableCell>{d.ai_analysis_allowed ? <Badge>Allowed</Badge> : <Badge variant="secondary">Blocked</Badge>}</TableCell>
                <TableCell className="text-xs">{formatDateForDisplay(d.uploaded_at)}</TableCell>
                <TableCell>{d.storage_path && <Button size="sm" variant="ghost" onClick={() => download(d)}><Download className="h-4 w-4" /></Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
