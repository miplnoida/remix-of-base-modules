import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ApprovalMatrixAudit } from "@/types/systemAdmin";
import { format } from "date-fns";

interface ApprovalMatrixAuditHistoryProps {
  history: ApprovalMatrixAudit[];
}

export function ApprovalMatrixAuditHistory({ history }: ApprovalMatrixAuditHistoryProps) {
  if (!history || history.length === 0) {
    return <p className="text-sm text-muted-foreground">No audit history available.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date & Time</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Changed By</TableHead>
          <TableHead>Changes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {history.map((audit) => (
          <TableRow key={audit.auditId}>
            <TableCell className="font-medium">
              {format(new Date(audit.changedOn), "MMM dd, yyyy HH:mm")}
            </TableCell>
            <TableCell>
              <Badge variant={
                audit.action === "Created" ? "default" :
                audit.action === "Updated" ? "secondary" :
                audit.action === "Deleted" ? "destructive" :
                "outline"
              }>
                {audit.action}
              </Badge>
            </TableCell>
            <TableCell>{audit.changedBy}</TableCell>
            <TableCell>
              <div className="space-y-1">
                <p className="text-sm">{audit.changeDescription}</p>
                {audit.fieldChanges && audit.fieldChanges.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {audit.fieldChanges.map((change, idx) => (
                      <div key={idx}>
                        <span className="font-semibold">{change.field}:</span>{" "}
                        <span className="line-through">{String(change.oldValue)}</span> →{" "}
                        <span className="text-primary">{String(change.newValue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
