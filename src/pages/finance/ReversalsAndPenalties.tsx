import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function ReversalsAndPenalties() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="bema-h1 mb-2" style={{ color: "hsl(var(--bema-text-primary))" }}>Reversal & Penalties</h1>
        <p className="bema-t1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Handle bounced cheques and penalty management</p>
      </div>
      <Card className="bema-card">
        <CardHeader><CardTitle className="bema-h2">Recent Reversals</CardTitle></CardHeader>
        <CardContent>
          <Table className="bema-table">
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>RCP-2025-001</TableCell>
                <TableCell>ABC Company</TableCell>
                <TableCell>$2,500</TableCell>
                <TableCell>NSF</TableCell>
                <TableCell><span className="bema-badge-warning">Pending</span></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
