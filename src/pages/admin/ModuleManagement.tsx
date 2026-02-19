import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LayoutGrid, Plus, Search, Edit, Trash2, ChevronRight, ChevronDown, GripVertical } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useAppModules, useCreateAppModule, useUpdateAppModule, useDeleteAppModule, useCreateModuleAction, useDeleteModuleAction } from "@/hooks/useAdminData";
import type { AppModule, ModuleAction } from "@/hooks/useAdminData";
import { IconPicker } from "@/components/ui/icon-picker";
import { cn } from "@/lib/utils";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { useActionPermissions, MODULE_NAMES, ACTION_NAMES } from "@/hooks/useActionPermission";
import { BusinessObjectRootConfig } from "@/components/admin/BusinessObjectRootConfig";

// Helper to get Lucide icon by name
const getIcon = (iconName: string | null) => {
  if (!iconName) return LucideIcons.Circle;
  const Icon = (LucideIcons as any)[iconName];
  return Icon || LucideIcons.Circle;
};

interface ModuleTreeItemProps {
  module: AppModule;
  allModules: AppModule[];
  childModulesMap: Map<string, AppModule[]>;
  level: number;
  onEdit: (module: AppModule) => void;
  onDelete: (id: string) => void;
  onToggle: (module: AppModule) => void;
  onAddAction: (module: AppModule) => void;
  onDeleteAction: (id: string) => void;
  expandedModules: Set<string>;
  toggleExpand: (id: string) => void;
  can: (action: string) => boolean;
}


