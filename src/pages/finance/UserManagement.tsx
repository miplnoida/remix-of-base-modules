import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function UserManagement() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="bema-h1 mb-2" style={{ color: "hsl(var(--bema-text-primary))" }}>User Management</h1>
          <p className="bema-t1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Role-based access control</p>
        </div>
        <Button className="bema-btn-primary"><Plus className="h-4 w-4 mr-2" />Add User</Button>
      </div>
      <Card className="bema-card">
        <CardHeader><CardTitle className="bema-h2">Finance Users</CardTitle></CardHeader>
        <CardContent>
          <Table className="bema-table">
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              <TableRow><TableCell>John Smith</TableCell><TableCell>Cashier</TableCell><TableCell><span className="bema-badge-success">Active</span></TableCell></TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
