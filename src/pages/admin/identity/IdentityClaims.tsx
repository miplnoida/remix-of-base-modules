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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tag, Plus, Search, Edit, Trash2, RefreshCw, User, Shield } from "lucide-react";
import { toast } from "sonner";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { useActionPermissions } from "@/hooks/useActionPermission";
import { format } from "date-fns";

const MODULE_NAME = "identity_claims";

interface UserClaim {
  Id: number;
  UserId: string;
  ClaimType: string | null;
  ClaimValue: string | null;
  created_at: string;
  user_name?: string | null;
  user_email?: string | null;
}

interface RoleClaim {
  Id: number;
  RoleId: string;
  ClaimType: string | null;
  ClaimValue: string | null;
  created_at: string;
  role_name?: string;
}

interface AspNetUser {
  Id: string;
  full_name: string | null;
  Email: string | null;
  user_code: string | null;
}

interface AspNetRole {
  Id: string;
  Name: string;
}

const IdentityClaimsContent = () => {
  const { can } = useActionPermissions(MODULE_NAME);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("user-claims");
  
  // User Claims Dialog State
  const [showUserClaimDialog, setShowUserClaimDialog] = useState(false);
  const [editingUserClaim, setEditingUserClaim] = useState<UserClaim | null>(null);
  const [userClaimForm, setUserClaimForm] = useState({
    UserId: "",
    ClaimType: "",
    ClaimValue: "",
  });

  // Role Claims Dialog State
  const [showRoleClaimDialog, setShowRoleClaimDialog] = useState(false);
  const [editingRoleClaim, setEditingRoleClaim] = useState<RoleClaim | null>(null);
  const [roleClaimForm, setRoleClaimForm] = useState({
    RoleId: "",
    ClaimType: "",
    ClaimValue: "",
  });

  // Fetch Users for dropdown
  const { data: users = [] } = useQuery({
    queryKey: ["identity-users-dropdown"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("AspNetUsers")
        .select("Id, full_name, Email, user_code")
        .eq("is_active", true)
        .order("full_name");
      
      if (error) throw error;
      return data as unknown as AspNetUser[];
    },
  });

  // Fetch Roles for dropdown
  const { data: roles = [] } = useQuery({
    queryKey: ["identity-roles-dropdown"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("AspNetRoles")
        .select("Id, Name")
        .eq("is_active", true)
        .order("Name");
      
      if (error) throw error;
      return data as unknown as AspNetRole[];
    },
  });

  // Fetch User Claims
  const { data: userClaims = [], isLoading: isLoadingUserClaims, refetch: refetchUserClaims } = useQuery({
    queryKey: ["identity-user-claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("AspNetUserClaims")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      // Enrich with user info
      const enrichedClaims: UserClaim[] = [];
      for (const claim of data || []) {
        const user = users.find(u => u.Id === claim.UserId);
        enrichedClaims.push({
          ...claim,
          user_name: user?.full_name || null,
          user_email: user?.Email || null,
        });
      }
      
      return enrichedClaims;
    },
    enabled: users.length > 0,
  });

  // Fetch Role Claims
  const { data: roleClaims = [], isLoading: isLoadingRoleClaims, refetch: refetchRoleClaims } = useQuery({
    queryKey: ["identity-role-claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("AspNetRoleClaims")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      // Enrich with role info
      const enrichedClaims: RoleClaim[] = [];
      for (const claim of data || []) {
        const role = roles.find(r => r.Id === claim.RoleId);
        enrichedClaims.push({
          ...claim,
          role_name: role?.Name || "Unknown",
        });
      }
      
      return enrichedClaims;
    },
    enabled: roles.length > 0,
  });

  // User Claims Mutations
  const createUserClaim = useMutation({
    mutationFn: async (data: typeof userClaimForm) => {
      const { error } = await supabase
        .from("AspNetUserClaims")
        .insert({
          UserId: data.UserId,
          ClaimType: data.ClaimType,
          ClaimValue: data.ClaimValue,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity-user-claims"] });
      toast.success("User claim created successfully");
      setShowUserClaimDialog(false);
      resetUserClaimForm();
    },
    onError: (error) => {
      toast.error(`Failed to create user claim: ${error.message}`);
    },
  });

  const updateUserClaim = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof userClaimForm> }) => {
      const { error } = await supabase
        .from("AspNetUserClaims")
        .update({
          ClaimType: data.ClaimType,
          ClaimValue: data.ClaimValue,
        })
        .eq("Id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity-user-claims"] });
      toast.success("User claim updated successfully");
      setShowUserClaimDialog(false);
      setEditingUserClaim(null);
      resetUserClaimForm();
    },
    onError: (error) => {
      toast.error(`Failed to update user claim: ${error.message}`);
    },
  });

  const deleteUserClaim = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("AspNetUserClaims")
        .delete()
        .eq("Id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity-user-claims"] });
      toast.success("User claim deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete user claim: ${error.message}`);
    },
  });

  // Role Claims Mutations
  const createRoleClaim = useMutation({
    mutationFn: async (data: typeof roleClaimForm) => {
      const { error } = await supabase
        .from("AspNetRoleClaims")
        .insert({
          RoleId: data.RoleId,
          ClaimType: data.ClaimType,
          ClaimValue: data.ClaimValue,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity-role-claims"] });
      toast.success("Role claim created successfully");
      setShowRoleClaimDialog(false);
      resetRoleClaimForm();
    },
    onError: (error) => {
      toast.error(`Failed to create role claim: ${error.message}`);
    },
  });

  const updateRoleClaim = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof roleClaimForm> }) => {
      const { error } = await supabase
        .from("AspNetRoleClaims")
        .update({
          ClaimType: data.ClaimType,
          ClaimValue: data.ClaimValue,
        })
        .eq("Id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity-role-claims"] });
      toast.success("Role claim updated successfully");
      setShowRoleClaimDialog(false);
      setEditingRoleClaim(null);
      resetRoleClaimForm();
    },
    onError: (error) => {
      toast.error(`Failed to update role claim: ${error.message}`);
    },
  });

  const deleteRoleClaim = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("AspNetRoleClaims")
        .delete()
        .eq("Id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity-role-claims"] });
      toast.success("Role claim deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete role claim: ${error.message}`);
    },
  });

  const resetUserClaimForm = () => {
    setUserClaimForm({ UserId: "", ClaimType: "", ClaimValue: "" });
  };

  const resetRoleClaimForm = () => {
    setRoleClaimForm({ RoleId: "", ClaimType: "", ClaimValue: "" });
  };

  const handleEditUserClaim = (claim: UserClaim) => {
    setEditingUserClaim(claim);
    setUserClaimForm({
      UserId: claim.UserId,
      ClaimType: claim.ClaimType || "",
      ClaimValue: claim.ClaimValue || "",
    });
    setShowUserClaimDialog(true);
  };

  const handleEditRoleClaim = (claim: RoleClaim) => {
    setEditingRoleClaim(claim);
    setRoleClaimForm({
      RoleId: claim.RoleId,
      ClaimType: claim.ClaimType || "",
      ClaimValue: claim.ClaimValue || "",
    });
    setShowRoleClaimDialog(true);
  };

  const handleSaveUserClaim = () => {
    if (!userClaimForm.UserId || !userClaimForm.ClaimType) {
      toast.error("User and Claim Type are required");
      return;
    }
    
    if (editingUserClaim) {
      updateUserClaim.mutate({ id: editingUserClaim.Id, data: userClaimForm });
    } else {
      createUserClaim.mutate(userClaimForm);
    }
  };

  const handleSaveRoleClaim = () => {
    if (!roleClaimForm.RoleId || !roleClaimForm.ClaimType) {
      toast.error("Role and Claim Type are required");
      return;
    }
    
    if (editingRoleClaim) {
      updateRoleClaim.mutate({ id: editingRoleClaim.Id, data: roleClaimForm });
    } else {
      createRoleClaim.mutate(roleClaimForm);
    }
  };

  const handleDeleteUserClaim = (claim: UserClaim) => {
    if (confirm(`Delete claim "${claim.ClaimType}" for user?`)) {
      deleteUserClaim.mutate(claim.Id);
    }
  };

  const handleDeleteRoleClaim = (claim: RoleClaim) => {
    if (confirm(`Delete claim "${claim.ClaimType}" for role "${claim.role_name}"?`)) {
      deleteRoleClaim.mutate(claim.Id);
    }
  };

  const filteredUserClaims = userClaims.filter(claim =>
    (claim.ClaimType?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (claim.ClaimValue?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (claim.user_name?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const filteredRoleClaims = roleClaims.filter(claim =>
    (claim.ClaimType?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (claim.ClaimValue?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (claim.role_name?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalUserClaims: userClaims.length,
    totalRoleClaims: roleClaims.length,
    uniqueClaimTypes: new Set([
      ...userClaims.map(c => c.ClaimType),
      ...roleClaims.map(c => c.ClaimType)
    ].filter(Boolean)).size,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Identity Claims</h1>
          <p className="text-muted-foreground">Manage user and role claims for authorization</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => {
            refetchUserClaims();
            refetchRoleClaims();
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalUserClaims}</div>
                <p className="text-xs text-muted-foreground">User Claims</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalRoleClaims}</div>
                <p className="text-xs text-muted-foreground">Role Claims</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <Tag className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.uniqueClaimTypes}</div>
                <p className="text-xs text-muted-foreground">Unique Claim Types</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Claims Management</CardTitle>
              <CardDescription>View and manage user and role claims</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search claims..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="user-claims" className="gap-2">
                  <User className="h-4 w-4" />
                  User Claims ({filteredUserClaims.length})
                </TabsTrigger>
                <TabsTrigger value="role-claims" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Role Claims ({filteredRoleClaims.length})
                </TabsTrigger>
              </TabsList>
              
              {can("create") && (
                <Button
                  onClick={() => {
                    if (activeTab === "user-claims") {
                      setEditingUserClaim(null);
                      resetUserClaimForm();
                      setShowUserClaimDialog(true);
                    } else {
                      setEditingRoleClaim(null);
                      resetRoleClaimForm();
                      setShowRoleClaimDialog(true);
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add {activeTab === "user-claims" ? "User" : "Role"} Claim
                </Button>
              )}
            </div>

            {/* User Claims Tab */}
            <TabsContent value="user-claims">
              {isLoadingUserClaims ? (
                <div className="flex items-center justify-center h-32">Loading user claims...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Claim Type</TableHead>
                      <TableHead>Claim Value</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUserClaims.map((claim) => (
                      <TableRow key={claim.Id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{claim.user_name || "Unknown"}</div>
                            <div className="text-xs text-muted-foreground">{claim.user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{claim.ClaimType}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{claim.ClaimValue}</TableCell>
                        <TableCell>{format(new Date(claim.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {can("edit") && (
                              <Button size="sm" variant="ghost" onClick={() => handleEditUserClaim(claim)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {can("delete") && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-destructive"
                                onClick={() => handleDeleteUserClaim(claim)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUserClaims.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No user claims found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Role Claims Tab */}
            <TabsContent value="role-claims">
              {isLoadingRoleClaims ? (
                <div className="flex items-center justify-center h-32">Loading role claims...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Claim Type</TableHead>
                      <TableHead>Claim Value</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoleClaims.map((claim) => (
                      <TableRow key={claim.Id}>
                        <TableCell>
                          <Badge>{claim.role_name}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{claim.ClaimType}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{claim.ClaimValue}</TableCell>
                        <TableCell>{format(new Date(claim.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {can("edit") && (
                              <Button size="sm" variant="ghost" onClick={() => handleEditRoleClaim(claim)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {can("delete") && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-destructive"
                                onClick={() => handleDeleteRoleClaim(claim)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredRoleClaims.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No role claims found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* User Claim Dialog */}
      <Dialog open={showUserClaimDialog} onOpenChange={setShowUserClaimDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUserClaim ? "Edit User Claim" : "Add User Claim"}</DialogTitle>
            <DialogDescription>
              {editingUserClaim 
                ? "Update the claim type and value" 
                : "Assign a new claim to a user"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>User *</Label>
              <Select 
                value={userClaimForm.UserId} 
                onValueChange={(value) => setUserClaimForm(prev => ({ ...prev, UserId: value }))}
                disabled={!!editingUserClaim}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.Id} value={user.Id}>
                      {user.full_name} ({user.user_code || user.Email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Claim Type *</Label>
              <Input
                placeholder="e.g., permission, department, access_level"
                value={userClaimForm.ClaimType}
                onChange={(e) => setUserClaimForm(prev => ({ ...prev, ClaimType: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Claim Value</Label>
              <Input
                placeholder="e.g., admin, finance, read-only"
                value={userClaimForm.ClaimValue}
                onChange={(e) => setUserClaimForm(prev => ({ ...prev, ClaimValue: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserClaimDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveUserClaim} disabled={createUserClaim.isPending || updateUserClaim.isPending}>
              {(createUserClaim.isPending || updateUserClaim.isPending) ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Claim Dialog */}
      <Dialog open={showRoleClaimDialog} onOpenChange={setShowRoleClaimDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRoleClaim ? "Edit Role Claim" : "Add Role Claim"}</DialogTitle>
            <DialogDescription>
              {editingRoleClaim 
                ? "Update the claim type and value" 
                : "Assign a new claim to a role"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select 
                value={roleClaimForm.RoleId} 
                onValueChange={(value) => setRoleClaimForm(prev => ({ ...prev, RoleId: value }))}
                disabled={!!editingRoleClaim}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.Id} value={role.Id}>
                      {role.Name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Claim Type *</Label>
              <Input
                placeholder="e.g., permission, access_level, feature"
                value={roleClaimForm.ClaimType}
                onChange={(e) => setRoleClaimForm(prev => ({ ...prev, ClaimType: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Claim Value</Label>
              <Input
                placeholder="e.g., manage_users, view_reports, full_access"
                value={roleClaimForm.ClaimValue}
                onChange={(e) => setRoleClaimForm(prev => ({ ...prev, ClaimValue: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleClaimDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveRoleClaim} disabled={createRoleClaim.isPending || updateRoleClaim.isPending}>
              {(createRoleClaim.isPending || updateRoleClaim.isPending) ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const IdentityClaims = () => {
  return (
    <PermissionWrapper moduleName={MODULE_NAME}>
      <IdentityClaimsContent />
    </PermissionWrapper>
  );
};

export default IdentityClaims;
