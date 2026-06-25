import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createShare, listShares, revokeShare, type ContractReview } from "@/services/legal/contractReviewService";
import { useUserCode } from "@/hooks/useUserCode";
import { formatDateForDisplay } from "@/lib/format-config";

export function ContractExternalShareTab({ review }: { review: ContractReview }) {
  const { userCode } = useUserCode();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ recipient_name: "", recipient_email: "", expires_at: "", download_allowed: true, upload_allowed: true, comment_allowed: true });

  const load = () => listShares(review.id).then(setRows);
  useEffect(() => { load(); }, [review.id]);

  const save = async () => {
    if (!form.recipient_name || !form.recipient_email || !form.expires_at) { toast.error("Fill recipient and expiry"); return; }
    if (!review.third_party_sharing_allowed) { toast.error("Third-party sharing is not allowed for this review"); return; }
    await createShare(review.id, { ...form, expires_at: new Date(form.expires_at).toISOString(), created_by_user_code: userCode });
    toast.success("Share link created");
    setOpen(false); setForm({ recipient_name: "", recipient_email: "", expires_at: "", download_allowed: true, upload_allowed: true, comment_allowed: true });
    load();
  };

  const revoke = async (id: string) => { await revokeShare(id, userCode ?? undefined); load(); };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>External Sharing</CardTitle>
        <Button size="sm" onClick={() => setOpen(o => !o)} disabled={!review.third_party_sharing_allowed}><Plus className="h-4 w-4 mr-1" /> {open ? "Cancel" : "New Share Link"}</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!review.third_party_sharing_allowed && <Alert><AlertDescription>Third-party sharing is disabled for this review. Enable it in the request to share with external counterparties.</AlertDescription></Alert>}
        {open && (
          <div className="grid grid-cols-2 gap-3 p-3 border rounded">
            <div><Label>Recipient Name</Label><Input value={form.recipient_name} onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))} /></div>
            <div><Label>Recipient Email</Label><Input type="email" value={form.recipient_email} onChange={e => setForm(f => ({ ...f, recipient_email: e.target.value }))} /></div>
            <div><Label>Expires</Label><Input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} /></div>
            <div className="flex items-center gap-2 pt-7"><Switch checked={form.download_allowed} onCheckedChange={v => setForm(f => ({ ...f, download_allowed: v }))} /><Label>Download</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.upload_allowed} onCheckedChange={v => setForm(f => ({ ...f, upload_allowed: v }))} /><Label>Upload</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.comment_allowed} onCheckedChange={v => setForm(f => ({ ...f, comment_allowed: v }))} /><Label>Comments</Label></div>
            <div className="col-span-2"><Button onClick={save}>Create Link</Button></div>
          </div>
        )}
        <Table>
          <TableHeader><TableRow><TableHead>Recipient</TableHead><TableHead>Token</TableHead><TableHead>Expires</TableHead><TableHead>Permissions</TableHead><TableHead>Accesses</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No shares</TableCell></TableRow>}
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.recipient_name} <div className="text-xs text-muted-foreground">{r.recipient_email}</div></TableCell>
                <TableCell className="font-mono text-xs">{r.share_token.slice(0, 10)}…</TableCell>
                <TableCell>{formatDateForDisplay(r.expires_at)}</TableCell>
                <TableCell className="text-xs">
                  {r.download_allowed && <Badge variant="outline" className="mr-1">DL</Badge>}
                  {r.upload_allowed && <Badge variant="outline" className="mr-1">UP</Badge>}
                  {r.comment_allowed && <Badge variant="outline">CMT</Badge>}
                </TableCell>
                <TableCell>{r.access_count}</TableCell>
                <TableCell>{r.revoked_at ? <Badge variant="destructive">Revoked</Badge> : <Badge>Active</Badge>}</TableCell>
                <TableCell>{!r.revoked_at && <Button size="sm" variant="ghost" onClick={() => revoke(r.id)}><Trash2 className="h-4 w-4" /></Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
