import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Shield, Trash2, Loader2 } from "lucide-react";
import { useDbRoles, useRolePermissions, DbRole } from "@/hooks/useRolesData";
import { RoleFormDialog } from "@/components/systemAdmin/RoleFormDialog";
import { PermissionsDialog } from "@/components/systemAdmin/PermissionsDialog";
import { DeleteRoleDialog } from "@/components/systemAdmin/DeleteRoleDialog";

export default function RoleList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<DbRole | undefined>();

  const { data: roles = [], isLoading, error } = useDbRoles();

  const filteredRoles = roles.filter(role =>
    role.role_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (role.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleEdit = (role: DbRole) => {
    setSelectedRole(role);
    setFormOpen(true);
  };

  const handlePermissions = (role: DbRole) => {
    setSelectedRole(role);
    setPermissionsOpen(true);
  };

  const handleDelete = (role: DbRole) => {
    setSelectedRole(role);
    setDeleteOpen(true);
  };

  const handleAddNew = () => {
    setSelectedRole(undefined);
    setFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading roles: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">Manage roles and permissions</p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roles ({roles.length})</CardTitle>
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
                <TableHead>Type</TableHead>
                <TableHead>MFA Required</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      {role.role_name}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{role.description || '-'}</TableCell>
                  <TableCell>
                    {role.is_system_role ? (
                      <Badge className="bg-blue-100 text-blue-800">System</Badge>
                    ) : (
                      <Badge variant="outline">Custom</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {role.mfa_required ? (
                      <Badge variant="default">Required</Badge>
                    ) : (
                      <Badge variant="secondary">Optional</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {role.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handlePermissions(role)}
                        title="Manage Permissions"
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        disabled={role.is_system_role}
                        onClick={() => handleEdit(role)}
                        title="Edit Role"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        disabled={role.is_system_role}
                        onClick={() => handleDelete(role)}
                        title="Delete Role"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRoles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No roles found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RoleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        role={selectedRole}
      />

      {selectedRole && (
        <>
          <PermissionsDialog
            open={permissionsOpen}
            onOpenChange={setPermissionsOpen}
            role={selectedRole}
          />
          <DeleteRoleDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            role={selectedRole}
          />
        </>
      )}
    </div>
  );
}
