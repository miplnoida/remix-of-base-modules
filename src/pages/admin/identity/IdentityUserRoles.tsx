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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UserCog, Plus, Trash2, RefreshCw, Search, Calendar, Shield } from "lucide-react";
import { toast } from "sonner";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { useActionPermissions } from "@/hooks/useActionPermission";
import { format } from "date-fns";

const MODULE_NAME = "identity_user_roles";

interface UserRoleAssignment {
  UserId: string;
  RoleId: string;
  assigned_at: string;
  assigned_by: string | null;
  expires_at: string | null;
  user_name: string | null;
  user_email: string | null;
  user_code: string | null;
  role_name: string;
  is_privileged: boolean;
}

interface AspNetUser {
  Id: string;
  Email: string | null;
  full_name: string | null;
  user_code: string | null;
}

interface AspNetRole {
  Id: string;
  Name: string;
  is_privileged: boolean;
  require_mfa: boolean;
}

const IdentityUserRolesContent = () => {
  const { can } = useActionPermissions(MODULE_NAME);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");

  // Fetch all assignments with user and role details
  const { data: assignments = [], isLoading, refetch } = useQuery({
    queryKey: ["identity-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("AspNetUserRoles")
        .select(`
          UserId,
          RoleId,
          assigned_at,
          assigned_by,
          expires_at,
          AspNetUsers!inner (
            Id,
            Email,
            full_name,
            user_code
          ),
          AspNetRoles!inner (
            Id,
            Name,
            is_privileged
          )
        `)
        .order("assigned_at", { ascending: false });
      
      if (error) throw error;
      
      return data.map((item: any) => ({
        UserId: item.UserId,
        RoleId: item.RoleId,
        assigned_at: item.assigned_at,
        assigned_by: item.assigned_by,
        expires_at: item.expires_at,
        user_name: item.AspNetUsers?.full_name,
        user_email: item.AspNetUsers?.Email,
        user_code: item.AspNetUsers?.user_code,
        role_name: item.AspNetRoles?.Name,
        is_privileged: item.AspNetRoles?.is_privileged,
      })) as UserRoleAssignment[];
    },
  });

  // Fetch all users for dropdown
  const { data: users = [] } = useQuery({
    queryKey: ["identity-users-dropdown"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("AspNetUsers")
        .select("Id, Email, full_name, user_code")
        .eq("is_active", true)
        .order("full_name");
      
      if (error) throw error;
      return data as unknown as AspNetUser[];
    },
  });

  // Fetch all roles for dropdown
  const { data: roles = [] } = useQuery({
    queryKey: ["identity-roles-dropdown"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("AspNetRoles")
        .select("Id, Name, is_privileged, require_mfa")
        .eq("is_active", true)
        .order("Name");
      
      if (error) throw error;
      return data as unknown as AspNetRole[];
    },
  });

  // Assign role mutation
  const assignRole = useMutation({
    mutationFn: async ({ userId, roleId, expiresAt }: { userId: string; roleId: string; expiresAt?: string }) => {
      const { error } = await supabase
        .from("AspNetUserRoles")
        .insert({
          UserId: userId,
          RoleId: roleId,
          expires_at: expiresAt || null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity-user-roles"] });
      toast.success("Role assigned successfully");
      setShowAssignDialog(false);
      resetForm();
    },
    onError: (error) => {
      if (error.message.includes("duplicate")) {
        toast.error("This role is already assigned to the user");
      } else {
        toast.error(`Failed to assign role: ${error.message}`);
      }
    },
  });

  // Revoke role mutation
  const revokeRole = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const { error } = await supabase
        .from("AspNetUserRoles")
        .delete()
        .eq("UserId", userId)
        .eq("RoleId", roleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity-user-roles"] });
      toast.success("Role revoked successfully");
    },
    onError: (error) => {
      toast.error(`Failed to revoke role: ${error.message}`);
    },
  });

  const resetForm = () => {
    setSelectedUserId("");
    setSelectedRoleId("");
    setExpiresAt("");
  };

  const handleAssign = () => {
    if (!selectedUserId || !selectedRoleId) {
      toast.error("Please select both user and role");
      return;
    }
    assignRole.mutate({
      userId: selectedUserId,
      roleId: selectedRoleId,
      expiresAt: expiresAt || undefined,
    });
  };

  const handleRevoke = (assignment: UserRoleAssignment) => {
    if (confirm(`Revoke "${assignment.role_name}" role from ${assignment.user_name || assignment.user_email}?`)) {
      revokeRole.mutate({ userId: assignment.UserId, roleId: assignment.RoleId });
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const filteredAssignments = assignments.filter(a =>
    (a.user_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (a.user_email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (a.user_code?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (a.role_name?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  // Group by user for stats
  const userCount = new Set(assignments.map(a => a.UserId)).size;
  const roleCount = new Set(assignments.map(a => a.RoleId)).size;
  const privilegedCount = assignments.filter(a => a.is_privileged).length;
  const expiringCount = assignments.filter(a => {
    if (!a.expires_at) return false;
    const expiry = new Date(a.expires_at);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return expiry > now && expiry < weekFromNow;
  }).length;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading assignments...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Role Assignments</h1>
          <p className="text-muted-foreground">Manage user-role mappings in AspNetUserRoles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {can("assign") && (
            <Button onClick={() => setShowAssignDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Assign Role
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{assignments.length}</div>
            <p className="text-xs text-muted-foreground">Total Assignments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{userCount}</div>
            <p className="text-xs text-muted-foreground">Users with Roles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{privilegedCount}</div>
            <p className="text-xs text-muted-foreground">Privileged Assignments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{expiringCount}</div>
            <p className="text-xs text-muted-foreground">Expiring Soon (7 days)</p>
          </CardContent>
        </Card>
      </div>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Role Assignments</CardTitle>
              <CardDescription>All user-role assignments</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Code</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned At</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.map((assignment) => (
                <TableRow key={`${assignment.UserId}-${assignment.RoleId}`}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {assignment.user_code || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{assignment.user_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{assignment.user_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{assignment.role_name}</span>
                      {assignment.is_privileged && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          <Shield className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(assignment.assigned_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {assignment.expires_at ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(assignment.expires_at), "MMM d, yyyy")}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isExpired(assignment.expires_at) ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-600">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {can("revoke") && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleRevoke(assignment)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredAssignments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No assignments found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Role Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Role to User</DialogTitle>
            <DialogDescription>Select a user and role to create an assignment</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>User *</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.Id} value={user.Id}>
                      <span className="font-mono mr-2">[{user.user_code}]</span>
                      {user.full_name || user.Email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.Id} value={role.Id}>
                      <div className="flex items-center gap-2">
                        {role.Name}
                        {role.is_privileged && (
                          <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                            Privileged
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expires At (Optional)</Label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for permanent assignment
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={assignRole.isPending}>
              {assignRole.isPending ? "Assigning..." : "Assign Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const IdentityUserRoles = () => {
  return (
    <PermissionWrapper moduleName={MODULE_NAME}>
      <IdentityUserRolesContent />
    </PermissionWrapper>
  );
};

export default IdentityUserRoles;
