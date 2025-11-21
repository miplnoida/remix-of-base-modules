import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Shield } from "lucide-react";
import { roles, rolePermissions, permissions } from "@/services/mockData/systemAdminData";
import { useToast } from "@/hooks/use-toast";
import { RoleFormDialog } from "@/components/systemAdmin/RoleFormDialog";
import { PermissionsDialog } from "@/components/systemAdmin/PermissionsDialog";
import { Role } from "@/types/systemAdmin";

export default function RoleList() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | undefined>();

  const filteredRoles = roles.filter(role =>
    role.roleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPermissionCount = (roleId: string) => {
    return rolePermissions.filter(rp => rp.roleId === roleId).length;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">Manage roles and permissions</p>
        </div>
        <Button onClick={() => { setSelectedRole(undefined); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>System Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.map((role) => (
                <TableRow key={role.roleId}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      {role.roleName}
                    </div>
                  </TableCell>
                  <TableCell>{role.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getPermissionCount(role.roleId)} permissions</Badge>
                  </TableCell>
                  <TableCell>
                    {role.isSystemRole ? (
                      <Badge className="bg-blue-100 text-blue-800">System</Badge>
                    ) : (
                      <Badge variant="outline">Custom</Badge>
                    )}
                   </TableCell>
                   <TableCell>
                     <div className="flex gap-2">
                       <Button variant="ghost" size="sm" onClick={() => { setSelectedRole(role); setPermissionsOpen(true); }}>
                         <Shield className="h-4 w-4" />
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="sm"
                         disabled={role.isSystemRole}
                         onClick={() => { setSelectedRole(role); setFormOpen(true); }}
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

      <RoleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        role={selectedRole}
        onSave={(role) => {
          toast({
            title: selectedRole ? "Role Updated" : "Role Created",
            description: `Role ${role.roleName} has been ${selectedRole ? "updated" : "created"} successfully.`,
          });
        }}
      />

      {selectedRole && (
        <PermissionsDialog
          open={permissionsOpen}
          onOpenChange={setPermissionsOpen}
          role={selectedRole}
        />
      )}
    </div>
  );
}
