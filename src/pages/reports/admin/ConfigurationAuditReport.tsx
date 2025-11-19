import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const mockData = [
  {
    id: "1",
    timestamp: "2024-01-15 10:45:00",
    module: "System Settings",
    setting: "Email Notifications",
    oldValue: "Disabled",
    newValue: "Enabled",
    changedBy: "System Admin",
  },
  {
    id: "2",
    timestamp: "2024-01-14 16:30:00",
    module: "Security Settings",
    setting: "Password Policy",
    oldValue: "8 characters",
    newValue: "12 characters minimum",
    changedBy: "Security Officer",
  },
  {
    id: "3",
    timestamp: "2024-01-13 09:15:00",
    module: "Fee Configuration",
    setting: "Replacement Card Fee",
    oldValue: "EC$15",
    newValue: "EC$20",
    changedBy: "Finance Manager",
  },
];

export default function ConfigurationAuditReport() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Configuration Audit Report"
        subtitle="Monitor system configuration changes"
      />

      <div className="flex-1 p-6 space-y-6">
        <Card className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Setting</TableHead>
                <TableHead>Old Value</TableHead>
                <TableHead>New Value</TableHead>
                <TableHead>Changed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-sm">{row.timestamp}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.module}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{row.setting}</TableCell>
                  <TableCell className="text-muted-foreground">{row.oldValue}</TableCell>
                  <TableCell className="font-medium">{row.newValue}</TableCell>
                  <TableCell>{row.changedBy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
