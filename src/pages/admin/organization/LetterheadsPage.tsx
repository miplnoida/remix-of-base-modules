import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Eye, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useLetterheads } from "@/hooks/comm/useCommAssets";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";

const TEMPLATE_CATEGORIES = [
  "General Official Letter","Employer Notice","Member Notice","Benefit Approval Letter",
  "Benefit Rejection Letter","Contribution Demand Notice","Compliance Inspection Notice",
  "Legal Notice","Certificate","Statement","Receipt","Acknowledgement","Appeal","Board Communication",
];

function Inner() {
  const { data: rows = [], isLoading } = useLetterheads();
  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Letterheads &amp; Official Templates</h1>
            <p className="text-sm text-muted-foreground">Reusable official communication layouts (header, footer, seal, signature, watermark, QR, disclaimer, placeholders).</p>
          </div>
        </div>
        <Button disabled><Plus className="h-4 w-4 mr-2" /> New Template</Button>
      </div>

      <Card>
        <CardContent className="p-4 text-sm">
          <div className="font-medium mb-2">Template categories supported</div>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_CATEGORIES.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No letterheads defined yet.</TableCell></TableRow>
                ) : rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.version ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.effective_from ?? "—"} → {r.effective_to ?? "open"}</TableCell>
                    <TableCell>{r.is_active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                    <TableCell><Button asChild size="sm" variant="ghost"><Link to="/admin/organization/media-library"><Eye className="h-4 w-4" /></Link></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Logos, seals and signatures used here are managed in the <Link to="/admin/organization/media-library" className="underline text-primary">Communication Assets Library</Link>.
      </p>
    </div>
  );
}

export default function LetterheadsPage() {
  return <PermissionWrapper moduleName="org_letterheads"><Inner /></PermissionWrapper>;
}
