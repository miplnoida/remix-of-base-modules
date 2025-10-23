import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Edit, Shield, CheckCircle, XCircle } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  office: string;
  status: "active" | "inactive";
}

interface RolePermission {
  role: string;
  paymentEntry: boolean;
  batchManagement: boolean;
  receipts: boolean;
  invoices: boolean;
  glMapping: boolean;
  reports: boolean;
  adminConfig: boolean;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([
    { id: "1", name: "John Smith", email: "john.smith@ssb.gov.kn", role: "Cashier", office: "Basseterre Main", status: "active" },
    { id: "2", name: "Jane Doe", email: "jane.doe@ssb.gov.kn", role: "Supervisor", office: "Charlestown", status: "active" },
    { id: "3", name: "Mike Johnson", email: "mike.johnson@ssb.gov.kn", role: "Finance Officer", office: "Basseterre Main", status: "active" },
    { id: "4", name: "Sarah Williams", email: "sarah.williams@ssb.gov.kn", role: "Admin", office: "Headquarters", status: "active" }
  ]);

  const [rolePermissions] = useState<RolePermission[]>([
    { role: "Cashier", paymentEntry: true, batchManagement: true, receipts: true, invoices: false, glMapping: false, reports: true, adminConfig: false },
    { role: "Supervisor", paymentEntry: true, batchManagement: true, receipts: true, invoices: true, glMapping: false, reports: true, adminConfig: false },
    { role: "Finance Officer", paymentEntry: false, batchManagement: true, receipts: true, invoices: true, glMapping: true, reports: true, adminConfig: false },
    { role: "Admin", paymentEntry: true, batchManagement: true, receipts: true, invoices: true, glMapping: true, reports: true, adminConfig: true },
    { role: "MIS", paymentEntry: false, batchManagement: false, receipts: true, invoices: true, glMapping: false, reports: true, adminConfig: true },
    { role: "Auditor", paymentEntry: false, batchManagement: true, receipts: true, invoices: true, glMapping: false, reports: true, adminConfig: false }
  ]);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "",
    office: ""
  });

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email || !newUser.role || !newUser.office) {
      toast.error("Please fill all required fields");
      return;
    }

    const user: User = {
      id: Date.now().toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      office: newUser.office,
      status: "active"
    };

    setUsers([...users, user]);
    setShowAddDialog(false);
    setNewUser({ name: "", email: "", role: "", office: "" });
    toast.success("User added successfully!");
  };

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <span className="bema-badge-success">ACTIVE</span>
    ) : (
      <span className="bg-gray-200 text-gray-800 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">INACTIVE</span>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="bema-h1 mb-2" style={{ color: "hsl(var(--bema-text-primary))" }}>User Management</h1>
          <p className="bema-t1" style={{ color: "hsl(var(--bema-text-secondary))" }}>
            Manage finance module users and role-based access control
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bema-btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="bema-h2">Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="bema-t1">Full Name *</Label>
                <Input
                  placeholder="Enter full name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="bema-t1">Email *</Label>
                <Input
                  type="email"
                  placeholder="email@ssb.gov.kn"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="bema-t1">Role *</Label>
                <Select value={newUser.role} onValueChange={(val) => setNewUser({ ...newUser, role: val })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cashier">Cashier</SelectItem>
                    <SelectItem value="Supervisor">Supervisor</SelectItem>
                    <SelectItem value="Finance Officer">Finance Officer</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="MIS">MIS</SelectItem>
                    <SelectItem value="Auditor">Auditor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="bema-t1">Office *</Label>
                <Select value={newUser.office} onValueChange={(val) => setNewUser({ ...newUser, office: val })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select office" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Headquarters">Headquarters</SelectItem>
                    <SelectItem value="Basseterre Main">Basseterre Main</SelectItem>
                    <SelectItem value="Charlestown">Charlestown</SelectItem>
                    <SelectItem value="Cayon">Cayon</SelectItem>
                    <SelectItem value="Sandy Point">Sandy Point</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddUser} className="w-full bema-btn-primary">
                <Shield className="h-4 w-4 mr-2" />
                Create User Account
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Total Users</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-primary))" }}>{users.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Active Users</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-success))" }}>
                {users.filter(u => u.status === "active").length}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Cashiers</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-accent))" }}>
                {users.filter(u => u.role === "Cashier").length}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Admins</p>
              <h3 className="bema-h2" style={{ color: "hsl(var(--bema-warning))" }}>
                {users.filter(u => u.role === "Admin").length}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card className="bema-card">
        <CardHeader>
          <CardTitle className="bema-h2">Finance Module Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="bema-table">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Office</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <span className="bema-badge-success">{user.role}</span>
                  </TableCell>
                  <TableCell>{user.office}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Permissions Matrix */}
      <Card className="bema-card">
        <CardHeader>
          <CardTitle className="bema-h2">Role Permissions Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="bema-table">
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Payment Entry</TableHead>
                <TableHead className="text-center">Batch Management</TableHead>
                <TableHead className="text-center">Receipts</TableHead>
                <TableHead className="text-center">Invoices</TableHead>
                <TableHead className="text-center">GL Mapping</TableHead>
                <TableHead className="text-center">Reports</TableHead>
                <TableHead className="text-center">Admin Config</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rolePermissions.map((perm, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{perm.role}</TableCell>
                  <TableCell className="text-center">
                    {perm.paymentEntry ? (
                      <CheckCircle className="h-4 w-4 mx-auto" style={{ color: "hsl(var(--bema-success))" }} />
                    ) : (
                      <XCircle className="h-4 w-4 mx-auto text-gray-400" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {perm.batchManagement ? (
                      <CheckCircle className="h-4 w-4 mx-auto" style={{ color: "hsl(var(--bema-success))" }} />
                    ) : (
                      <XCircle className="h-4 w-4 mx-auto text-gray-400" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {perm.receipts ? (
                      <CheckCircle className="h-4 w-4 mx-auto" style={{ color: "hsl(var(--bema-success))" }} />
                    ) : (
                      <XCircle className="h-4 w-4 mx-auto text-gray-400" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {perm.invoices ? (
                      <CheckCircle className="h-4 w-4 mx-auto" style={{ color: "hsl(var(--bema-success))" }} />
                    ) : (
                      <XCircle className="h-4 w-4 mx-auto text-gray-400" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {perm.glMapping ? (
                      <CheckCircle className="h-4 w-4 mx-auto" style={{ color: "hsl(var(--bema-success))" }} />
                    ) : (
                      <XCircle className="h-4 w-4 mx-auto text-gray-400" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {perm.reports ? (
                      <CheckCircle className="h-4 w-4 mx-auto" style={{ color: "hsl(var(--bema-success))" }} />
                    ) : (
                      <XCircle className="h-4 w-4 mx-auto text-gray-400" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {perm.adminConfig ? (
                      <CheckCircle className="h-4 w-4 mx-auto" style={{ color: "hsl(var(--bema-success))" }} />
                    ) : (
                      <XCircle className="h-4 w-4 mx-auto text-gray-400" />
                    )}
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
