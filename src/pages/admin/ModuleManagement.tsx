import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { LayoutGrid, Plus, Search, Edit, Trash2, ChevronRight, ChevronDown, Settings } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useAppModules, useCreateAppModule, useUpdateAppModule, useDeleteAppModule } from "@/hooks/useAdminData";
import type { AppModule } from "@/hooks/useAdminData";
import { IconPicker } from "@/components/ui/icon-picker";
import { cn } from "@/lib/utils";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { useActionPermissions, MODULE_NAMES, ACTION_NAMES } from "@/hooks/useActionPermission";
import { BusinessObjectRootConfig } from "@/components/admin/BusinessObjectRootConfig";
import { ModuleActionsDialog } from "@/components/admin/ModuleActionsDialog";

// Helper to get Lucide icon by name
const getIcon = (iconName: string | null) => {
  if (!iconName) return LucideIcons.Circle;
  const Icon = (LucideIcons as any)[iconName];
  return Icon || LucideIcons.Circle;
};

// Tree node structure for n-level support
interface ModuleTreeNode extends AppModule {
  children: ModuleTreeNode[];
}

// Build recursive tree from flat module list
function buildModuleTree(modules: AppModule[]): ModuleTreeNode[] {
  const moduleMap = new Map<string, ModuleTreeNode>();
  const roots: ModuleTreeNode[] = [];

  // Create tree nodes for each module
  modules.forEach((m) => {
    moduleMap.set(m.id, { ...m, children: [] });
  });

  // Build parent-child relationships
  modules.forEach((m) => {
    const node = moduleMap.get(m.id)!;
    if (m.parent_id && moduleMap.has(m.parent_id)) {
      const parent = moduleMap.get(m.parent_id)!;
      parent.children.push(node);
    } else if (!m.parent_id) {
      roots.push(node);
    }
  });

  // Sort children by sort_order
  const sortChildren = (nodes: ModuleTreeNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    nodes.forEach((n) => sortChildren(n.children));
  };
  sortChildren(roots);

  return roots;
}

