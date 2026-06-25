import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { addComment, listComments, updateComment, type ContractReview } from "@/services/legal/contractReviewService";
import { useUserCode } from "@/hooks/useUserCode";
import { formatDateForDisplay } from "@/lib/format-config";

export function ContractCommentsTab({ review }: { review: ContractReview }) {
  const { userCode } = useUserCode();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ comment_scope: "DOCUMENT", clause_ref: "", body: "", visibility: "INTERNAL", due_date: "" });

  const load = () => listComments(review.id).then(setRows);
  useEffect(() => { load(); }, [review.id]);

  const save = async () => {
    if (!form.body) { toast.error("Comment body required"); return; }
    await addComment(review.id, { ...form, owner_user_code: userCode, due_date: form.due_date || null });
    setOpen(false); setForm({ comment_scope: "DOCUMENT", clause_ref: "", body: "", visibility: "INTERNAL", due_date: "" });
    load();
  };

  const setCommentStatus = async (id: string, status: string) => {
    await updateComment(id, { status, responded_at: status !== "OPEN" ? new Date().toISOString() : null, responded_by_user_code: userCode });
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Comments & Redlines</CardTitle>
        <Button size="sm" onClick={() => setOpen(o => !o)}><Plus className="h-4 w-4 mr-1" /> {open ? "Cancel" : "Add Comment"}</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {open && (
          <div className="grid grid-cols-2 gap-3 p-3 border rounded">
            <div><Label>Scope</Label>
              <Select value={form.comment_scope} onValueChange={v => setForm(f => ({ ...f, comment_scope: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["DOCUMENT", "CLAUSE", "PARAGRAPH", "PAGE"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Clause / Reference</Label><Input value={form.clause_ref} onChange={e => setForm(f => ({ ...f, clause_ref: e.target.value }))} placeholder="e.g. 4.2(b)" /></div>
            <div><Label>Visibility</Label>
              <Select value={form.visibility} onValueChange={v => setForm(f => ({ ...f, visibility: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="INTERNAL">Internal only</SelectItem><SelectItem value="SHARED_WITH_THIRD_PARTY">Shared with third party</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Comment</Label><Textarea rows={3} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} /></div>
            <div className="col-span-2"><Button onClick={save}>Save Comment</Button></div>
          </div>
        )}

        {rows.length === 0 && <div className="text-center text-muted-foreground py-6">No comments</div>}
        <div className="space-y-3">
          {rows.map(c => (
            <div key={c.id} className="border rounded p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline">{c.comment_scope}</Badge>
                  {c.clause_ref && <span className="font-mono">{c.clause_ref}</span>}
                  <Badge variant={c.status === "OPEN" ? "secondary" : c.status === "RESOLVED" ? "default" : "destructive"}>{c.status}</Badge>
                  {c.visibility !== "INTERNAL" && <Badge variant="outline">{c.visibility.replace(/_/g, " ")}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">{formatDateForDisplay(c.created_at)} · {c.owner_user_code ?? "—"}</div>
              </div>
              <div className="mt-2 text-sm whitespace-pre-wrap">{c.body}</div>
              {c.response_text && <div className="mt-2 text-sm bg-muted p-2 rounded"><b>Response:</b> {c.response_text}</div>}
              {c.status === "OPEN" && (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setCommentStatus(c.id, "RESOLVED")}>Mark resolved</Button>
                  <Button size="sm" variant="outline" onClick={() => setCommentStatus(c.id, "REJECTED")}>Reject</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
