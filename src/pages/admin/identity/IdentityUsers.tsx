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
import { Users, UserPlus, Search, Edit, Lock, Unlock, Shield, Eye, RefreshCw, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { useActionPermissions } from "@/hooks/useActionPermission";
import { format } from "date-fns";

const MODULE_NAME = "identity_users";

interface AspNetUser {
  Id: string;
  UserName: string | null;
  Email: string | null;
  user_code: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  full_name: string | null;
  PhoneNumber: string | null;
  is_active: boolean;
  EmailConfirmed: boolean;
  TwoFactorEnabled: boolean;
  LockoutEnd: string | null;
  AccessFailedCount: number;
  force_password_change: boolean;
  created_at: string;
  last_login: string | null;
}

const IdentityUsersContent = () => {
  const { can } = useActionPermissions(MODULE_NAME);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AspNetUser | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    PhoneNumber: "",
    is_active: true,
    TwoFactorEnabled: false,
    force_password_change: false,
  });

  // Fetch users from AspNetUsers
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["identity-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("AspNetUsers")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as unknown as AspNetUser[];
    },
  });

  // Update user mutation
  const updateUser = useMutation({
    mutationFn: async (updates: Partial<AspNetUser> & { Id: string }) => {
      const { Id, ...data } = updates;
      const { error } = await supabase
        .from("AspNetUsers")
        .update({
          ...data,
          full_name: [data.first_name, data.middle_name, data.last_name].filter(Boolean).join(" "),
        })
        .eq("Id", Id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity-users"] });
      toast.success("User updated successfully");
      setShowEditDialog(false);
    },
    onError: (error) => {
      toast.error(`Failed to update user: ${error.message}`);
    },
  });

  // Unlock user mutation
  const unlockUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("AspNetUsers")
        .update({ LockoutEnd: null, AccessFailedCount: 0 })
        .eq("Id", userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity-users"] });
      toast.success("User unlocked successfully");
    },
    onError: (error) => {
      toast.error(`Failed to unlock user: ${error.message}`);
    },
  });

  // Toggle user status
  const toggleStatus = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("AspNetUsers")
        .update({ is_active: !isActive })
        .eq("Id", userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity-users"] });
      toast.success("User status updated");
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const filteredUsers = users.filter(user =>
    (user.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (user.Email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (user.user_code?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const handleEdit = (user: AspNetUser) => {
    setSelectedUser(user);
    setFormData({
      first_name: user.first_name || "",
      middle_name: user.middle_name || "",
      last_name: user.last_name || "",
      PhoneNumber: user.PhoneNumber || "",
      is_active: user.is_active,
      TwoFactorEnabled: user.TwoFactorEnabled,
      force_password_change: user.force_password_change,
    });
    setShowEditDialog(true);
  };

  const handleSave = () => {
    if (!selectedUser) return;
    updateUser.mutate({
      Id: selectedUser.Id,
      ...formData,
    });
  };

  const isLocked = (user: AspNetUser) => {
    return user.LockoutEnd && new Date(user.LockoutEnd) > new Date();
  };

  const getStatusBadge = (user: AspNetUser) => {
    if (isLocked(user)) {
      return <Badge variant="destructive">Locked</Badge>;
    }
    return user.is_active ? (
      <Badge variant="default" className="bg-green-600">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    locked: users.filter(u => isLocked(u)).length,
    mfaEnabled: users.filter(u => u.TwoFactorEnabled).length,
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading identity users...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Identity Users</h1>
          <p className="text-muted-foreground">Manage users in the Microsoft Identity system</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-muted-foreground">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground">Inactive</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{stats.locked}</div>
            <p className="text-xs text-muted-foreground">Locked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.mfaEnabled}</div>
            <p className="text-xs text-muted-foreground">MFA Enabled</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>All users in AspNetUsers table</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or user code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.Id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {user.user_code || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                  <TableCell>{user.Email || "—"}</TableCell>
                  <TableCell>{user.PhoneNumber || "—"}</TableCell>
                  <TableCell>{getStatusBadge(user)}</TableCell>
                  <TableCell>
                    {user.TwoFactorEnabled ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <Shield className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Disabled
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.last_login ? format(new Date(user.last_login), "MMM d, yyyy HH:mm") : "Never"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {can("edit") && (
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {can("unlock") && isLocked(user) && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => unlockUser.mutate(user.Id)}
                        >
                          <Unlock className="h-4 w-4" />
                        </Button>
                      )}
                      {can("disable") && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => toggleStatus.mutate({ userId: user.Id, isActive: user.is_active })}
                        >
                          {user.is_active ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details. User Code: <span className="font-mono font-bold">{selectedUser?.user_code}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Middle Name</Label>
              <Input
                value={formData.middle_name}
                onChange={(e) => setFormData(prev => ({ ...prev, middle_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={formData.PhoneNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, PhoneNumber: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active Status</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Two-Factor Authentication</Label>
              <Switch
                checked={formData.TwoFactorEnabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, TwoFactorEnabled: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Force Password Change</Label>
              <Switch
                checked={formData.force_password_change}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, force_password_change: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateUser.isPending}>
              {updateUser.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const IdentityUsers = () => {
  return (
    <PermissionWrapper moduleName={MODULE_NAME}>
      <IdentityUsersContent />
    </PermissionWrapper>
  );
};

export default IdentityUsers;
