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
    timestamp: "2024-01-15 09:30:00",
    user: "John Admin",
    targetUser: "Jane Smith",
    action: "Permission Added",
    permission: "system_administration",
    changedBy: "Admin User",
  },
  {
    id: "2",
    timestamp: "2024-01-14 14:20:00",
    user: "Sarah Manager",
    targetUser: "Bob Jones",
    action: "Permission Removed",
    permission: "manage_employers",
    changedBy: "Senior Admin",
  },
  {
    id: "3",
    timestamp: "2024-01-14 11:00:00",
    user: "Mike Admin",
    targetUser: "Alice Brown",
    action: "Permission Modified",
    permission: "view_dashboard",
    changedBy: "System Admin",
  },
];

export default function PermissionChangesReport() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Permission Changes Report"
        subtitle="Track permission modifications across the system"
      />

      <div className="flex-1 p-6 space-y-6">
        <Card className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Target User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead>Changed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-sm">{row.timestamp}</TableCell>
                  <TableCell className="font-medium">{row.targetUser}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.action === "Permission Added"
                          ? "default"
                          : row.action === "Permission Removed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {row.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{row.permission}</TableCell>
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