const ModuleTreeItem = ({
  module,
  allModules,
  childModulesMap,
  level,
  onEdit,
  onDelete,
  onToggle,
  onAddAction,
  onDeleteAction,
  expandedModules,
  toggleExpand,
  can,
}: ModuleTreeItemProps) => {
  const children = childModulesMap.get(module.id) || [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedModules.has(module.id);
  const Icon = getIcon(module.icon);

  return (
    <div className="border-b last:border-b-0">
      <div
        className={cn(
          "flex items-center gap-2 py-3 px-4 hover:bg-muted/50 transition-colors"
        )}
        style={{ paddingLeft: level * 24 + 16 }}
      >
        {hasChildren ? (
          <button
            onClick={() => toggleExpand(module.id)}
            className="p-1 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}
        
        <Icon className="h-5 w-5 text-primary flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{module.display_name}</span>
            <span className="text-xs text-muted-foreground">({module.name})</span>
            {level > 0 && (
              <Badge variant="outline" className="text-xs py-0 px-1">
                L{level + 1}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{module.route || "No route (container)"}</span>
            <span>•</span>
            <span>Order: {module.sort_order}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={module.is_enabled ? "default" : "secondary"} className="text-xs">
            {module.is_enabled ? "Enabled" : "Disabled"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {module.actions?.length || 0} Actions
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {can(ACTION_NAMES.ENABLE_DISABLE) && (
            <Button size="sm" variant="ghost" onClick={() => onToggle(module)}>
              {module.is_enabled ? "Disable" : "Enable"}
            </Button>
          )}
          {can(ACTION_NAMES.EDIT) && (
            <Button size="sm" variant="ghost" onClick={() => onEdit(module)}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {can(ACTION_NAMES.ADD_ACTIONS) && (
            <Button size="sm" variant="ghost" onClick={() => onAddAction(module)}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
          {can(ACTION_NAMES.DELETE) && (
            <Button size="sm" variant="ghost" onClick={() => onDelete(module.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Actions */}
      {isExpanded && module.actions && module.actions.length > 0 && (
        <div className="bg-muted/30 border-t" style={{ paddingLeft: (level + 1) * 24 + 40 }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Action</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {module.actions.map((action) => (
                <TableRow key={action.id}>
                  <TableCell className="font-mono text-xs">{action.action_name}</TableCell>
                  <TableCell className="font-medium">{action.display_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{action.description || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={action.is_enabled ? "default" : "secondary"} className="text-xs">
                      {action.is_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {can(ACTION_NAMES.DELETE) && (
                      <Button variant="ghost" size="icon" onClick={() => onDeleteAction(action.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Children — rendered recursively at any depth */}
      {isExpanded && hasChildren && (
        <div>
          {children.map((child) => (
            <ModuleTreeItem
              key={child.id}
              module={child}
              allModules={allModules}
              childModulesMap={childModulesMap}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggle={onToggle}
              onAddAction={onAddAction}
              onDeleteAction={onDeleteAction}
              expandedModules={expandedModules}
              toggleExpand={toggleExpand}
              can={can}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ModuleManagementContent = () => {
  const { can } = useActionPermissions(MODULE_NAMES.MODULE_MANAGEMENT);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedModule, setSelectedModule] = useState<AppModule | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [moduleForm, setModuleForm] = useState({
    name: "",
    display_name: "",
    description: "",
    icon: "",
    route: "",
    parent_id: null as string | null,
    sort_order: 0,
    is_enabled: true,
    primary_table: "",
    primary_key_column: "id",
    business_key_column: "",
  });
  const [actionForm, setActionForm] = useState({
    action_name: "",
    display_name: "",
    description: "",
    is_enabled: true,
  });

  const { data: modules = [], isLoading } = useAppModules();
  const createModule = useCreateAppModule();
  const updateModule = useUpdateAppModule();
  const deleteModule = useDeleteAppModule();
  const createAction = useCreateModuleAction();
  const deleteAction = useDeleteModuleAction();

  // Build tree structure — supports unlimited depth
  const { parentModules, childModulesMap, filteredParentModules, allModuleIds } = useMemo(() => {
    const parents = modules
      .filter((m) => !m.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order);

    // Map every module id -> its direct children (covers ALL levels)
    const childMap = new Map<string, AppModule[]>();
    modules.forEach((m) => {
      if (m.parent_id) {
        const existing = childMap.get(m.parent_id) || [];
        existing.push(m);
        childMap.set(m.parent_id, existing.sort((a, b) => a.sort_order - b.sort_order));
      }
    });

    // Recursively check if a module or any descendant matches the query
    const matchesQuery = (module: AppModule, query: string): boolean => {
      const q = query.toLowerCase();
      if (!q) return true;
      if (
        module.display_name.toLowerCase().includes(q) ||
        module.name.toLowerCase().includes(q)
      ) return true;
      return (childMap.get(module.id) || []).some((child) => matchesQuery(child, query));
    };

    const filtered = parents.filter((m) => matchesQuery(m, searchQuery));

    return {
      parentModules: parents,
      childModulesMap: childMap,
      filteredParentModules: filtered,
      allModuleIds: modules.map((m) => m.id),
    };
  }, [modules, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedModules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleOpenModuleDialog = (module?: AppModule) => {
    if (module) {
      setSelectedModule(module);
      setModuleForm({
        name: module.name,
        display_name: module.display_name,
        description: module.description || "",
        icon: module.icon || "",
        route: module.route || "",
        parent_id: module.parent_id,
        sort_order: module.sort_order,
        is_enabled: module.is_enabled,
        primary_table: (module as any).primary_table || "",
        primary_key_column: (module as any).primary_key_column || "id",
        business_key_column: (module as any).business_key_column || "",
      });
    } else {
      setSelectedModule(null);
      setModuleForm({
        name: "",
        display_name: "",
        description: "",
        icon: "",
        route: "",
        parent_id: null,
        sort_order: modules.length,
        is_enabled: true,
        primary_table: "",
        primary_key_column: "id",
        business_key_column: "",
      });
    }
    setShowModuleDialog(true);
  };

  const handleSaveModule = async () => {
    if (selectedModule) {
      await updateModule.mutateAsync({ id: selectedModule.id, ...moduleForm });
    } else {
      await createModule.mutateAsync(moduleForm);
    }
    setShowModuleDialog(false);
  };

  const handleOpenActionDialog = (module: AppModule) => {
    setSelectedModule(module);
    setActionForm({ action_name: "", display_name: "", description: "", is_enabled: true });
    setShowActionDialog(true);
  };

  const handleSaveAction = async () => {
    if (selectedModule) {
      await createAction.mutateAsync({ module_id: selectedModule.id, ...actionForm });
      // Clear the form for next entry but keep dialog open
      setActionForm({ action_name: "", display_name: "", description: "", is_enabled: true });
    }
  };

  const handleToggleModule = async (module: AppModule) => {
    await updateModule.mutateAsync({ id: module.id, is_enabled: !module.is_enabled });
  };

  const getDefaultActions = () => [
    { action_name: "view", display_name: "View" },
    { action_name: "create", display_name: "Create" },
    { action_name: "edit", display_name: "Edit" },
    { action_name: "delete", display_name: "Delete" },
    { action_name: "approve", display_name: "Approve" },
    { action_name: "reject", display_name: "Reject" },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Module Management</h1>
          <p className="text-muted-foreground mt-1">Manage application modules and their actions</p>
        </div>
        <Button onClick={() => handleOpenModuleDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Module
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Total Modules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{modules.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Enabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {modules.filter((m) => m.is_enabled).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Disabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {modules.filter((m) => !m.is_enabled).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {modules.reduce((sum, m) => sum + (m.actions?.length || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Modules</CardTitle>
          <CardDescription>Configure modules that appear in the navigation menu (tree view)</CardDescription>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (expandedModules.size > 0) {
                  setExpandedModules(new Set());
                } else {
                  // Expand every module that has children at any level
                  setExpandedModules(new Set(allModuleIds));
                }
              }}
            >
              {expandedModules.size > 0 ? "Collapse All" : "Expand All"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredParentModules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No modules found. Click "Add Module" to create one.
            </div>
          ) : (
            <div className="divide-y">
              {filteredParentModules.map((module) => (
                <ModuleTreeItem
                  key={module.id}
                  module={module}
                  allModules={modules}
                  childModulesMap={childModulesMap}
                  level={0}
                  onEdit={handleOpenModuleDialog}
                  onDelete={(id) => deleteModule.mutate(id)}
                  onToggle={handleToggleModule}
                  onAddAction={handleOpenActionDialog}
                  onDeleteAction={(id) => deleteAction.mutate(id)}
                  expandedModules={expandedModules}
                  toggleExpand={toggleExpand}
                  can={can}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Module Dialog - Improved Design */}
      <Dialog open={showModuleDialog} onOpenChange={setShowModuleDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              {selectedModule ? "Edit Module" : "Create New Module"}
            </DialogTitle>
            <DialogDescription>
              {selectedModule ? "Update module configuration and settings" : "Configure a new application module"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground border-b pb-2">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm">System Name *</Label>
                  <Input
                    id="name"
                    value={moduleForm.name}
                    onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })}
                    placeholder="user_management"
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">Unique identifier (no spaces)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_name" className="text-sm">Display Name *</Label>
                  <Input
                    id="display_name"
                    value={moduleForm.display_name}
                    onChange={(e) => setModuleForm({ ...moduleForm, display_name: e.target.value })}
                    placeholder="User Management"
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">Shown in navigation menu</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm">Description</Label>
                <Textarea
                  id="description"
                  value={moduleForm.description}
                  onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                  placeholder="Brief description of the module's purpose"
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Navigation & Display Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground border-b pb-2">Navigation & Display</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icon" className="text-sm">Icon</Label>
                  <IconPicker
                    value={moduleForm.icon}
                    onChange={(icon) => setModuleForm({ ...moduleForm, icon })}
                    placeholder="Select icon..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route" className="text-sm">Route</Label>
                  <Input
                    id="route"
                    value={moduleForm.route}
                    onChange={(e) => setModuleForm({ ...moduleForm, route: e.target.value })}
                    placeholder="/admin/users"
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">URL path for this module</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="parent" className="text-sm">Parent Module</Label>
                  <Select
                    value={moduleForm.parent_id || "none"}
                    onValueChange={(v) => setModuleForm({ ...moduleForm, parent_id: v === "none" ? null : v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="None (top level)" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover max-h-64 overflow-y-auto">
                      <SelectItem value="none">None (top level)</SelectItem>
                      {modules
                        .filter((m) => {
                          // Cannot select self or own descendants as parent
                          if (m.id === selectedModule?.id) return false;
                          // Must be enabled
                          if (!m.is_enabled) return false;
                          // Cannot select a descendant of the current module (prevents circular refs)
                          const isDescendant = (parentId: string): boolean => {
                            const children = childModulesMap.get(parentId) || [];
                            return children.some(
                              (c) => c.id === m.id || isDescendant(c.id)
                            );
                          };
                          if (selectedModule && isDescendant(selectedModule.id)) return false;
                          return true;
                        })
                        .sort((a, b) => a.display_name.localeCompare(b.display_name))
                        .map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.display_name}
                            {m.route ? ` (${m.route})` : " [container]"}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sort_order" className="text-sm">Sort Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={moduleForm.sort_order}
                    onChange={(e) => setModuleForm({ ...moduleForm, sort_order: parseInt(e.target.value) || 0 })}
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
                </div>
              </div>
              <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                <div>
                  <Label htmlFor="is_enabled" className="text-sm font-medium">Module Enabled</Label>
                  <p className="text-xs text-muted-foreground">Toggle to enable/disable this module</p>
                </div>
                <Switch
                  id="is_enabled"
                  checked={moduleForm.is_enabled}
                  onCheckedChange={(checked) => setModuleForm({ ...moduleForm, is_enabled: checked })}
                />
              </div>
            </div>

            {/* Business Object Root Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground border-b pb-2">Business Object Root (for Workflow Integration)</h3>
              <BusinessObjectRootConfig
                primaryTable={moduleForm.primary_table}
                primaryKeyColumn={moduleForm.primary_key_column}
                businessKeyColumn={moduleForm.business_key_column}
                onPrimaryTableChange={(value) =>
                  setModuleForm((prev) => ({ ...prev, primary_table: value }))
                }
                onPrimaryKeyColumnChange={(value) =>
                  setModuleForm((prev) => ({ ...prev, primary_key_column: value }))
                }
                onBusinessKeyColumnChange={(value) =>
                  setModuleForm((prev) => ({ ...prev, business_key_column: value }))
                }
                showTitle={false}
              />
            </div>
          </div>
          
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowModuleDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSaveModule}
              disabled={!moduleForm.name || !moduleForm.display_name || createModule.isPending || updateModule.isPending}
            >
              {selectedModule ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog - Enhanced with existing actions list */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Manage Actions
            </DialogTitle>
            <DialogDescription>
              View existing actions and add new ones to {selectedModule?.display_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Existing Actions Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b pb-2">
                Existing Actions ({selectedModule?.actions?.length || 0})
              </h3>
              {selectedModule?.actions && selectedModule.actions.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Action Name</TableHead>
                        <TableHead>Display Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                        <TableHead className="w-16 text-right">Remove</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedModule.actions.map((action) => (
                        <TableRow key={action.id}>
                          <TableCell className="font-mono text-xs">{action.action_name}</TableCell>
                          <TableCell className="font-medium">{action.display_name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{action.description || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={action.is_enabled ? "default" : "secondary"} className="text-xs">
                              {action.is_enabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {can(ACTION_NAMES.DELETE) && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => deleteAction.mutate(action.id)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm bg-muted/30 rounded-md">
                  No actions defined yet. Add your first action below.
                </div>
              )}
            </div>

            {/* Add New Action Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground border-b pb-2">Add New Action</h3>
              
              {/* Quick Add Buttons - Filter out existing actions */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Quick Add (click to populate form)</Label>
                <div className="flex flex-wrap gap-2">
                  {getDefaultActions()
                    .filter((action) => 
                      !selectedModule?.actions?.some(
                        (existing) => existing.action_name.toLowerCase() === action.action_name.toLowerCase()
                      )
                    )
                    .map((action) => (
                      <Button
                        key={action.action_name}
                        variant="outline"
                        size="sm"
                        onClick={() => setActionForm({ ...actionForm, ...action })}
                        className="text-xs"
                      >
                        + {action.display_name}
                      </Button>
                    ))}
                  {getDefaultActions().every((action) => 
                    selectedModule?.actions?.some(
                      (existing) => existing.action_name.toLowerCase() === action.action_name.toLowerCase()
                    )
                  ) && (
                    <span className="text-xs text-muted-foreground italic">
                      All default actions already added
                    </span>
                  )}
                </div>
              </div>

              {/* Custom Action Form */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="action_name" className="text-sm">Action Name *</Label>
                  <Input
                    id="action_name"
                    value={actionForm.action_name}
                    onChange={(e) => setActionForm({ ...actionForm, action_name: e.target.value })}
                    placeholder="view"
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">Unique identifier (lowercase)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="action_display" className="text-sm">Display Name *</Label>
                  <Input
                    id="action_display"
                    value={actionForm.display_name}
                    onChange={(e) => setActionForm({ ...actionForm, display_name: e.target.value })}
                    placeholder="View"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="action_desc" className="text-sm">Description</Label>
                <Textarea
                  id="action_desc"
                  value={actionForm.description}
                  onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                  placeholder="Brief description of what this action allows"
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                <div>
                  <Label htmlFor="action_enabled" className="text-sm font-medium">Action Enabled</Label>
                  <p className="text-xs text-muted-foreground">Toggle to enable/disable this action</p>
                </div>
                <Switch
                  id="action_enabled"
                  checked={actionForm.is_enabled}
                  onCheckedChange={(checked) => setActionForm({ ...actionForm, is_enabled: checked })}
                />
              </div>

              {/* Duplicate Warning */}
              {actionForm.action_name && selectedModule?.actions?.some(
                (existing) => existing.action_name.toLowerCase() === actionForm.action_name.toLowerCase()
              ) && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                  <span className="font-semibold">⚠️ Duplicate:</span> 
                  An action with name "{actionForm.action_name}" already exists for this module.
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>Close</Button>
            <Button
              onClick={handleSaveAction}
              disabled={
                !actionForm.action_name || 
                !actionForm.display_name || 
                createAction.isPending ||
                selectedModule?.actions?.some(
                  (existing) => existing.action_name.toLowerCase() === actionForm.action_name.toLowerCase()
                )
              }
            >
              {createAction.isPending ? "Adding..." : "Add Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ModuleManagement = () => {
  return (
    <PermissionWrapper moduleName={MODULE_NAMES.MODULE_MANAGEMENT}>
      <ModuleManagementContent />
    </PermissionWrapper>
  );
};

export default ModuleManagement;
