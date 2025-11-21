import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Search, Activity } from "lucide-react";
import { AddProcedureDialog } from "@/components/nbenefit/config/AddProcedureDialog";

export const ProcedureRegistry = () => {
  const [addOpen, setAddOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const procedures = [
    { id: 1, code: "SURG001", name: "Appendectomy", category: "Surgery", active: true },
    { id: 2, code: "SURG002", name: "Knee Replacement", category: "Surgery", active: true },
    { id: 3, code: "DIAG001", name: "MRI Scan", category: "Diagnostic", active: true },
    { id: 4, code: "TREAT001", name: "Chemotherapy", category: "Treatment", active: true },
    { id: 5, code: "REHAB001", name: "Physical Therapy", category: "Rehabilitation", active: true },
    { id: 6, code: "HOSP001", name: "ICU Care", category: "Hospitalisation", active: true },
    { id: 7, code: "SURG003", name: "Cardiac Bypass", category: "Surgery", active: true },
    { id: 8, code: "DIAG002", name: "CT Scan", category: "Diagnostic", active: true },
    { id: 9, code: "TREAT002", name: "Dialysis", category: "Treatment", active: true },
    { id: 10, code: "SURG004", name: "Hip Replacement", category: "Surgery", active: false },
  ];

  const filteredProcedures = procedures.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Procedure
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Procedure Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProcedures.map((procedure) => (
              <TableRow key={procedure.id}>
                <TableCell className="font-mono">{procedure.code}</TableCell>
                <TableCell className="font-medium">{procedure.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    <Activity className="h-3 w-3 mr-1" />
                    {procedure.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={procedure.active ? "default" : "secondary"}>
                    {procedure.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AddProcedureDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
};
