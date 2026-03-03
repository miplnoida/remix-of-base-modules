import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Employee } from "@/types/systemAdmin";
import { Badge } from "@/components/ui/badge";

interface EmployeeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
}

export function EmployeeDetailDialog({ open, onOpenChange, employee }: EmployeeDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Employee Details</DialogTitle>
          <DialogDescription>
            View complete employee information
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Employee ID</p>
              <p className="font-medium">{employee.employeeId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{employee.firstName} {employee.middleName} {employee.lastName}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{employee.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{employee.phone}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">National ID / SSN</p>
              <p className="font-medium">{employee.nationalIdSSN || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Employment Status</p>
              <Badge className={
                employee.employmentStatus === "Active" ? "bg-success/10 text-success" :
                employee.employmentStatus === "On Leave" ? "bg-info/10 text-info" :
                "bg-muted text-muted-foreground"
              }>
                {employee.employmentStatus}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Hire Date</p>
              <p className="font-medium">{new Date(employee.hireDate).toLocaleDateString()}</p>
            </div>
            {employee.endDate && (
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">{new Date(employee.endDate).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">{employee.location}</p>
            </div>
            {employee.zone && (
              <div>
                <p className="text-sm text-muted-foreground">Zone</p>
                <p className="font-medium">{employee.zone}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
