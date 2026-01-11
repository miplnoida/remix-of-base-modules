import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Shield, Plus, Edit, Trash2, Search, Settings, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { useActionPermissions, MODULE_NAMES, ACTION_NAMES } from "@/hooks/useActionPermission";
import { useSystemLogger } from "@/hooks/useSystemLogger";

interface Role {
  id: string;
  role_name: string;
  description: string | null;
  is_active: boolean;
  is_system_role: boolean;
  mfa_required: boolean;
  created_at: string;
}

const RoleListContent = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = useActionPermissions(MODULE_NAMES.ROLE_MANAGEMENT);
  const { logBusinessEvent, logAudit, logTechnical, startNewCorrelation } = useSystemLogger();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloningRole, setCloningRole] = useState<Role | null>(null);
  const [cloneRoleName, setCloneRoleName] = useState("");
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    role_name: "",
    description: "",
    is_active: true,
    is_system_role: false,
    mfa_required: false,
  });

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('role_name');
      if (error) throw error;
      return data as Role[];
    },
  });

  const createRole = useMutation({
    mutationFn: async (data: typeof formData) => {
      startNewCorrelation();
      const startTime = performance.now();
      const { data: result, error } = await supabase.from('roles').insert(data).select().single();
      if (error) throw error;
      
      const executionTime = Math.round(performance.now() - startTime);
      logTechnical({
        api_name: 'roles.insert',
        module: 'RoleManagement',
        entity_type: 'role',
        entity_id: result?.id,
        execution_time_ms: executionTime,
        status: 'success',
        severity: 'info',
      });
      
      logBusinessEvent({
        module: 'RoleManagement',
        entity_type: 'role',
        entity_id: result?.id,
        action: 'CREATE',
        description: `Created role: ${data.role_name}`,
      });
      
      logAudit({
        module: 'RoleManagement',
        entity_type: 'role',
        entity_id: result?.id,
        action: 'CREATE',
        after_value: data,
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role created successfully');
      setShowDialog(false);
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & typeof formData) => {
      startNewCorrelation();
      // Get before value for audit
      const { data: beforeData } = await supabase.from('roles').select('*').eq('id', id).single();
      
      const startTime = performance.now();
      const { error } = await supabase.from('roles').update(data).eq('id', id);
      if (error) throw error;
      
      const executionTime = Math.round(performance.now() - startTime);
      logTechnical({
        api_name: 'roles.update',
        module: 'RoleManagement',
        entity_type: 'role',
        entity_id: id,
        execution_time_ms: executionTime,
        status: 'success',
        severity: 'info',
      });
      
      logBusinessEvent({
        module: 'RoleManagement',
        entity_type: 'role',
        entity_id: id,
        action: 'UPDATE',
        description: `Updated role: ${data.role_name}`,
      });
      
      logAudit({
        module: 'RoleManagement',
        entity_type: 'role',
        entity_id: id,
        action: 'UPDATE',
        before_value: beforeData,
        after_value: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role updated successfully');
      setShowDialog(false);
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteRole = useMutation({
    mutationFn: async (id: string) => {
      startNewCorrelation();
      // Get before value for audit
      const { data: beforeData } = await supabase.from('roles').select('*').eq('id', id).single();
      
      const startTime = performance.now();
      const { error } = await supabase.from('roles').delete().eq('id', id);
      if (error) throw error;
      
      const executionTime = Math.round(performance.now() - startTime);
      logTechnical({
        api_name: 'roles.delete',
        module: 'RoleManagement',
        entity_type: 'role',
        entity_id: id,
        execution_time_ms: executionTime,
        status: 'success',
        severity: 'info',
      });
      
      logBusinessEvent({
        module: 'RoleManagement',
        entity_type: 'role',
        entity_id: id,
        action: 'DELETE',
        description: `Deleted role: ${beforeData?.role_name}`,
      });
      
      logAudit({
        module: 'RoleManagement',
        entity_type: 'role',
        entity_id: id,
        action: 'DELETE',
        before_value: beforeData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role deleted successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cloneRole = useMutation({
    mutationFn: async ({ sourceRoleId, newRoleName }: { sourceRoleId: string; newRoleName: string }) => {
      startNewCorrelation();
      // Get source role for logging
      const { data: sourceRole } = await supabase.from('roles').select('*').eq('id', sourceRoleId).single();
      
      const startTime = performance.now();
      // Use the database function to clone role with permissions atomically
      const { data, error } = await supabase.rpc('clone_role', {
        source_role_id: sourceRoleId,
        new_role_name: newRoleName.trim(),
      });
      
      if (error) throw error;
      
      const executionTime = Math.round(performance.now() - startTime);
      logTechnical({
        api_name: 'clone_role',
        module: 'RoleManagement',
        entity_type: 'role',
        entity_id: data,
        execution_time_ms: executionTime,
        status: 'success',
        severity: 'info',
      });
      
      logBusinessEvent({
        module: 'RoleManagement',
        entity_type: 'role',
        entity_id: data,
        action: 'CLONE',
        description: `Cloned role "${sourceRole?.role_name}" to "${newRoleName}"`,
      });
      
      logAudit({
        module: 'RoleManagement',
        entity_type: 'role',
        entity_id: data,
        action: 'CLONE',
        before_value: { source_role: sourceRole },
        after_value: { new_role_name: newRoleName },
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('Role cloned successfully with all permissions');
      setShowCloneDialog(false);
      setCloningRole(null);
      setCloneRoleName("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleClone = (role: Role) => {
    setCloningRole(role);
    setCloneRoleName(`${role.role_name} (Copy)`);
    setShowCloneDialog(true);
  };

  const handleCloneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cloningRole && cloneRoleName.trim()) {
      cloneRole.mutate({ sourceRoleId: cloningRole.id, newRoleName: cloneRoleName.trim() });
    }
  };

  const resetForm = () => {
    setFormData({
      role_name: "",
      description: "",
      is_active: true,
      is_system_role: false,
      mfa_required: false,
    });
    setEditingRole(null);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      role_name: role.role_name,
      description: role.description || "",
      is_active: role.is_active,
      is_system_role: role.is_system_role,
      mfa_required: role.mfa_required,
    });
    setShowDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRole) {
      updateRole.mutate({ id: editingRole.id, ...formData });
    } else {
      createRole.mutate(formData);
    }
  };

  const filteredRoles = roles.filter(role =>
    role.role_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (role.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading roles...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Role Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage system roles</p>
        </div>
        {can(ACTION_NAMES.CREATE_ROLE) && (
          <Button onClick={() => { resetForm(); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Roles
          </CardTitle>
          <CardDescription>Manage roles and their MFA requirements</CardDescription>
          <div className="relative mt-4 w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>System Role</TableHead>
                <TableHead>MFA Required</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.map(role => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.role_name}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{role.description || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={role.is_active ? "default" : "secondary"}>
                      {role.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={role.is_system_role ? "outline" : "secondary"}>
                      {role.is_system_role ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={role.mfa_required ? "destructive" : "secondary"}>
                      {role.mfa_required ? "Required" : "Optional"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {can(ACTION_NAMES.CONFIGURE_PERMISSIONS) && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => navigate(`/admin/roles-permissions?role=${role.role_name}`)}
                          title="Configure Permissions"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                      {can(ACTION_NAMES.CLONE_ROLE) && (
                        <Button variant="ghost" size="icon" onClick={() => handleClone(role)} title="Clone Role">
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {can(ACTION_NAMES.EDIT_ROLE) && (
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(role)} title="Edit Role">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {can(ACTION_NAMES.DELETE_ROLE) && !role.is_system_role && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteRole.mutate(role.id)}
                          title="Delete Role"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Create New Role"}</DialogTitle>
            <DialogDescription>
              {editingRole ? "Update role details" : "Create a new system role"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role_name">Role Name *</Label>
              <Input
                id="role_name"
                required
                value={formData.role_name}
                onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                placeholder="e.g., Finance Manager"
                disabled={editingRole?.is_system_role}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the role responsibilities and purpose"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="is_active">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive roles cannot be assigned</p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="mfa_required">MFA Required</Label>
                <p className="text-xs text-muted-foreground">Users must enable MFA to use this role</p>
              </div>
              <Switch
                id="mfa_required"
                checked={formData.mfa_required}
                onCheckedChange={(checked) => setFormData({ ...formData, mfa_required: checked })}
              />
            </div>

            {!editingRole && (
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="is_system_role">System Role</Label>
                  <p className="text-xs text-muted-foreground">System roles cannot be deleted</p>
                </div>
                <Switch
                  id="is_system_role"
                  checked={formData.is_system_role}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_system_role: checked })}
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRole.isPending || updateRole.isPending}>
                {editingRole ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Clone Role Dialog */}
      <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clone Role</DialogTitle>
            <DialogDescription>
              Create a copy of "{cloningRole?.role_name}" with a new name
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCloneSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clone_role_name">New Role Name *</Label>
              <Input
                id="clone_role_name"
                required
                value={cloneRoleName}
                onChange={(e) => setCloneRoleName(e.target.value)}
                placeholder="Enter new role name"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCloneDialog(false); setCloningRole(null); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={cloneRole.isPending || !cloneRoleName.trim()}>
                <Copy className="h-4 w-4 mr-2" />
                {cloneRole.isPending ? 'Cloning...' : 'Clone Role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const RoleList = () => {
  return (
    <PermissionWrapper moduleName={MODULE_NAMES.ROLE_MANAGEMENT}>
      <RoleListContent />
    </PermissionWrapper>
  );
};

export default RoleList;
