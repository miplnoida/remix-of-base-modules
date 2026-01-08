import { useState, useMemo, useCallback } from "react";
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
import { Network, Plus, AlertTriangle } from "lucide-react";
import { useDbRoles } from "@/hooks/useRolesData";
import { useRoleHierarchy, useUpsertRoleHierarchy, useDeleteRoleHierarchy } from "@/hooks/useRoleHierarchy";
import { toast } from "sonner";
import HierarchyTreeView, { HierarchyItem } from "@/components/hierarchy/HierarchyTreeView";
import RemoveConfirmDialog from "@/components/hierarchy/RemoveConfirmDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

const RoleHierarchy = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "addChild">("add");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [parentForChild, setParentForChild] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedParent, setSelectedParent] = useState<string>("none");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [nodeToRemove, setNodeToRemove] = useState<string | null>(null);

  const { data: roles = [], isLoading: loadingRoles, error: rolesError } = useDbRoles();
  const { data: hierarchy = [], isLoading: loadingHierarchy, error: hierarchyError } = useRoleHierarchy();
  const upsertHierarchy = useUpsertRoleHierarchy();
  const deleteHierarchy = useDeleteRoleHierarchy();

  const activeRoles = roles.filter(r => r.is_active);

  const getRoleName = useCallback((id: string) => {
    return roles.find(r => r.id === id)?.role_name || 'Unknown';
  }, [roles]);

  const isSystemRole = useCallback((id: string) => {
    return roles.find(r => r.id === id)?.is_system_role || false;
  }, [roles]);

  const isInHierarchy = useCallback((roleId: string) => {
    return hierarchy.some(h => h.role_id === roleId);
  }, [hierarchy]);

  // Check for circular reference
  const wouldCreateCircle = useCallback((roleId: string, newParentId: string | null): boolean => {
    if (!newParentId) return false;
    if (roleId === newParentId) return true;
    
    // Check if newParentId is a descendant of roleId
    const checkDescendants = (parentId: string): boolean => {
      const children = hierarchy.filter(h => h.parent_role_id === parentId);
      for (const child of children) {
        if (child.role_id === newParentId) return true;
        if (checkDescendants(child.role_id)) return true;
      }
      return false;
    };
    
    return checkDescendants(roleId);
  }, [hierarchy]);

  // Transform hierarchy data for tree view
  const treeItems: HierarchyItem[] = useMemo(() => {
    return hierarchy.map(h => ({
      id: h.id,
      itemId: h.role_id,
      parentId: h.parent_role_id,
      name: getRoleName(h.role_id),
      level: h.level,
      isSystemRole: isSystemRole(h.role_id),
    }));
  }, [hierarchy, getRoleName, isSystemRole]);

  const handleOpenDialog = (roleId?: string) => {
    if (roleId) {
      const existing = hierarchy.find(h => h.role_id === roleId);
      setDialogMode("edit");
      setEditingRoleId(roleId);
      setSelectedRole(roleId);
      setSelectedParent(existing?.parent_role_id || "none");
      setParentForChild(null);
    } else {
      setDialogMode("add");
      setEditingRoleId(null);
      setSelectedRole("");
      setSelectedParent("none");
      setParentForChild(null);
    }
    setShowDialog(true);
  };

  const handleAddChild = (parentId: string) => {
    setDialogMode("addChild");
    setParentForChild(parentId);
    setSelectedRole("");
    setSelectedParent(parentId);
    setEditingRoleId(null);
    setShowDialog(true);
  };

  const handleEdit = (roleId: string) => {
    handleOpenDialog(roleId);
  };

  const handleRemoveClick = (roleId: string) => {
    // Check if node has children
    const hasChildren = hierarchy.some(h => h.parent_role_id === roleId);
    if (hasChildren) {
      toast.error("Cannot remove a role that has children. Remove children first.");
      return;
    }
    setNodeToRemove(roleId);
    setRemoveDialogOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!nodeToRemove) return;
    try {
      await deleteHierarchy.mutateAsync(nodeToRemove);
      setRemoveDialogOpen(false);
      setNodeToRemove(null);
      setSelectedNodeId(null);
    } catch (error) {
      toast.error("Failed to remove role from hierarchy");
    }
  };

  const handleSave = async () => {
    if (!selectedRole) return;

    // Check for circular reference
    if (wouldCreateCircle(selectedRole, selectedParent === "none" ? null : selectedParent)) {
      toast.error("Cannot set parent: This would create a circular hierarchy");
      return;
    }

    // Calculate level based on parent
    let level = 0;
    if (selectedParent !== "none") {
      const parentEntry = hierarchy.find(h => h.role_id === selectedParent);
      level = (parentEntry?.level ?? 0) + 1;
    }

    try {
      await upsertHierarchy.mutateAsync({
        role_id: selectedRole,
        parent_role_id: selectedParent === "none" ? null : selectedParent,
        level,
      });

      setShowDialog(false);
      setEditingRoleId(null);
      setSelectedRole("");
      setSelectedParent("none");
      setParentForChild(null);
    } catch (error) {
      toast.error("Failed to save hierarchy changes");
    }
  };

  // Get unassigned roles
  const unassignedRoles = activeRoles.filter(r => !isInHierarchy(r.id));

  const isLoading = loadingRoles || loadingHierarchy;
  const hasError = rolesError || hierarchyError;

  if (hasError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load hierarchy data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
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

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Hierarchy Structure
            </CardTitle>
            <CardDescription>
              Visual representation of role relationships. Click a node to select, use buttons to edit, add children, or remove.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HierarchyTreeView
              items={treeItems}
              isLoading={isLoading}
              canEdit={true}
              onEdit={handleEdit}
              onAddChild={handleAddChild}
              onRemove={handleRemoveClick}
              selectedId={selectedNodeId}
              onSelect={setSelectedNodeId}
              emptyMessage="No hierarchy defined yet. Add roles to build the structure."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unassigned Roles</CardTitle>
            <CardDescription>Roles not in hierarchy</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : unassignedRoles.length === 0 ? (
              <p className="text-muted-foreground text-sm">All roles are in hierarchy</p>
            ) : (
              <div className="space-y-2">
                {unassignedRoles.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm truncate">{r.role_name}</span>
                      {r.is_system_role && (
                        <Badge variant="secondary" className="text-xs shrink-0">System</Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setDialogMode("add");
                      setSelectedRole(r.id);
                      setSelectedParent("none");
                      setEditingRoleId(null);
                      setParentForChild(null);
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

      {/* Selected Node Info */}
      {selectedNodeId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Selected Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <p className="font-semibold">{getRoleName(selectedNodeId)}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline">
                    Level {hierarchy.find(h => h.role_id === selectedNodeId)?.level ?? 0}
                  </Badge>
                  {isSystemRole(selectedNodeId) && (
                    <Badge variant="secondary">System Role</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "edit" ? "Edit Hierarchy" : dialogMode === "addChild" ? "Add Child Role" : "Add to Hierarchy"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "edit" 
                ? "Update the parent role" 
                : dialogMode === "addChild"
                ? `Add a child under ${getRoleName(parentForChild || "")}`
                : "Select a role and its parent"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select 
                value={selectedRole} 
                onValueChange={setSelectedRole}
                disabled={dialogMode === "edit"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {(dialogMode === "edit" 
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
              <Select 
                value={selectedParent} 
                onValueChange={setSelectedParent}
                disabled={dialogMode === "addChild"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent (or leave as top-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  {activeRoles
                    .filter(r => r.id !== selectedRole && isInHierarchy(r.id))
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
              {upsertHierarchy.isPending ? "Saving..." : dialogMode === "edit" ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RemoveConfirmDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        onConfirm={handleConfirmRemove}
        itemName={nodeToRemove ? getRoleName(nodeToRemove) : ""}
        itemType="role"
        isPending={deleteHierarchy.isPending}
      />
    </div>
  );
};

export default RoleHierarchy;
