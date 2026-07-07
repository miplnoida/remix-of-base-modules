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
import { useDesignations, useDesignationHierarchy, useUpsertDesignationHierarchy, useDeleteDesignationHierarchy } from "@/hooks/useDesignations";
import { toast } from "sonner";
import HierarchyTreeView, { HierarchyItem } from "@/components/hierarchy/HierarchyTreeView";
import RemoveConfirmDialog from "@/components/hierarchy/RemoveConfirmDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DesignationHierarchy = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "addChild">("add");
  const [editingDesignationId, setEditingDesignationId] = useState<string | null>(null);
  const [parentForChild, setParentForChild] = useState<string | null>(null);
  const [selectedDesignation, setSelectedDesignation] = useState<string>("");
  const [selectedParent, setSelectedParent] = useState<string>("none");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [nodeToRemove, setNodeToRemove] = useState<string | null>(null);

  const { data: designations = [], isLoading: loadingDesignations, error: designationsError } = useDesignations();
  const { data: hierarchy = [], isLoading: loadingHierarchy, error: hierarchyError } = useDesignationHierarchy();
  const upsertHierarchy = useUpsertDesignationHierarchy();
  const deleteHierarchy = useDeleteDesignationHierarchy();

  const activeDesignations = designations.filter(d => d.is_active);

  const getDesignationName = useCallback((id: string) => {
    return designations.find(d => d.id === id)?.name || 'Unknown';
  }, [designations]);

  const isInHierarchy = useCallback((designationId: string) => {
    return hierarchy.some(h => h.designation_id === designationId);
  }, [hierarchy]);

  // Check for circular reference
  const wouldCreateCircle = useCallback((designationId: string, newParentId: string | null): boolean => {
    if (!newParentId) return false;
    if (designationId === newParentId) return true;
    
    // Check if newParentId is a descendant of designationId
    const checkDescendants = (parentId: string): boolean => {
      const children = hierarchy.filter(h => h.parent_designation_id === parentId);
      for (const child of children) {
        if (child.designation_id === newParentId) return true;
        if (checkDescendants(child.designation_id)) return true;
      }
      return false;
    };
    
    return checkDescendants(designationId);
  }, [hierarchy]);

  // Transform hierarchy data for tree view
  const treeItems: HierarchyItem[] = useMemo(() => {
    return hierarchy.map(h => ({
      id: h.id,
      itemId: h.designation_id,
      parentId: h.parent_designation_id,
      name: getDesignationName(h.designation_id),
      level: h.level,
    }));
  }, [hierarchy, getDesignationName]);

  const handleOpenDialog = (designationId?: string) => {
    if (designationId) {
      const existing = hierarchy.find(h => h.designation_id === designationId);
      setDialogMode("edit");
      setEditingDesignationId(designationId);
      setSelectedDesignation(designationId);
      setSelectedParent(existing?.parent_designation_id || "none");
      setParentForChild(null);
    } else {
      setDialogMode("add");
      setEditingDesignationId(null);
      setSelectedDesignation("");
      setSelectedParent("none");
      setParentForChild(null);
    }
    setShowDialog(true);
  };

  const handleAddChild = (parentId: string) => {
    setDialogMode("addChild");
    setParentForChild(parentId);
    setSelectedDesignation("");
    setSelectedParent(parentId);
    setEditingDesignationId(null);
    setShowDialog(true);
  };

  const handleEdit = (designationId: string) => {
    handleOpenDialog(designationId);
  };

  const handleRemoveClick = (designationId: string) => {
    // Check if node has children
    const hasChildren = hierarchy.some(h => h.parent_designation_id === designationId);
    if (hasChildren) {
      toast.error("Cannot remove a designation that has children. Remove children first.");
      return;
    }
    setNodeToRemove(designationId);
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
      toast.error("Failed to remove designation from hierarchy");
    }
  };

  const handleSave = async () => {
    if (!selectedDesignation) return;

    // Check for circular reference
    if (wouldCreateCircle(selectedDesignation, selectedParent === "none" ? null : selectedParent)) {
      toast.error("Cannot set parent: This would create a circular hierarchy");
      return;
    }

    // Calculate level based on parent
    let level = 0;
    if (selectedParent !== "none") {
      const parentEntry = hierarchy.find(h => h.designation_id === selectedParent);
      level = (parentEntry?.level ?? 0) + 1;
    }

    try {
      await upsertHierarchy.mutateAsync({
        designation_id: selectedDesignation,
        parent_designation_id: selectedParent === "none" ? null : selectedParent,
        level,
      });

      setShowDialog(false);
      setEditingDesignationId(null);
      setSelectedDesignation("");
      setSelectedParent("none");
      setParentForChild(null);
    } catch (error) {
      toast.error("Failed to save hierarchy changes");
    }
  };

  // Get unassigned designations
  const unassignedDesignations = activeDesignations.filter(d => !isInHierarchy(d.id));

  const isLoading = loadingDesignations || loadingHierarchy;
  const hasError = designationsError || hierarchyError;

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
          <h1 className="text-3xl font-bold text-foreground">Designation &amp; Approval Hierarchy</h1>
          <p className="text-muted-foreground mt-1">
            Define designation relationships used for approvals, escalation, and reporting lines. Removing an entry removes the relationship only — the designation itself is preserved.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} disabled={activeDesignations.length === 0}>
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
              Visual representation of designation relationships. Click a node to select, use buttons to edit, add children, or remove.
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
              emptyMessage="No hierarchy defined yet. Add designations to build the structure."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unassigned Designations</CardTitle>
            <CardDescription>Designations not in hierarchy</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : unassignedDesignations.length === 0 ? (
              <p className="text-muted-foreground text-sm">All designations are in hierarchy</p>
            ) : (
              <div className="space-y-2">
                {unassignedDesignations.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm truncate flex-1">{d.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setDialogMode("add");
                      setSelectedDesignation(d.id);
                      setSelectedParent("none");
                      setEditingDesignationId(null);
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
            <CardTitle className="text-lg">Selected Designation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <p className="font-semibold">{getDesignationName(selectedNodeId)}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline">
                    Level {hierarchy.find(h => h.designation_id === selectedNodeId)?.level ?? 0}
                  </Badge>
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
              {dialogMode === "edit" ? "Edit Hierarchy" : dialogMode === "addChild" ? "Add Child Designation" : "Add to Hierarchy"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "edit" 
                ? "Update the parent designation" 
                : dialogMode === "addChild"
                ? `Add a child under ${getDesignationName(parentForChild || "")}`
                : "Select a designation and its parent"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Designation *</Label>
              <Select 
                value={selectedDesignation} 
                onValueChange={setSelectedDesignation}
                disabled={dialogMode === "edit"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  {(dialogMode === "edit" 
                    ? activeDesignations 
                    : activeDesignations.filter(d => !isInHierarchy(d.id))
                  ).map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Parent Designation</Label>
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
                  {activeDesignations
                    .filter(d => d.id !== selectedDesignation && isInHierarchy(d.id))
                    .map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={!selectedDesignation || upsertHierarchy.isPending}
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
        itemName={nodeToRemove ? getDesignationName(nodeToRemove) : ""}
        itemType="designation"
        isPending={deleteHierarchy.isPending}
      />
    </div>
  );
};

export default DesignationHierarchy;
