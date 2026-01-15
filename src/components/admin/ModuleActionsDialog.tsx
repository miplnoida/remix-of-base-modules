import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Check, X } from "lucide-react";
import type { AppModule, ModuleAction } from "@/hooks/useAdminData";
import {
  useCreateModuleAction,
  useUpdateModuleAction,
  useDeleteModuleAction,
} from "@/hooks/useAdminData";

interface ModuleActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: AppModule | null;
  canEdit: boolean;
  canDelete: boolean;
}

const defaultActions = [
  { action_name: "view", display_name: "View" },
  { action_name: "create", display_name: "Create" },
  { action_name: "edit", display_name: "Edit" },
  { action_name: "delete", display_name: "Delete" },
  { action_name: "approve", display_name: "Approve" },
  { action_name: "reject", display_name: "Reject" },
];

export function ModuleActionsDialog({
  open,
  onOpenChange,
  module,
  canEdit,
  canDelete,
}: ModuleActionsDialogProps) {
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [actionForm, setActionForm] = useState({
    action_name: "",
    display_name: "",
    description: "",
    is_enabled: true,
  });

  const createAction = useCreateModuleAction();
  const updateAction = useUpdateModuleAction();
  const deleteAction = useDeleteModuleAction();

  const actions = module?.actions || [];

  const resetForm = () => {
    setActionForm({
      action_name: "",
      display_name: "",
      description: "",
      is_enabled: true,
    });
    setShowAddForm(false);
    setEditingActionId(null);
  };

  const handleEditAction = (action: ModuleAction) => {
    setEditingActionId(action.id);
    setActionForm({
      action_name: action.action_name,
      display_name: action.display_name,
      description: action.description || "",
      is_enabled: action.is_enabled,
    });
    setShowAddForm(false);
  };

  const handleSaveAction = async () => {
    if (!module) return;

    if (editingActionId) {
      await updateAction.mutateAsync({ id: editingActionId, ...actionForm });
    } else {
      await createAction.mutateAsync({ module_id: module.id, ...actionForm });
    }
    resetForm();
  };

  const handleDeleteAction = async (id: string) => {
    await deleteAction.mutateAsync(id);
  };

  const handleQuickAdd = (action: typeof defaultActions[0]) => {
    setActionForm({
      ...actionForm,
      action_name: action.action_name,
      display_name: action.display_name,
    });
  };

  const existingActionNames = actions.map((a) => a.action_name);
  const availableQuickActions = defaultActions.filter(
    (a) => !existingActionNames.includes(a.action_name)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Manage Actions - {module?.display_name}
          </DialogTitle>
          <DialogDescription>
            Add, edit, or remove actions for this module. Actions define what
            users can do within this module.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Existing Actions Table */}
          {actions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Existing Actions</h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Action Name</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actions.map((action) => (
                      <TableRow key={action.id}>
                        {editingActionId === action.id ? (
                          <>
                            <TableCell>
                              <Input
                                value={actionForm.action_name}
                                onChange={(e) =>
                                  setActionForm({
                                    ...actionForm,
                                    action_name: e.target.value,
                                  })
                                }
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={actionForm.display_name}
                                onChange={(e) =>
                                  setActionForm({
                                    ...actionForm,
                                    display_name: e.target.value,
                                  })
                                }
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={actionForm.description}
                                onChange={(e) =>
                                  setActionForm({
                                    ...actionForm,
                                    description: e.target.value,
                                  })
                                }
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={actionForm.is_enabled}
                                onCheckedChange={(checked) =>
                                  setActionForm({
                                    ...actionForm,
                                    is_enabled: checked,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={handleSaveAction}
                                  disabled={
                                    !actionForm.action_name ||
                                    !actionForm.display_name ||
                                    updateAction.isPending
                                  }
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={resetForm}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-mono text-xs">
                              {action.action_name}
                            </TableCell>
                            <TableCell className="font-medium">
                              {action.display_name}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {action.description || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={action.is_enabled ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {action.is_enabled ? "Enabled" : "Disabled"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditAction(action)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )
                                }
                                {canDelete && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteAction(action.id)}
                                    disabled={deleteAction.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )
                                }
                              </div>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* No Actions Message */}
          {actions.length === 0 && !showAddForm && (
            <div className="text-center py-8 text-muted-foreground border rounded-md">
              No actions configured. Click "Add New Action" to create one.
            </div>
          )}

          {/* Add New Action Form */}
          {showAddForm && !editingActionId && (
            <div className="space-y-4 border rounded-md p-4 bg-muted/30">
              <h3 className="text-sm font-semibold">Add New Action</h3>

              {availableQuickActions.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Quick Add (click to fill form)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {availableQuickActions.map((action) => (
                      <Button
                        key={action.action_name}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAdd(action)}
                      >
                        {action.display_name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="action_name">Action Name *</Label>
                  <Input
                    id="action_name"
                    value={actionForm.action_name}
                    onChange={(e) =>
                      setActionForm({ ...actionForm, action_name: e.target.value })
                    }
                    placeholder="view"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name *</Label>
                  <Input
                    id="display_name"
                    value={actionForm.display_name}
                    onChange={(e) =>
                      setActionForm({ ...actionForm, display_name: e.target.value })
                    }
                    placeholder="View"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={actionForm.description}
                  onChange={(e) =>
                    setActionForm({ ...actionForm, description: e.target.value })
                  }
                  placeholder="Description of what this action allows"
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_enabled"
                    checked={actionForm.is_enabled}
                    onCheckedChange={(checked) =>
                      setActionForm({ ...actionForm, is_enabled: checked })
                    }
                  />
                  <Label htmlFor="is_enabled">Enabled</Label>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveAction}
                    disabled={
                      !actionForm.action_name ||
                      !actionForm.display_name ||
                      createAction.isPending
                    }
                  >
                    Add Action
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Add Button */}
          {!showAddForm && !editingActionId && canEdit && (
            <Button
              variant="outline"
              onClick={() => setShowAddForm(true)}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Action
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
