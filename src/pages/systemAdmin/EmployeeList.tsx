import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Eye } from "lucide-react";
import { employees } from "@/services/mockData/systemAdminData";
import { useToast } from "@/hooks/use-toast";
import { EmployeeFormDialog } from "@/components/systemAdmin/EmployeeFormDialog";
import { EmployeeDetailDialog } from "@/components/systemAdmin/EmployeeDetailDialog";
import { Employee } from "@/types/systemAdmin";

export default function EmployeeList() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>();

  const filteredEmployees = employees.filter(emp =>
    emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      Active: "bg-primary/10 text-primary",
      "On Leave": "bg-accent/30 text-accent-foreground",
      Suspended: "bg-destructive/10 text-destructive",
      Terminated: "bg-muted text-muted-foreground",
      Retired: "bg-secondary/10 text-secondary",
    };
    return <Badge className={variants[status] || ""}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Employee Management</h1>
          <p className="text-muted-foreground">Manage employee profiles and information</p>
        </div>
        <Button onClick={() => { setSelectedEmployee(undefined); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.employeeId}>
                  <TableCell className="font-medium">{employee.employeeId}</TableCell>
                  <TableCell>{`${employee.firstName} ${employee.lastName}`}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.location}</TableCell>
                  <TableCell>{getStatusBadge(employee.employmentStatus)}</TableCell>
                  <TableCell>{new Date(employee.hireDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedEmployee(employee); setDetailOpen(true); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedEmployee(employee); setFormOpen(true); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        employee={selectedEmployee}
        onSave={(employee) => {
          toast({
            title: selectedEmployee ? "Employee Updated" : "Employee Created",
            description: `Employee ${employee.firstName} ${employee.lastName} has been ${selectedEmployee ? "updated" : "created"} successfully.`,
          });
        }}
      />

      {selectedEmployee && (
        <EmployeeDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          employee={selectedEmployee}
        />
      )}
    </div>
  );
}
