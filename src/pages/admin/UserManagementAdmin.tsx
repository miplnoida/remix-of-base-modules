import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, UserPlus, Search, Edit, Lock, Unlock, Shield, Eye } from "lucide-react";
import { toast } from "sonner";
import { useUserProfiles, useUpdateUserProfile, useTbOffices, useDepartments, useAssignRole, useRemoveRole, useUserRoles, AppRole } from "@/hooks/useAdminData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { useActionPermissions, MODULE_NAMES, ACTION_NAMES } from "@/hooks/useActionPermission";

const AVAILABLE_ROLES: AppRole[] = ['Admin', 'Clerk', 'FinanceOfficer', 'LegalOfficer', 'Supervisor', 'ReadOnly'];

const UserManagementContent = () => {
  const { can } = useActionPermissions(MODULE_NAMES.USER_MANAGEMENT);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRolesDialog, setShowRolesDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("");
  
  // Form state for create/edit
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    title: "",
    middle_name: "",
    phone: "",
    gender: "",
    date_of_birth: "",
    employee_code: "",
    office_code: "",
    department_id: "",
  });

  const { data: users = [], isLoading } = useUserProfiles();
  const { data: offices = [] } = useTbOffices();
  const { data: departments = [] } = useDepartments(selectedOfficeId || formData.office_code);
  const updateUser = useUpdateUserProfile();

  // Get roles for selected user
  const { data: userRoles = [] } = useQuery({
    queryKey: ['user-roles', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', selectedUserId);
      if (error) throw error;
      return data.map(r => r.role as AppRole);
    },
    enabled: !!selectedUserId,
  });

  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();

  const filteredUsers = users.filter(user =>
    (user.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (user.employee_code?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const handleToggleStatus = async (userId: string, currentStatus: boolean | null) => {
    try {
      await updateUser.mutateAsync({ id: userId, is_active: !currentStatus });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleEditUser = (user: typeof users[0]) => {
    setSelectedUserId(user.id);
    setFormData({
      full_name: user.full_name || "",
      email: user.email || "",
      title: user.title || "",
      middle_name: user.middle_name || "",
      phone: user.phone || "",
      gender: user.gender || "",
      date_of_birth: user.date_of_birth || "",
      employee_code: user.employee_code || "",
      office_code: user.office_code || "",
      department_id: user.department_id || "",
    });
    setSelectedOfficeId(user.office_code || "");
    setShowEditDialog(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUserId) return;
    try {
      await updateUser.mutateAsync({ id: selectedUserId, ...formData });
      setShowEditDialog(false);
      setSelectedUserId(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleManageRoles = (userId: string) => {
    setSelectedUserId(userId);
    setShowRolesDialog(true);
  };

  const handleRoleToggle = async (role: AppRole, isAssigned: boolean) => {
    if (!selectedUserId) return;
    try {
      if (isAssigned) {
        await removeRole.mutateAsync({ userId: selectedUserId, role });
      } else {
        await assignRole.mutateAsync({ userId: selectedUserId, role });
      }
    } catch (error) {
      // Error handled in hook
    }
  };

  const getStatusBadge = (isActive: boolean | null, lockedUntil: string | null) => {
    if (lockedUntil && new Date(lockedUntil) > new Date()) {
      return <Badge variant="destructive">Locked</Badge>;
    }
    return isActive ? (
      <Badge variant="default">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    locked: users.filter(u => u.locked_until && new Date(u.locked_until) > new Date()).length,
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading users...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage system users, roles, and permissions</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Total Users</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Active Users</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{stats.active}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Inactive Users</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-600">{stats.inactive}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Locked Accounts</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{stats.locked}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
          <CardDescription>Search and manage all system users</CardDescription>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or employee code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Employee Code</TableHead>
                <TableHead>Office</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>{user.employee_code || '-'}</TableCell>
                  <TableCell>{user.office?.description || '-'}</TableCell>
                  <TableCell>{user.department?.name || '-'}</TableCell>
                  <TableCell>{getStatusBadge(user.is_active, user.locked_until)}</TableCell>
                  <TableCell>{user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {can(ACTION_NAMES.EDIT) && (
                        <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)} title="Edit User">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {can(ACTION_NAMES.MANAGE_ROLES) && (
                        <Button variant="ghost" size="icon" onClick={() => handleManageRoles(user.id)} title="Manage Roles">
                          <Shield className="h-4 w-4" />
                        </Button>
                      )}
                      {can(ACTION_NAMES.DISABLE_USER) && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleToggleStatus(user.id, user.is_active)}
                          title={user.is_active ? "Disable User" : "Enable User"}
                        >
                          {user.is_active ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
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

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user profile information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Select value={formData.title} onValueChange={(v) => setFormData({...formData, title: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mr">Mr</SelectItem>
                    <SelectItem value="Mrs">Mrs</SelectItem>
                    <SelectItem value="Ms">Ms</SelectItem>
                    <SelectItem value="Dr">Dr</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Middle Name</Label>
                <Input value={formData.middle_name} onChange={(e) => setFormData({...formData, middle_name: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={formData.gender} onValueChange={(v) => setFormData({...formData, gender: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={formData.date_of_birth} onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Employee Code</Label>
                <Input value={formData.employee_code} onChange={(e) => setFormData({...formData, employee_code: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Office Location</Label>
                <Select 
                  value={formData.office_code} 
                  onValueChange={(v) => {
                    setFormData({...formData, office_code: v, department_id: ""});
                    setSelectedOfficeId(v);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select office" /></SelectTrigger>
                  <SelectContent>
                    {offices.map(office => (
                      <SelectItem key={office.code} value={office.code}>{office.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={formData.department_id} onValueChange={(v) => setFormData({...formData, department_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveUser} disabled={updateUser.isPending}>
              {updateUser.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Roles Dialog */}
      <Dialog open={showRolesDialog} onOpenChange={setShowRolesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User Roles</DialogTitle>
            <DialogDescription>Assign or remove roles for this user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {AVAILABLE_ROLES.map(role => {
              const isAssigned = userRoles.includes(role);
              return (
                <div key={role} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{role.replace('_', ' ')}</span>
                  </div>
                  <Checkbox 
                    checked={isAssigned}
                    onCheckedChange={() => handleRoleToggle(role, isAssigned)}
                    disabled={assignRole.isPending || removeRole.isPending}
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowRolesDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const UserManagementAdmin = () => {
  return (
    <PermissionWrapper moduleName={MODULE_NAMES.USER_MANAGEMENT}>
      <UserManagementContent />
    </PermissionWrapper>
  );
};

export default UserManagementAdmin;
