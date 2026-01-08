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
import { useDesignations, useDesignationHierarchy, useUpsertDesignationHierarchy, useDeleteDesignationHierarchy } from "@/hooks/useDesignations";

const DesignationHierarchy = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingDesignationId, setEditingDesignationId] = useState<string | null>(null);
  const [selectedDesignation, setSelectedDesignation] = useState<string>("");
  const [selectedParent, setSelectedParent] = useState<string>("none");

  const { data: designations = [], isLoading: loadingDesignations } = useDesignations();
  const { data: hierarchy = [], isLoading: loadingHierarchy } = useDesignationHierarchy();
  const upsertHierarchy = useUpsertDesignationHierarchy();
  const deleteHierarchy = useDeleteDesignationHierarchy();

  const activeDesignations = designations.filter(d => d.is_active);

  // Build hierarchy tree
  const getChildren = (parentId: string | null): typeof hierarchy => {
    return hierarchy.filter(h => h.parent_designation_id === parentId);
  };

  const getRootItems = () => {
    return hierarchy.filter(h => h.parent_designation_id === null);
  };

  const getDesignationName = (id: string) => {
    return designations.find(d => d.id === id)?.name || 'Unknown';
  };

  const isInHierarchy = (designationId: string) => {
    return hierarchy.some(h => h.designation_id === designationId);
  };

  const handleOpenDialog = (designationId?: string) => {
    if (designationId) {
      const existing = hierarchy.find(h => h.designation_id === designationId);
      setEditingDesignationId(designationId);
      setSelectedDesignation(designationId);
      setSelectedParent(existing?.parent_designation_id || "none");
    } else {
      setEditingDesignationId(null);
      setSelectedDesignation("");
      setSelectedParent("none");
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!selectedDesignation) return;

    // Calculate level based on parent
    let level = 0;
    if (selectedParent !== "none") {
      const parentEntry = hierarchy.find(h => h.designation_id === selectedParent);
      level = (parentEntry?.level ?? 0) + 1;
    }

    await upsertHierarchy.mutateAsync({
      designation_id: selectedDesignation,
      parent_designation_id: selectedParent === "none" ? null : selectedParent,
      level,
    });

    setShowDialog(false);
    setEditingDesignationId(null);
    setSelectedDesignation("");
    setSelectedParent("none");
  };

  const handleRemove = async (designationId: string) => {
    await deleteHierarchy.mutateAsync(designationId);
  };

  const renderHierarchyItem = (item: typeof hierarchy[0], depth: number = 0) => {
    const children = getChildren(item.designation_id);
    
    return (
      <div key={item.id}>
        <div 
          className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg"
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <div className="flex items-center gap-2">
            {depth > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <span className="font-medium">{getDesignationName(item.designation_id)}</span>
            <Badge variant="outline" className="text-xs">Level {item.level}</Badge>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item.designation_id)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleRemove(item.designation_id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {children.map(child => renderHierarchyItem(child, depth + 1))}
      </div>
    );
  };

  // Get unassigned designations
  const unassignedDesignations = activeDesignations.filter(d => !isInHierarchy(d.id));

  if (loadingDesignations || loadingHierarchy) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Designation Hierarchy</h1>
          <p className="text-muted-foreground mt-1">Define parent-child relationships between designations</p>
        </div>
        <Button onClick={() => handleOpenDialog()} disabled={activeDesignations.length === 0}>
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
            <CardDescription>Visual representation of designation relationships</CardDescription>
          </CardHeader>
          <CardContent>
            {hierarchy.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hierarchy defined yet. Add designations to build the structure.
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
            <CardTitle>Unassigned Designations</CardTitle>
            <CardDescription>Designations not in hierarchy</CardDescription>
          </CardHeader>
          <CardContent>
            {unassignedDesignations.length === 0 ? (
              <p className="text-muted-foreground text-sm">All designations are in hierarchy</p>
            ) : (
              <div className="space-y-2">
                {unassignedDesignations.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm">{d.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSelectedDesignation(d.id);
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
            <DialogTitle>{editingDesignationId ? "Edit Hierarchy" : "Add to Hierarchy"}</DialogTitle>
            <DialogDescription>
              {editingDesignationId ? "Update the parent designation" : "Select a designation and its parent"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Designation *</Label>
              <Select 
                value={selectedDesignation} 
                onValueChange={setSelectedDesignation}
                disabled={!!editingDesignationId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  {(editingDesignationId 
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
              <Select value={selectedParent} onValueChange={setSelectedParent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent (or leave as top-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  {activeDesignations
                    .filter(d => d.id !== selectedDesignation)
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
              {editingDesignationId ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DesignationHierarchy;
