import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Plus, Edit, Trash2, RefreshCw, AlertTriangle, Lock } from "lucide-react";
import { toast } from "sonner";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { useActionPermissions } from "@/hooks/useActionPermission";

const MODULE_NAME = "identity_roles";

interface AspNetRole {
  Id: string;
  Name: string;
  NormalizedName: string;
  description: string | null;
  is_privileged: boolean;
  require_mfa: boolean;
  session_timeout_minutes: number;
  is_active: boolean;
  created_at: string;
}

const IdentityRolesContent = () => {
  const { can } = useActionPermissions(MODULE_NAME);
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AspNetRole | null>(null);
  const [formData, setFormData] = useState({
    Name: "",
    description: "",
    is_privileged: false,
    require_mfa: false,
    session_timeout_minutes: 30,
    is_active: true,
  });

  // Fetch roles
  const { data: roles = [], isLoading, refetch } = useQuery({
    queryKey: ["identity-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("AspNetRoles")
        .select("*")
        .order("Name");
      
      if (error) throw error;
      return data as unknown as AspNetRole[];
    },
  });

  // Fetch user counts per role
  const { data: roleCounts = {} } = useQuery({
    queryKey: ["identity-role-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("AspNetUserRoles")
        .select("RoleId");
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach((ur: any) => {
        counts[ur.RoleId] = (counts[ur.RoleId] || 0) + 1;
      });
      return counts;
    },
  });

  // Create role mutation
  const createRole = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("AspNetRoles")
        .insert({
          Id: crypto.randomUUID(),
          Name: data.Name,
          NormalizedName: data.Name.toUpperCase(),
          description: data.description,
          is_privileged: data.is_privileged,
          require_mfa: data.require_mfa,
          session_timeout_minutes: data.session_timeout_minutes,
          is_active: data.is_active,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity-roles"] });
      toast.success("Role created successfully");
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create role: ${error.message}`);
    },
  });

  // Update role mutation
  const updateRole = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & typeof formData) => {
      const { error } = await supabase
        .from("AspNetRoles")
        .update({
          Name: data.Name,
          NormalizedName: data.Name.toUpperCase(),
          description: data.description,
          is_privileged: data.is_privileged,
          require_mfa: data.require_mfa,
          session_timeout_minutes: data.session_timeout_minutes,
          is_active: data.is_active,
        })
        .eq("Id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity-roles"] });
      toast.success("Role updated successfully");
      setShowEditDialog(false);
    },
    onError: (error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });

  // Delete role mutation
  const deleteRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("AspNetRoles")
        .delete()
        .eq("Id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity-roles"] });
      toast.success("Role deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete role: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      Name: "",
      description: "",
      is_privileged: false,
      require_mfa: false,
      session_timeout_minutes: 30,
      is_active: true,
    });
  };

  const handleEdit = (role: AspNetRole) => {
    setSelectedRole(role);
    setFormData({
      Name: role.Name,
      description: role.description || "",
      is_privileged: role.is_privileged,
      require_mfa: role.require_mfa,
      session_timeout_minutes: role.session_timeout_minutes,
      is_active: role.is_active,
    });
    setShowEditDialog(true);
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const handleSaveCreate = () => {
    if (!formData.Name.trim()) {
      toast.error("Role name is required");
      return;
    }
    createRole.mutate(formData);
  };

  const handleSaveEdit = () => {
    if (!selectedRole || !formData.Name.trim()) {
      toast.error("Role name is required");
      return;
    }
    updateRole.mutate({ id: selectedRole.Id, ...formData });
  };

  const handleDelete = (role: AspNetRole) => {
    const count = roleCounts[role.Id] || 0;
    if (count > 0) {
      toast.error(`Cannot delete role with ${count} assigned user(s)`);
      return;
    }
    if (confirm(`Are you sure you want to delete the role "${role.Name}"?`)) {
      deleteRole.mutate(role.Id);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading roles...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Identity Roles</h1>
          <p className="text-muted-foreground">Manage roles in the Microsoft Identity system</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {can("create") && (
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Role
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{roles.length}</div>
            <p className="text-xs text-muted-foreground">Total Roles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {roles.filter(r => r.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">Active Roles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">
              {roles.filter(r => r.is_privileged).length}
            </div>
            <p className="text-xs text-muted-foreground">Privileged Roles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {roles.filter(r => r.require_mfa).length}
            </div>
            <p className="text-xs text-muted-foreground">MFA Required</p>
          </CardContent>
        </Card>
      </div>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>All roles in AspNetRoles table</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Security</TableHead>
                <TableHead>Session Timeout</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.Id}>
                  <TableCell className="font-medium">{role.Name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {role.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{roleCounts[role.Id] || 0} users</Badge>
                  </TableCell>
                  <TableCell>
                    {role.is_active ? (
                      <Badge variant="default" className="bg-green-600">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {role.is_privileged && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Privileged
                        </Badge>
                      )}
                      {role.require_mfa && (
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          <Lock className="h-3 w-3 mr-1" />
                          MFA
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{role.session_timeout_minutes} min</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {can("edit") && (
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(role)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {can("delete") && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleDelete(role)}
                          disabled={(roleCounts[role.Id] || 0) > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>Add a new role to the identity system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role Name *</Label>
              <Input
                value={formData.Name}
                onChange={(e) => setFormData(prev => ({ ...prev, Name: e.target.value }))}
                placeholder="e.g., Manager, Supervisor"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the role's responsibilities"
              />
            </div>
            <div className="space-y-2">
              <Label>Session Timeout (minutes)</Label>
              <Input
                type="number"
                value={formData.session_timeout_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, session_timeout_minutes: parseInt(e.target.value) || 30 }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Privileged Role</Label>
                <p className="text-xs text-muted-foreground">Elevated access with stricter controls</p>
              </div>
              <Switch
                checked={formData.is_privileged}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_privileged: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Require MFA</Label>
                <p className="text-xs text-muted-foreground">Force multi-factor authentication</p>
              </div>
              <Switch
                checked={formData.require_mfa}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, require_mfa: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCreate} disabled={createRole.isPending}>
              {createRole.isPending ? "Creating..." : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Update role settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role Name *</Label>
              <Input
                value={formData.Name}
                onChange={(e) => setFormData(prev => ({ ...prev, Name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Session Timeout (minutes)</Label>
              <Input
                type="number"
                value={formData.session_timeout_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, session_timeout_minutes: parseInt(e.target.value) || 30 }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Privileged Role</Label>
                <p className="text-xs text-muted-foreground">Elevated access with stricter controls</p>
              </div>
              <Switch
                checked={formData.is_privileged}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_privileged: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Require MFA</Label>
                <p className="text-xs text-muted-foreground">Force multi-factor authentication</p>
              </div>
              <Switch
                checked={formData.require_mfa}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, require_mfa: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateRole.isPending}>
              {updateRole.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const IdentityRoles = () => {
  return (
    <PermissionWrapper moduleName={MODULE_NAME}>
      <IdentityRolesContent />
    </PermissionWrapper>
  );
};

export default IdentityRoles;
