import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MockCase } from "@/data/mockLegalCases";
import { Plus, Gavel, FileText, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CaseOrdersTabProps {
  caseData: MockCase;
}

const mockOrders = [
  { id: 1, number: 'ORD-2025-001', status: 'Draft', publishedOn: null, outcome: 'Pending', type: 'Judgment' },
  { id: 2, number: 'ORD-2025-002', status: 'Published', publishedOn: '2025-01-28', outcome: 'Order Issued', type: 'Enforcement' },
];

export function CaseOrdersTab({ caseData }: CaseOrdersTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Orders & Judgments</h2>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Draft Order
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Legal Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Published On</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockOrders.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-medium">{order.number}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{order.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={order.status === 'Published' ? 'default' : 'outline'}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {order.publishedOn ? new Date(order.publishedOn).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell className="text-sm">{order.outcome}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {order.status === 'Draft' && (
                        <Button variant="ghost" size="sm">Publish</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