// Filter tree based on search query
function filterTree(nodes: ModuleTreeNode[], query: string): ModuleTreeNode[] {
  if (!query) return nodes;

  const lowerQuery = query.toLowerCase();

  const matchesSearch = (node: ModuleTreeNode): boolean => {
    return (
      node.display_name.toLowerCase().includes(lowerQuery) ||
      node.name.toLowerCase().includes(lowerQuery)
    );
  };

  const filterNode = (node: ModuleTreeNode): ModuleTreeNode | null => {
    const filteredChildren = node.children
      .map((child) => filterNode(child))
      .filter((n): n is ModuleTreeNode => n !== null);

    if (matchesSearch(node) || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
    return null;
  };

  return nodes
    .map((node) => filterNode(node))
    .filter((n): n is ModuleTreeNode => n !== null);
}

// Get all module IDs for expand all
function getAllModuleIds(nodes: ModuleTreeNode[]): string[] {
  const ids: string[] = [];
  const traverse = (node: ModuleTreeNode) => {
    ids.push(node.id);
    node.children.forEach(traverse);
  };
  nodes.forEach(traverse);
  return ids;
}

interface ModuleTreeItemProps {
  node: ModuleTreeNode;
  level: number;
  onEdit: (module: AppModule) => void;
  onDelete: (id: string) => void;
  onToggle: (module: AppModule) => void;
  onManageActions: (module: AppModule) => void;
  expandedModules: Set<string>;
  toggleExpand: (id: string) => void;
  can: (action: string) => boolean;
}

const ModuleTreeItem = ({
  node,
  level,
  onEdit,
  onDelete,
  onToggle,
  onManageActions,
  expandedModules,
  toggleExpand,
  can,
}: ModuleTreeItemProps) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedModules.has(node.id);
  const Icon = getIcon(node.icon);

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
            onClick={() => toggleExpand(node.id)}
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
            <span className="font-medium truncate">{node.display_name}</span>
            <span className="text-xs text-muted-foreground">({node.name})</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{node.route || "No route"}</span>
            <span>•</span>
            <span>Order: {node.sort_order}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={node.is_enabled ? "default" : "secondary"} className="text-xs">
            {node.is_enabled ? "Enabled" : "Disabled"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {node.actions?.length || 0} Actions
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {can(ACTION_NAMES.ENABLE_DISABLE) && (
            <Button size="sm" variant="ghost" onClick={() => onToggle(node)}>
              {node.is_enabled ? "Disable" : "Enable"}
            </Button>
          )}
          {can(ACTION_NAMES.EDIT) && (
            <Button size="sm" variant="ghost" onClick={() => onEdit(node)}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {can(ACTION_NAMES.ADD_ACTIONS) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onManageActions(node)}
              title="Manage Actions"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          {can(ACTION_NAMES.DELETE) && (
            <Button size="sm" variant="ghost" onClick={() => onDelete(node.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Recursively render children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <ModuleTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggle={onToggle}
              onManageActions={onManageActions}
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
  const [showActionsDialog, setShowActionsDialog] = useState(false);
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

  const { data: modules = [], isLoading } = useAppModules();
  const createModule = useCreateAppModule();
  const updateModule = useUpdateAppModule();
  const deleteModule = useDeleteAppModule();

  // Build n-level tree structure
  const { moduleTree, filteredTree, availableParentModules, allModuleIds } = useMemo(() => {
    const tree = buildModuleTree(modules);
    const filtered = filterTree(tree, searchQuery);

    // Only modules without routes can be parent modules (container/folder modules)
    const availableParents = modules
      .filter((m) => !m.route || m.route.trim() === "")
      .sort((a, b) => a.sort_order - b.sort_order);

    const allIds = getAllModuleIds(tree);

    return {
      moduleTree: tree,
      filteredTree: filtered,
      availableParentModules: availableParents,
      allModuleIds: allIds,
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

  const handleManageActions = (module: AppModule) => {
    setSelectedModule(module);
    setShowActionsDialog(true);
  };

  const handleToggleModule = async (module: AppModule) => {
    await updateModule.mutateAsync({ id: module.id, is_enabled: !module.is_enabled });
  };

  // Get display path for parent modules in dropdown
  const getModulePath = (moduleId: string): string => {
    const paths: string[] = [];
    let current = modules.find((m) => m.id === moduleId);
    while (current) {
      paths.unshift(current.display_name);
      current = modules.find((m) => m.id === current?.parent_id);
    }
    return paths.join(" → ");
  };

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
            <div className="text-2xl font-bold text-green-600">
              {modules.filter((m) => m.is_enabled).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Disabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
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
          <CardDescription>Configure modules that appear in the navigation menu (n-level tree view)</CardDescription>
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
          ) : filteredTree.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No modules found. Click "Add Module" to create one.
            </div>
          ) : (
            <div className="divide-y">
              {filteredTree.map((node) => (
                <ModuleTreeItem
                  key={node.id}
                  node={node}
                  level={0}
                  onEdit={handleOpenModuleDialog}
                  onDelete={(id) => deleteModule.mutate(id)}
                  onToggle={handleToggleModule}
                  onManageActions={handleManageActions}
                  expandedModules={expandedModules}
                  toggleExpand={toggleExpand}
                  can={can}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Module Dialog */}
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
                    <SelectContent className="bg-popover">
                      <SelectItem value="none">None (top level)</SelectItem>
                      {availableParentModules
                        .filter((m) => m.id !== selectedModule?.id)
                        .map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {getModulePath(m.id)}
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

      {/* Module Actions Dialog */}
      <ModuleActionsDialog
        open={showActionsDialog}
        onOpenChange={setShowActionsDialog}
        module={selectedModule}
        canEdit={can(ACTION_NAMES.EDIT)}
        canDelete={can(ACTION_NAMES.DELETE)}
      />
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
