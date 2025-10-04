import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MockCase } from "@/data/mockLegalCases";
import { Download, History } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CaseAuditTabProps {
  caseData: MockCase;
}

const mockAuditLog = [
  { timestamp: '2025-01-30 14:32', user: 'Legal Officer', action: 'Updated case status', field: 'status', before: 'Filed', after: 'Under Review' },
  { timestamp: '2025-01-28 10:15', user: 'System', action: 'Generated document', field: 'documents', before: null, after: 'Summons Form 37' },
  { timestamp: '2025-01-25 09:00', user: 'Legal Clerk', action: 'Created case', field: 'case', before: null, after: 'Case created' },
];

export function CaseAuditTab({ caseData }: CaseAuditTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Audit Log</h2>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export Audit Log
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Change History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Before</TableHead>
                <TableHead>After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAuditLog.map((log, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono text-xs">{log.timestamp}</TableCell>
                  <TableCell className="text-sm">{log.user}</TableCell>
                  <TableCell className="text-sm">{log.action}</TableCell>
                  <TableCell className="text-sm font-medium">{log.field}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.before || '—'}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{log.after}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Changes</span>
            <span className="font-semibold">{mockAuditLog.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">First Activity</span>
            <span className="font-semibold">
              {new Date(caseData.filed_at).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last Modified</span>
            <span className="font-semibold">
              {new Date(mockAuditLog[0].timestamp).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
