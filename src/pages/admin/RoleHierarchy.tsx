import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Network, Plus, Edit, Trash2, ChevronRight } from "lucide-react";
import { useDbRoles } from "@/hooks/useRolesData";
import { useRoleHierarchy, useUpsertRoleHierarchy, useDeleteRoleHierarchy } from "@/hooks/useRoleHierarchy";

const RoleHierarchy = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedParent, setSelectedParent] = useState<string>("none");

  const { data: roles = [], isLoading: loadingRoles } = useDbRoles();
  const { data: hierarchy = [], isLoading: loadingHierarchy } = useRoleHierarchy();
  const upsertHierarchy = useUpsertRoleHierarchy();
  const deleteHierarchy = useDeleteRoleHierarchy();

  const activeRoles = roles.filter(r => r.is_active);

  // Build hierarchy tree
  const getChildren = (parentId: string | null): typeof hierarchy => {
    return hierarchy.filter(h => h.parent_role_id === parentId);
  };

  const getRootItems = () => {
    return hierarchy.filter(h => h.parent_role_id === null);
  };

  const getRoleName = (id: string) => {
    return roles.find(r => r.id === id)?.role_name || 'Unknown';
  };

  const isInHierarchy = (roleId: string) => {
    return hierarchy.some(h => h.role_id === roleId);
  };

  const handleOpenDialog = (roleId?: string) => {
    if (roleId) {
      const existing = hierarchy.find(h => h.role_id === roleId);
      setEditingRoleId(roleId);
      setSelectedRole(roleId);
      setSelectedParent(existing?.parent_role_id || "none");
    } else {
      setEditingRoleId(null);
      setSelectedRole("");
      setSelectedParent("none");
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!selectedRole) return;

    // Calculate level based on parent
    let level = 0;
    if (selectedParent !== "none") {
      const parentEntry = hierarchy.find(h => h.role_id === selectedParent);
      level = (parentEntry?.level ?? 0) + 1;
    }

    await upsertHierarchy.mutateAsync({
      role_id: selectedRole,
      parent_role_id: selectedParent === "none" ? null : selectedParent,
      level,
    });

    setShowDialog(false);
    setEditingRoleId(null);
    setSelectedRole("");
    setSelectedParent("none");
  };

  const handleRemove = async (roleId: string) => {
    await deleteHierarchy.mutateAsync(roleId);
  };

  const renderHierarchyItem = (item: typeof hierarchy[0], depth: number = 0) => {
    const children = getChildren(item.role_id);
    const role = roles.find(r => r.id === item.role_id);
    
    return (
      <div key={item.id}>
        <div 
          className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg"
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <div className="flex items-center gap-2">
            {depth > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <span className="font-medium">{getRoleName(item.role_id)}</span>
            <Badge variant="outline" className="text-xs">Level {item.level}</Badge>
            {role?.is_system_role && <Badge variant="secondary" className="text-xs">System</Badge>}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item.role_id)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleRemove(item.role_id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {children.map(child => renderHierarchyItem(child, depth + 1))}
      </div>
    );
  };

  // Get unassigned roles
  const unassignedRoles = activeRoles.filter(r => !isInHierarchy(r.id));

  if (loadingRoles || loadingHierarchy) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Role Hierarchy</h1>
          <p className="text-muted-foreground mt-1">Define parent-child relationships between roles</p>
        </div>
        <Button onClick={() => handleOpenDialog()} disabled={activeRoles.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Add to Hierarchy
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Hierarchy Structure
            </CardTitle>
            <CardDescription>Visual representation of role relationships</CardDescription>
          </CardHeader>
          <CardContent>
            {hierarchy.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hierarchy defined yet. Add roles to build the structure.
              </p>
            ) : (
              <div className="space-y-1">
                {getRootItems().map(item => renderHierarchyItem(item))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unassigned Roles</CardTitle>
            <CardDescription>Roles not in hierarchy</CardDescription>
          </CardHeader>
          <CardContent>
            {unassignedRoles.length === 0 ? (
              <p className="text-muted-foreground text-sm">All roles are in hierarchy</p>
            ) : (
              <div className="space-y-2">
                {unassignedRoles.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm">{r.role_name}</span>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSelectedRole(r.id);
                      setSelectedParent("none");
                      setShowDialog(true);
                    }}>
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoleId ? "Edit Hierarchy" : "Add to Hierarchy"}</DialogTitle>
            <DialogDescription>
              {editingRoleId ? "Update the parent role" : "Select a role and its parent"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select 
                value={selectedRole} 
                onValueChange={setSelectedRole}
                disabled={!!editingRoleId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {(editingRoleId 
                    ? activeRoles 
                    : activeRoles.filter(r => !isInHierarchy(r.id))
                  ).map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.role_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Parent Role</Label>
              <Select value={selectedParent} onValueChange={setSelectedParent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent (or leave as top-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  {activeRoles
                    .filter(r => r.id !== selectedRole)
                    .map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.role_name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={!selectedRole || upsertHierarchy.isPending}
            >
              {editingRoleId ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoleHierarchy;
